"""Read-only check of current approved SA02/BM01 anchors and BM01 four-view.

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
CURRENT_PATH = "standard-assets/characters/current.json"
CURRENT_SHA256 = "a40bea7fbf12ae3235a5af12e2f7e350d87affbe9fc1e450dee0df217dcf087a"
REGISTRY_PATH = "standard-assets/characters/selection.v2.json"
REGISTRY_SHA256 = "14e2eedcca5b2d6a1766f2e817fb04b528d719b5f22423699e0278a5626b35f8"
REGISTRY_REVISION = 2
EXPECTED = {
    "SA02": {
        "character_id": "char-asuna-sa02",
        "anchor_sha256": "dd876e86f8602b60d16f115a080058669e95a5c6fbf440c8bac7c870dc505659",
        "asset_sha256": "fbf8771f287dbc929ae1c661bba74bba700c851960843ca7df085491b59d30e0",
        "medium": "2d_japanese_anime_sao2_reference_design",
    },
    "BM01": {
        "character_id": "char-blue-maid-bm01",
        "anchor_sha256": "a8329f3f84a267e9bad2c283054b5547751bd96028563dbd018372f336bb9180",
        "asset_sha256": "785b2ce3a27d72fdf153d3c322c985be3ae6adf47895efc175145c1fe26ce283",
        "medium": "photorealistic_reference_conditioned_blue_maid",
        "four_view_sha256": "1e911077dcee910ae9e5b31bf57997b1fff800140320bea18d9049f7290f70d0",
    },
}
ROLE_DEFAULTS = {"anime": "SA02", "real": "BM01"}
RETIRED_OFFICIAL_FILES = (
    "standard-assets/characters/char-cn-jk03/v1/asset.json",
    "standard-assets/characters/char-cn-jk03/v1/front-full.png",
    "standard-assets/framing/ref-jk03-s02-knee/v1/asset.json",
    "standard-assets/framing/ref-jk03-s02-knee/v1/image.png",
    "standard-assets/framing/ref-jk03-s02-full/v1/asset.json",
    "standard-assets/framing/ref-jk03-s02-full/v1/image.png",
)


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
    current = json.loads(verified_bytes(root, CURRENT_PATH, CURRENT_SHA256))
    require(current["registry_path"] == REGISTRY_PATH and current["registry_sha256"] == REGISTRY_SHA256 and current["revision"] == REGISTRY_REVISION, "Historical selection cannot become current")
    require(current["role_defaults"] == ROLE_DEFAULTS, "Real role must resolve to BM01; no retired fallback")
    registry = json.loads(verified_bytes(root, REGISTRY_PATH, REGISTRY_SHA256))
    require(registry["status"] == "frozen_static_selection" and registry["revision"] == REGISTRY_REVISION, "Unexpected selection revision")
    require(registry["separate_character_tracks"] is True, "Characters must be separate")
    require(registry["motion_transfer_approved"] is False, "Static approval is not motion approval")
    require(registry["default_when_unspecified"] == "ask_which_of_the_two_no_silent_choice", "Unspecified character cannot silently select")
    require(registry["role_defaults"] == ROLE_DEFAULTS and "JK03" in registry["retired"], "Retired JK03 cannot be the real role")
    selected = registry["selected"]
    require(len(selected) == 2 and {s["selection_id"] for s in selected} == set(EXPECTED), "Expected exactly SA02 and BM01")
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
        result = {"selection_id": selection, "character_id": character_id, "revision": 1, "anchor": entry["anchor_path"], "sha256": fixed["anchor_sha256"]}
        if selection == "BM01":
            sheet = asset["supporting_views"]["approved_four_view"]
            require("selected_four_view_version" in asset["approval"]["scope"], "BM01 four-view approval missing")
            require(sheet["path"] == base + "/four-view.png" and sheet["sha256"] == fixed["four_view_sha256"], "Approved BM01 four-view changed")
            require(entry["supporting_sheet_path"] == sheet["path"] and entry["supporting_sheet_sha256"] == sheet["sha256"], "Selected sheet mismatch")
            sheet_raw = verified_bytes(root, sheet["path"], sheet["sha256"])
            require(len(sheet_raw) == sheet["bytes"] and png_size(sheet_raw) == (1536, 1024), "Four-view dimensions/bytes mismatch")
            require(asset["constraints"]["height_design_cm"] is None, "Do not inherit JK03 height")
            result["approved_four_view"] = sheet["path"]
            result["four_view_sha256"] = sheet["sha256"]
        results.append(result)
    for relative in RETIRED_OFFICIAL_FILES:
        path = root / relative
        require(not path.exists() and not path.is_symlink(), f"Retired official JK03 file must not be restored: {relative}")
    return {"status": "passed", "scope": "local_frozen_file_integrity_and_approval_metadata_not_generated_visual_quality", "selection_revision": REGISTRY_REVISION, "role_defaults": ROLE_DEFAULTS, "characters": results, "retired": ["JK03"], "new_media_generated": False, "motion_transfer_verified": False}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    try:
        print(json.dumps(verify_lock(), ensure_ascii=False, indent=2))
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(json.dumps({"status": "failed", "reason": str(error), "action": "stop_no_fallback_no_regeneration"}, ensure_ascii=False, indent=2))
        raise SystemExit(1)
