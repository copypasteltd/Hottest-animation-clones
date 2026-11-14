"""Read-only integrity check for the two explicitly approved local anchors.

No generation, downloads, biometric comparison or visual motion assessment.
A public checkout intentionally lacks private media and returns a clear failure.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path, PurePosixPath
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = "standard-assets/characters/selection.v1.json"
REGISTRY_SHA256 = "4f68778bf5938fdf72e347b2e1ce27f4e4dea8255ca1dbf6d7bfb6b1edb44f86"
EXPECTED = {
    "SA02": {
        "character_id": "char-asuna-sa02",
        "anchor_sha256": "dd876e86f8602b60d16f115a080058669e95a5c6fbf440c8bac7c870dc505659",
        "asset_sha256": "fbf8771f287dbc929ae1c661bba74bba700c851960843ca7df085491b59d30e0",
        "medium": "2d_japanese_anime_sao2_reference_design",
    },
    "JK03": {
        "character_id": "char-cn-jk03",
        "anchor_sha256": "20756e21f9e298863430287715d2a71545f3fc9970a9621070ee3f9146c93078",
        "asset_sha256": "aca0775c8d35c784c16eb319c1d1e2026b1f3ae3d7bc9dd47daf3dc97e024003",
        "medium": "photorealistic_fictional_chinese_high_school_student",
    },
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def project_file(root: Path, relative: str) -> Path:
    require(isinstance(relative, str) and bool(relative), "Missing project-relative path")
    path = PurePosixPath(relative)
    require(not path.is_absolute() and ".." not in path.parts and ":" not in relative and "\\" not in relative, "Unsafe project-relative path")
    resolved = (root / relative).resolve()
    require(resolved.is_relative_to(root.resolve()), "Path escapes project through a link")
    require(resolved.is_file(), f"Required local asset missing: {relative}; do not regenerate or substitute")
    return resolved


def verified_bytes(root: Path, relative: str, expected_hash: str) -> bytes:
    raw = project_file(root, relative).read_bytes()
    require(hashlib.sha256(raw).hexdigest() == expected_hash, f"Frozen content changed: {relative}")
    return raw


def png_size(raw: bytes) -> tuple[int, int]:
    require(len(raw) >= 24 and raw[:8] == b"\x89PNG\r\n\x1a\n" and raw[12:16] == b"IHDR", "Invalid PNG header")
    return struct.unpack(">II", raw[16:24])


def verify_lock(root: Path = ROOT) -> dict:
    registry = json.loads(verified_bytes(root, REGISTRY_PATH, REGISTRY_SHA256))
    require(registry["status"] == "frozen_static_selection" and registry["revision"] == 1, "Unexpected selection revision")
    require(registry["separate_character_tracks"] is True, "Characters must be separate")
    require(registry["motion_transfer_approved"] is False, "Static approval is not motion approval")
    require(registry["default_when_unspecified"] == "ask_which_of_the_two_no_silent_choice", "Unspecified character cannot silently select")
    selected = registry["selected"]
    require(len(selected) == 2 and {s["selection_id"] for s in selected} == set(EXPECTED), "Expected exactly SA02 and JK03")
    results = []
    for entry in selected:
        selection = entry["selection_id"]
        fixed = EXPECTED[selection]
        character_id = fixed["character_id"]
        require(entry["character_id"] == character_id and entry["revision"] == 1, "Character identity or revision mismatch")
        base = f"standard-assets/characters/{character_id}/v1"
        require(entry["asset_path"] == base + "/asset.json" and entry["anchor_path"] == base + "/front-full.png", "Frozen path mismatch")
        require(entry["asset_sha256"] == fixed["asset_sha256"] and entry["anchor_sha256"] == fixed["anchor_sha256"], "Declared frozen hash mismatch")
        asset = json.loads(verified_bytes(root, entry["asset_path"], fixed["asset_sha256"]))
        require(asset["character_id"] == character_id and asset["selection_id"] == selection and asset["revision"] == 1, "Asset identity mismatch")
        require(asset["status"] == "frozen_front_anchor" and asset["approval"]["by"] == "user", "Missing scoped user approval")
        require(asset["anchor"]["path"] == entry["anchor_path"] and asset["anchor"]["sha256"] == fixed["anchor_sha256"], "Anchor metadata mismatch")
        raw = verified_bytes(root, entry["anchor_path"], fixed["anchor_sha256"])
        require(len(raw) == asset["anchor"]["bytes"] and png_size(raw) == (1024, 1536), "Anchor dimensions/bytes mismatch")
        require(asset["constraints"]["medium"] == fixed["medium"] and asset["constraints"]["background"] == "pure_white_RGB255", "Medium/background changed")
        for untested in ("motion_transfer", "skeleton", "target_model_compatibility"):
            require(asset["validation"][untested] == "not_run", "Unperformed capability must remain not_run")
        require(asset["version_policy"]["overwrite_frozen_anchor"] is False, "Frozen anchor cannot be overwritten")
        results.append({"selection_id": selection, "character_id": character_id, "revision": 1, "anchor": entry["anchor_path"], "sha256": fixed["anchor_sha256"]})
    return {"status": "passed", "scope": "local_frozen_file_integrity_and_approval_metadata_not_generated_visual_quality", "characters": results, "new_media_generated": False, "motion_transfer_verified": False}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    try:
        print(json.dumps(verify_lock(), ensure_ascii=False, indent=2))
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(json.dumps({"status": "failed", "reason": str(error), "action": "stop_no_fallback_no_regeneration"}, ensure_ascii=False, indent=2))
        raise SystemExit(1)
