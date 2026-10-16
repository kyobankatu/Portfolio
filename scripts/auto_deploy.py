"""Poll verified master builds; kubectl access stays on the control-plane host."""

import json
import re
import argparse
from contextlib import contextmanager
from pathlib import Path
import subprocess
import sys
import urllib.request

REPOSITORY = "kyobankatu/Portfolio"


@contextmanager
def deployment_lock(path):
    import fcntl
    with Path(path).open("a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            yield False
            return
        try:
            yield True
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def github_json(path):
    request = urllib.request.Request(
        "https://api.github.com" + path,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "portfolio-deploy"},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.load(response)


def kubectl(args):
    result = subprocess.run(
        ["kubectl", "--namespace=default", "--request-timeout=190s", *args],
        check=True, capture_output=True, text=True, timeout=200,
    )
    return json.loads(result.stdout) if "get" in args else {}


def run_once(fetch_json, command, dry_run=False):
    head = fetch_json(f"/repos/{REPOSITORY}/commits/master")["sha"]
    runs = fetch_json(
        f"/repos/{REPOSITORY}/actions/workflows/ci.yml/runs?branch=master&per_page=20"
    )["workflow_runs"]
    if not re.fullmatch(r"[0-9a-f]{40}", head):
        raise ValueError("Invalid master SHA")
    verified = any(
        run.get("head_sha") == head
        and run.get("head_branch") == "master"
        and run.get("event") in ("push", "workflow_dispatch")
        and run.get("status") == "completed"
        and run.get("conclusion") == "success"
        and run.get("head_repository", {}).get("full_name") == REPOSITORY
        for run in runs
    )
    if not verified:
        return "no-successful-ci"
    current = command(["get", "deployment", "portfolio", "-o", "json"])
    containers = current["spec"]["template"]["spec"]["containers"]
    index = next(i for i, container in enumerate(containers) if container["name"] == "portfolio")
    image = f"ghcr.io/kyobankatu/portfolio:sha-{head}"
    if fetch_json(f"/repos/{REPOSITORY}/commits/master")["sha"] != head:
        return "master-changed"
    if dry_run:
        return "dry-run"
    if containers[index]["image"] == image:
        command(["rollout", "status", "deployment/portfolio", "--timeout=180s"])
        return "already-current"
    patch = [
        {"op": "test", "path": "/metadata/resourceVersion", "value": current["metadata"]["resourceVersion"]},
        {"op": "add", "path": "/spec/strategy", "value": {
            "type": "RollingUpdate", "rollingUpdate": {"maxUnavailable": 0, "maxSurge": 1}}},
        {"op": "add", "path": "/spec/progressDeadlineSeconds", "value": 240},
        {"op": "add", "path": f"/spec/template/spec/containers/{index}/readinessProbe", "value": {
            "httpGet": {"path": "/", "port": 3000}, "periodSeconds": 5, "timeoutSeconds": 2}},
        {"op": "add", "path": f"/spec/template/spec/containers/{index}/startupProbe", "value": {
            "httpGet": {"path": "/", "port": 3000}, "periodSeconds": 5, "timeoutSeconds": 2,
            "failureThreshold": 30}},
        {"op": "replace", "path": f"/spec/template/spec/containers/{index}/image", "value": image},
    ]
    print(json.dumps({"event": "updating", "previous_image": containers[index]["image"], "image": image}), flush=True)
    command(["patch", "deployment", "portfolio", "--type=json", "-p", json.dumps(patch)])
    command(["rollout", "status", "deployment/portfolio", "--timeout=180s"])
    return "deployed"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--lock-file", type=Path, default=Path.home() / ".local/state/portfolio-deploy/lock")
    args = parser.parse_args()
    args.lock_file.parent.mkdir(parents=True, exist_ok=True)
    try:
        with deployment_lock(args.lock_file) as acquired:
            result = run_once(github_json, kubectl, args.dry_run) if acquired else "locked"
        print(json.dumps({"result": result}), flush=True)
        return 0
    except Exception as error:
        # kubectl stderr or HTTP bodies may contain cluster details; keep logs bounded.
        print(json.dumps({"result": "error", "type": type(error).__name__}), file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
