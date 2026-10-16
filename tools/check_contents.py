#!/usr/bin/env python3
"""Read-only CONTENTS.md inventory checker. Python 3.10+, standard library only."""

import argparse
from fnmatch import fnmatchcase
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
from urllib.parse import unquote, urlsplit


DEFAULT_EXCLUDES = (
    ".git", "node_modules", ".next", "dist", "build", "coverage", ".venv",
    "venv", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
    ".cache", ".tox",
)
HEADERS = ({"名前", "name"}, {"役割", "role", "description"}, {"編集方針", "editing policy", "policy"})
LINK = re.compile(r'^\[([^\]]+)\]\(\s*(?:<([^>]+)>|([^\s)]+))\s*\)$')
POLICY = re.compile(r'^(通常編集可|生成元を編集|対象外|要確認)(?:$|[\s（(:：])')


def is_link(path):
    return path.is_symlink() or (
        os.name == "nt"
        and getattr(path.lstat(), "st_reparse_tag", 0) == stat.IO_REPARSE_TAG_MOUNT_POINT
    )


def cells(line):
    line = line.strip()
    if not line.startswith("|") or not line.endswith("|"):
        return None
    return [cell.strip().replace(r"\|", "|") for cell in re.split(r"(?<!\\)\|", line[1:-1])]


def header(row):
    return row is not None and len(row) == 3 and all(cell.casefold() in options for cell, options in zip(row, HEADERS))


class Checker:
    def __init__(self, root, exclusions):
        self.root = root
        self.exclusions = exclusions
        self.findings = []
        self.checked = 0

    def display(self, path):
        return path.relative_to(self.root).as_posix()

    def add(self, code, path, message, line=None):
        item = {"code": code, "path": self.display(path), "message": message}
        if line is not None:
            item["line"] = line
        self.findings.append(item)

    def excluded(self, path):
        rel = self.display(path)
        for pattern in self.exclusions:
            pattern = pattern.replace("\\", "/").removeprefix("./").rstrip("/")
            if "/" not in pattern and fnmatchcase(path.name, pattern):
                return True
            if fnmatchcase(rel, pattern) or (pattern.endswith("/**") and rel == pattern[:-3]):
                return True
            if pattern.startswith("**/") and fnmatchcase(rel, pattern[3:]):
                return True
        return False

    def scan(self, directory):
        """Return whether this directory contains inventory-worthy content."""
        try:
            children = sorted(directory.iterdir(), key=lambda p: p.name)
            expected = set()
            for child in children:
                if child.name == "CONTENTS.md" or self.excluded(child):
                    continue
                if is_link(child) or not child.is_dir() or self.scan(child):
                    expected.add(child.name)
        except OSError as exc:
            self.add("read_error", directory, str(exc))
            return True
        index = directory / "CONTENTS.md"
        if not expected and not os.path.lexists(index):
            return False
        self.checked += 1
        if not os.path.lexists(index):
            self.add("missing_index", index, "Directory has content but no CONTENTS.md")
            return True
        if is_link(index):
            self.add("read_error", index, "CONTENTS.md must be a regular file, not a link")
            return True
        try:
            text = index.read_text(encoding="utf-8-sig")
        except (OSError, UnicodeError) as exc:
            self.add("read_error", index, str(exc))
            return True
        represented = self.check_table(index, text, {p.name: p for p in children})
        for name in sorted(expected - represented):
            self.add("missing_entry", index, f"Not listed: {name}")
        return True

    def check_table(self, index, text, actual):
        represented = set()
        found = False
        active = False
        pending_header = False
        fence = None
        for number, line in enumerate(text.splitlines(), 1):
            stripped = line.strip()
            marker = re.match(r'^(`{3,}|~{3,})', stripped)
            if fence:
                if marker and marker[1][0] == fence[0] and len(marker[1]) >= len(fence):
                    fence = None
                continue
            if marker:
                fence = marker[1]
                active = pending_header = False
                continue
            row = cells(line)
            if header(row):
                pending_header = True
                active = False
                continue
            if pending_header:
                pending_header = False
                active = row is not None and len(row) == 3 and all(re.fullmatch(r':?-{3,}:?', c) for c in row)
                found |= active
                if active:
                    continue
            if row is None:
                active = False
                continue
            if not active:
                continue
            if len(row) != 3:
                self.add("invalid_row", index, "Expected three table cells", number)
                continue
            name_cell, role, policy = row
            if not role.strip(" `*_") or re.fullmatch(r'<[^>]+>', role):
                self.add("empty_role", index, "Role is empty or an unfilled placeholder", number)
            if not POLICY.match(policy):
                self.add("invalid_policy", index, "Use 通常編集可 / 生成元を編集 / 対象外 / 要確認", number)
            match = LINK.fullmatch(name_cell)
            if not match:
                self.add("invalid_link", index, "Name must be an inline local Markdown link", number)
                continue
            label = match[1].strip(" `").rstrip("/")
            target = match[2] or match[3]
            try:
                url = urlsplit(target)
                decoded_path = unquote(url.path)
                path = PurePosixPath(decoded_path)
                parts = path.parts
                valid = (
                    not url.scheme and not url.netloc and not url.query
                    and "\\" not in decoded_path and not path.is_absolute() and ".." not in parts
                    and (len(parts) == 1 or (len(parts) == 2 and parts[1] == "CONTENTS.md"))
                    and parts[0] != "CONTENTS.md" and not any(":" in p for p in parts)
                )
            except ValueError:
                valid = False
            if not valid:
                self.add("invalid_link", index, "Link must name an immediate child or child/CONTENTS.md", number)
                continue
            name = parts[0]
            if name in represented:
                self.add("duplicate_entry", index, f"Listed more than once: {name}", number)
            represented.add(name)
            if label != name:
                self.add("invalid_link", index, "Link label must match the immediate child name", number)
            child = actual.get(name)
            if child is None:
                self.add("stale_entry", index, f"Child no longer exists: {name}", number)
                continue
            if len(parts) == 2 and (is_link(child) or not child.is_dir()):
                self.add("invalid_link", index, "Child index link requires a real directory, not a link", number)
                continue
            if not (index.parent.joinpath(*parts)).exists():
                self.add("broken_link", index, f"Target does not exist: {target}", number)
        if not found:
            self.add("missing_table", index, "No 名前 / 役割 / 編集方針 inventory table found")
        return represented

    def run(self):
        self.scan(self.root)
        self.findings.sort(key=lambda f: (f["path"], f.get("line", 0), f["code"]))
        return {
            "root": str(self.root), "ok": not self.findings,
            "checked_directories": self.checked,
            "exclusions": self.exclusions, "findings": self.findings,
        }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path, help="Project directory to check recursively")
    parser.add_argument("--exclude", action="append", default=[], metavar="GLOB", help="Additional name or root-relative glob; repeatable")
    parser.add_argument("--no-default-excludes", action="store_true", help="Use only explicit --exclude rules")
    parser.add_argument("--json", action="store_true", help="Emit a machine-readable result")
    args = parser.parse_args(argv)
    if not args.root.is_dir():
        parser.error(f"Not a directory: {args.root}")
    exclusions = ([] if args.no_default_excludes else list(DEFAULT_EXCLUDES)) + args.exclude
    report = Checker(args.root.resolve(), exclusions).run()
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        for finding in report["findings"]:
            location = finding["path"] + (f":{finding['line']}" if "line" in finding else "")
            print(f"{finding['code']}: {location}: {finding['message']}")
        print(f"{'OK' if report['ok'] else 'FAIL'}: {report['checked_directories']} directories checked, {len(report['findings'])} findings")
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
