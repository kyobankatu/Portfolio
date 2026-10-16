import importlib.util
import copy
import json
import os
import tempfile
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location(
    "auto_deploy", Path(__file__).resolve().parents[2] / "scripts/auto_deploy.py"
)
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class DeploymentTests(unittest.TestCase):
    @unittest.skipUnless(os.name == "posix", "Linux flock is used on cp-1")
    def test_lock_prevents_overlapping_deployments_and_releases_after_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            lock = Path(directory) / "lock"
            with self.assertRaises(RuntimeError):
                with deploy.deployment_lock(lock) as first:
                    self.assertTrue(first)
                    with deploy.deployment_lock(lock) as second:
                        self.assertFalse(second)
                    raise RuntimeError("crashed")
            with deploy.deployment_lock(lock) as next_attempt:
                self.assertTrue(next_attempt)

    def setUp(self):
        self.sha = "a" * 40
        self.run = {"head_sha": self.sha, "head_branch": "master", "event": "push",
                    "status": "completed", "conclusion": "success",
                    "head_repository": {"full_name": deploy.REPOSITORY}}
        self.current = {"metadata": {"resourceVersion": "12"}, "spec": {"template": {
            "spec": {"containers": [{"name": "portfolio", "image": "old"}]}}}}
        self.commands = []

    def execute(self, runs=None, next_head=None, dry_run=False, fail=None):
        responses = iter([{"sha": self.sha}, {"workflow_runs": runs if runs is not None else [self.run]},
                          {"sha": next_head or self.sha}])

        def command(args):
            self.commands.append(args)
            if fail and fail in args:
                raise RuntimeError("simulated kubectl failure")
            return copy.deepcopy(self.current) if "get" in args else {}

        return deploy.run_once(lambda path: next(responses), command, dry_run=dry_run)

    def test_dry_run_reads_but_never_modifies_cluster(self):
        self.assertEqual(self.execute(dry_run=True), "dry-run")
        self.assertEqual(len(self.commands), 1)

    def test_untrusted_or_unsuccessful_runs_do_not_touch_cluster(self):
        mutations = [
            {"head_sha": "b" * 40}, {"head_branch": "feature"},
            {"event": "pull_request"}, {"status": "in_progress"},
            {"conclusion": "failure"},
            {"head_repository": {"full_name": "someone/Portfolio"}},
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                run = dict(self.run, **mutation)
                self.assertEqual(self.execute(runs=[run]), "no-successful-ci")
                self.assertEqual(self.commands, [])

    def test_new_master_before_patch_aborts_update(self):
        self.assertEqual(self.execute(next_head="b" * 40), "master-changed")
        self.assertEqual(len(self.commands), 1)

    def test_rollout_failure_is_reported_without_blind_rollback(self):
        with self.assertRaisesRegex(RuntimeError, "kubectl failure"):
            self.execute(fail="rollout")
        self.assertEqual(len(self.commands), 3)
        self.assertNotIn("undo", self.commands[-1])

    def test_patch_conflict_stops_before_rollout(self):
        with self.assertRaises(RuntimeError):
            self.execute(fail="patch")
        self.assertEqual(len(self.commands), 2)

    def test_api_failure_does_not_access_cluster(self):
        def unavailable(path):
            raise TimeoutError("API unavailable")
        with self.assertRaises(TimeoutError):
            deploy.run_once(unavailable, lambda args: self.commands.append(args))
        self.assertEqual(self.commands, [])

    def test_invalid_sha_is_rejected(self):
        self.sha = "invalid"
        with self.assertRaises(ValueError):
            self.execute()
        self.assertEqual(self.commands, [])

    def test_already_selected_image_checks_rollout_without_patch(self):
        self.current["spec"]["template"]["spec"]["containers"][0]["image"] = (
            "ghcr.io/kyobankatu/portfolio:sha-" + self.sha
        )
        self.assertEqual(self.execute(), "already-current")
        self.assertEqual(len(self.commands), 2)
        self.assertIn("rollout", self.commands[1])

    def test_verified_head_updates_image_and_waits_for_rollout(self):
        sha = "a" * 40
        run = {"head_sha": sha, "head_branch": "master", "event": "push",
               "status": "completed", "conclusion": "success",
               "head_repository": {"full_name": deploy.REPOSITORY}}
        responses = iter([{"sha": sha}, {"workflow_runs": [run]}, {"sha": sha}])
        commands = []
        current = {"metadata": {"resourceVersion": "12"}, "spec": {"template": {
            "spec": {"containers": [{"name": "portfolio", "image": "old"}]}}}}

        def command(args):
            commands.append(args)
            if "get" in args:
                return current
            if "patch" in args:
                for operation in json.loads(args[-1]):
                    parts = operation["path"].strip("/").split("/")
                    target = current
                    for part in parts[:-1]:
                        target = target[int(part)] if isinstance(target, list) else target[part]
                    key = int(parts[-1]) if isinstance(target, list) else parts[-1]
                    if operation["op"] == "test":
                        self.assertEqual(target[key], operation["value"])
                    else:
                        target[key] = copy.deepcopy(operation["value"])
            return {}

        result = deploy.run_once(lambda path: next(responses), command)
        self.assertEqual(result, "deployed")
        patch = __import__("json").loads(commands[1][-1])
        self.assertEqual(patch[0], {"op": "test", "path": "/metadata/resourceVersion", "value": "12"})
        self.assertIn("ghcr.io/kyobankatu/portfolio:sha-" + sha,
                      __import__("json").dumps(patch))
        updated = current["spec"]
        container = updated["template"]["spec"]["containers"][0]
        self.assertEqual(container["name"], "portfolio")
        self.assertEqual(container["image"], "ghcr.io/kyobankatu/portfolio:sha-" + sha)
        self.assertEqual(updated["strategy"], {
            "type": "RollingUpdate", "rollingUpdate": {"maxUnavailable": 0, "maxSurge": 1}
        })
        self.assertEqual(updated["progressDeadlineSeconds"], 240)
        self.assertEqual(container["readinessProbe"], {
            "httpGet": {"path": "/", "port": 3000}, "periodSeconds": 5, "timeoutSeconds": 2
        })
        self.assertEqual(container["startupProbe"], {
            "httpGet": {"path": "/", "port": 3000}, "periodSeconds": 5, "timeoutSeconds": 2,
            "failureThreshold": 30
        })
        self.assertIn("rollout", commands[2])
        self.assertIn("status", commands[2])

    def test_missing_successful_ci_leaves_cluster_untouched(self):
        responses = iter([{"sha": "a" * 40}, {"workflow_runs": []}])
        commands = []
        result = deploy.run_once(
            lambda path: next(responses), lambda args: commands.append(args)
        )
        self.assertEqual(result, "no-successful-ci")
        self.assertEqual(commands, [])


if __name__ == "__main__":
    unittest.main()
