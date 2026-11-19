"""Offline pre-commit check of staged filenames and content.

This is a conservative accidental-disclosure guard, not a full security audit.
It reads Git index objects, including the exact public README PNG exceptions,
never global Git configuration or private/raw media files.
"""
from __future__ import annotations

import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys

from check_readme_images import MANIFEST_PATH, PUBLIC_IMAGES, readme_images, validate_manifest, validate_payload
from documentation import PUBLIC_DOC_PATHS

ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = {".gitignore", ".gitattributes", ".editorconfig", "LICENSE", "pyproject.toml", "README.md", "README.zh-CN.md", "AGENTS.md"}
BINARY_EXTENSIONS = {
    ".mp4", ".mov", ".mkv", ".avi", ".webm", ".wav", ".mp3", ".png", ".jpg", ".jpeg",
    ".webp", ".gif", ".npz", ".npy", ".safetensors", ".ckpt", ".pt", ".pth", ".onnx",
    ".gguf", ".zip", ".7z", ".tar", ".gz", ".fbx", ".bvh", ".glb", ".pem", ".key",
}


def allowed_path(name: str) -> bool:
    path = PurePosixPath(name)
    if name in ROOT_FILES or name in PUBLIC_IMAGES or name == MANIFEST_PATH:
        return True
    if path.suffix.lower() in BINARY_EXTENSIONS:
        return False
    parts = path.parts
    if not parts or "." in parts or ".." in parts:
        return False
    if parts[0] in {"src", "tests", "scripts"}:
        return path.suffix in {".py", ".typed"} or path.name in {".gitkeep", "py.typed"}
    if parts[0] == "configs":
        return name == "configs/project.example.toml"
    if parts[0] == ".github":
        return path.suffix in {".yml", ".yaml"} or name == ".github/PULL_REQUEST_TEMPLATE.md"
    if parts[0] == "docs":
        return name in PUBLIC_DOC_PATHS
    return False


PATTERNS = {
    "credential_assignment": re.compile(r"(?i)(?:token|api[_-]?key|password|secret|bearer[_-]?key)\s*[=:]\s*[\"']?[A-Za-z0-9_\-]{24,}"),
    "bearer_value": re.compile(r"(?i)bearer\s+[A-Za-z0-9_\-.]{24,}"),
    "common_key_prefix": re.compile(r"(?:gh[pousr]_[A-Za-z0-9]{24,}|sk-[A-Za-z0-9_-]{24,}|AKIA[0-9A-Z]{16})"),
    "private_key_header": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "private_network_address": re.compile(r"\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b"),
    "machine_user_path": re.compile(r"(?i)[A-Z]:[\\/]+Users[\\/]+[^\s\"'<>]+"),
}


def scan_text(text: str) -> list[str]:
    return [name for name, pattern in PATTERNS.items() if pattern.search(text)]


def staged_files(root: Path) -> list[str]:
    result = subprocess.run(["git", "-c", "core.quotePath=false", "ls-files", "--cached", "-z"], cwd=root, check=True, capture_output=True)
    return [item.decode("utf-8") for item in result.stdout.split(b"\0") if item]


def check(root: Path = ROOT) -> dict:
    names = staged_files(root)
    if not names:
        raise ValueError("Index is empty; explicitly stage reviewed source files first")
    findings = []
    image_entries = {}
    if PUBLIC_IMAGES.intersection(names) or MANIFEST_PATH in names:
        if not PUBLIC_IMAGES.union({MANIFEST_PATH}).issubset(names):
            raise ValueError("Stage the complete explicit README image inventory and manifest")
        manifest_raw = subprocess.run(["git", "show", ":" + MANIFEST_PATH], cwd=root, check=True, capture_output=True).stdout
        image_entries = validate_manifest(json.loads(manifest_raw))
        for readme in ("README.md", "README.zh-CN.md"):
            text = subprocess.run(["git", "show", ":" + readme], cwd=root, check=True, capture_output=True).stdout.decode("utf-8")
            if readme_images(text) != PUBLIC_IMAGES:
                raise ValueError("Both staged READMEs must inline all eight character illustrations")
    modes_raw = subprocess.run(["git", "ls-files", "--stage", "-z"], cwd=root, check=True, capture_output=True).stdout
    modes = {}
    for entry in modes_raw.split(b"\0"):
        if entry:
            metadata, name_bytes = entry.split(b"\t", 1)
            modes[name_bytes.decode("utf-8")] = metadata.split(b" ", 1)[0].decode("ascii")
    for name in names:
        if modes.get(name) not in {"100644", "100755"}:
            findings.append({"path": name, "rule": "symlink_submodule_or_nonregular_index_entry"})
            continue
        if not allowed_path(name):
            findings.append({"path": name, "rule": "not_in_public_allowlist"})
            continue
        payload = subprocess.run(["git", "show", ":" + name], cwd=root, check=True, capture_output=True).stdout
        if name in PUBLIC_IMAGES:
            try:
                validate_payload(name, payload, image_entries[name])
            except ValueError as error:
                findings.append({"path": name, "rule": "readme_image_identity_failed", "detail": str(error)})
            continue
        if len(payload) > 2_000_000 or b"\0" in payload:
            findings.append({"path": name, "rule": "binary_or_large_blob"})
            continue
        try:
            text = payload.decode("utf-8")
        except UnicodeDecodeError:
            findings.append({"path": name, "rule": "not_utf8_text"})
            continue
        for rule in scan_text(text):
            # Never print a matched credential value.
            findings.append({"path": name, "rule": rule})
    if findings:
        raise ValueError(json.dumps({"status": "failed", "findings": findings}, ensure_ascii=False))
    return {"status": "passed", "scope": "staged_source_accidental_disclosure_guard_not_full_audit", "staged_files_checked": len(names)}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(check(), ensure_ascii=False, indent=2))
