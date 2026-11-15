"""Validate only the eight explicitly requested public character PNGs.

Uses standard-library hash/header checks. Does not read raw photos or private
asset registries, run image generation, infer visual quality, or change approval.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import struct

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = "docs/images/characters/manifest.json"
BASE = "docs/images/characters/"
# Immutable published illustration identity, dimensions and approval labels.
EXPECTED = {
    BASE + "sa02-front-v1.png": ("dd876e86f8602b60d16f115a080058669e95a5c6fbf440c8bac7c870dc505659", (1024, 1536), "user_approved"),
    BASE + "sa02-four-view-candidate-v1.png": ("953e12f5cf30f0fa2ededbb813f600938cbe8686365759550e5fe0b5607a9fd0", (1536, 1024), "pending_user_confirmation"),
    BASE + "sa02-s02-knee-v1.png": ("21262a3aa400ad81158ecc021ba28075cff3e9f2a04f01b7d608a83d8b04536f", (1024, 1536), "produced_visual_checked_no_motion_approval"),
    BASE + "sa02-s02-full-v1.png": ("e0a9a681bc34a721ff2b8f877e89742d4a924c764e714466c2636bc97dece3d1", (1024, 1536), "produced_visual_checked_no_motion_approval"),
    BASE + "bm01-front-v1.png": ("a8329f3f84a267e9bad2c283054b5547751bd96028563dbd018372f336bb9180", (1024, 1536), "user_approved"),
    BASE + "bm01-four-view-v1.png": ("1e911077dcee910ae9e5b31bf57997b1fff800140320bea18d9049f7290f70d0", (1536, 1024), "user_approved"),
    BASE + "bm01-s02-knee-v1.png": ("838203a596e83ad2ed107b9208043a7d628f7b03a4f701dc29542fe172d66c7a", (1024, 1536), "produced_visual_checked_pending_individual_user_review"),
    BASE + "bm01-s02-full-v1.png": ("5e847ade47edda1c9c320ac24d306e158d87af3cc41560548a7ae9d200b7e012", (1024, 1536), "produced_visual_checked_pending_individual_user_review"),
}
PUBLIC_IMAGES = frozenset(EXPECTED)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def validate_manifest(manifest: dict) -> dict[str, dict]:
    require(manifest.get("record_kind") == "explicitly_requested_readme_character_illustrations", "Unexpected image manifest kind")
    require(manifest.get("authorization", {}).get("by") == "user", "Explicit user README image request missing")
    require(manifest.get("approval_states_unchanged") is True, "Image publication must not promote approval")
    require(manifest.get("pixel_or_geometry_edits") is False, "Expected byte-identical image publication")
    files = manifest.get("files")
    require(isinstance(files, list) and len(files) == len(EXPECTED), "Expected exactly eight README images")
    entries = {item["path"]: item for item in files}
    require(len(entries) == len(files) and set(entries) == PUBLIC_IMAGES, "Unexpected or duplicate README image path")
    for name, (sha, size, status) in EXPECTED.items():
        item = entries[name]
        require(item["sha256"] == sha and tuple(item["size"]) == size, f"Published illustration identity changed: {name}")
        require(item["status"] == status, f"Illustration approval label changed: {name}")
        require(item["format"] == "PNG" and item["revision"] == 1, f"Unexpected illustration format/version: {name}")
        require(item["copy"] == "byte_identical_to_existing_project_image", f"Copy provenance missing: {name}")
        require(isinstance(item["bytes"], int) and not isinstance(item["bytes"], bool) and 0 < item["bytes"] <= 3_000_000, f"Image size outside policy: {name}")
    return entries


def validate_payload(name: str, raw: bytes, item: dict) -> None:
    expected_hash, expected_size, _ = EXPECTED[name]
    require(len(raw) == item["bytes"] and hashlib.sha256(raw).hexdigest() == expected_hash, f"README image bytes/hash changed: {name}")
    require(len(raw) >= 24 and raw[:8] == b"\x89PNG\r\n\x1a\n" and raw[12:16] == b"IHDR", f"Invalid PNG signature: {name}")
    require(struct.unpack(">II", raw[16:24]) == expected_size, f"PNG dimensions changed: {name}")


def readme_images(text: str) -> set[str]:
    targets = re.findall(r"!\[[^\]\n]*\]\(<?([^)>\n]+)>?\)", text)
    return {target for target in targets if target.startswith(BASE)}


def validate(root: Path = ROOT) -> dict:
    def read(relative: str) -> bytes:
        path = root / relative
        require(path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(root.resolve()), f"Missing or unsafe public image: {relative}")
        return path.read_bytes()
    manifest = json.loads(read(MANIFEST_PATH))
    entries = validate_manifest(manifest)
    for name, item in entries.items():
        validate_payload(name, read(name), item)
    for relative in ("README.md", "README.zh-CN.md"):
        text = read(relative).decode("utf-8")
        require(readme_images(text) == PUBLIC_IMAGES, f"Both READMEs must directly embed all eight character images: {relative}")
        require(MANIFEST_PATH in text, f"README image provenance link missing: {relative}")
    return {"status": "passed", "public_character_images": len(entries), "readme_languages_with_images": 2, "scope": "explicit_readme_image_identity_not_visual_or_motion_approval"}


if __name__ == "__main__":
    print(json.dumps(validate(), ensure_ascii=False, indent=2))
