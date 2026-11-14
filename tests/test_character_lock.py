"""Public guard tests use synthetic bytes and mocked local reads, not media."""
import json
from pathlib import Path
import struct
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import check_character_lock as lock


def synthetic_records():
    current = {"registry_path": lock.REGISTRY_PATH, "registry_sha256": lock.REGISTRY_SHA256, "revision": 2, "role_defaults": lock.ROLE_DEFAULTS}
    registry = {"status": "frozen_static_selection", "revision": 2, "separate_character_tracks": True, "motion_transfer_approved": False, "default_when_unspecified": "ask_which_of_the_two_no_silent_choice", "role_defaults": lock.ROLE_DEFAULTS, "retired": ["JK03"], "selected": []}
    records = {}
    front = b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + b"IHDR" + struct.pack(">II", 1024, 1536)
    sheet = b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + b"IHDR" + struct.pack(">II", 1536, 1024)
    for name, fixed in lock.EXPECTED.items():
        base = "standard-assets/characters/" + fixed["character_id"] + "/v1"
        entry = {"selection_id": name, "character_id": fixed["character_id"], "revision": 1, "asset_path": base + "/asset.json", "asset_sha256": fixed["asset_sha256"], "anchor_path": base + "/front-full.png", "anchor_sha256": fixed["anchor_sha256"]}
        asset = {"selection_id": name, "character_id": fixed["character_id"], "revision": 1, "status": "frozen_front_anchor", "approval": {"by": "user", "scope": ["selected_four_view_version"]}, "anchor": {"path": entry["anchor_path"], "sha256": fixed["anchor_sha256"], "bytes": len(front)}, "constraints": {"medium": fixed["medium"], "background": "pure_white_RGB255", "height_design_cm": None}, "validation": {"motion_transfer": "not_run", "skeleton": "not_run", "target_model_compatibility": "not_run"}, "version_policy": {"overwrite_frozen_anchor": False}}
        if name == "BM01":
            entry.update(supporting_sheet_path=base + "/four-view.png", supporting_sheet_sha256=fixed["four_view_sha256"])
            asset["supporting_views"] = {"approved_four_view": {"path": base + "/four-view.png", "sha256": fixed["four_view_sha256"], "bytes": len(sheet)}}
            records[base + "/four-view.png"] = sheet
        registry["selected"].append(entry)
        records[entry["asset_path"]] = asset
        records[entry["anchor_path"]] = front
    records[lock.CURRENT_PATH] = current
    records[lock.REGISTRY_PATH] = registry
    return records


class CharacterLockTests(unittest.TestCase):
    def verify_synthetic(self, records):
        def read(_root, path, _expected_hash):
            value = records[path]
            return value if isinstance(value, bytes) else json.dumps(value).encode()
        with patch.object(lock, "verified_bytes", side_effect=read), patch.object(lock.Path, "exists", return_value=False), patch.object(lock.Path, "is_symlink", return_value=False):
            return lock.verify_lock(ROOT)

    def test_exact_two_separate_identities_are_pinned(self):
        self.assertEqual(set(lock.EXPECTED), {"SA02", "BM01"})
        self.assertEqual(len({v["character_id"] for v in lock.EXPECTED.values()}), 2)
        self.assertNotEqual(lock.EXPECTED["SA02"]["medium"], lock.EXPECTED["BM01"]["medium"])
        self.assertEqual(lock.ROLE_DEFAULTS, {"anime": "SA02", "real": "BM01"})

    def test_missing_asset_stops_without_fallback(self):
        with patch.object(lock.Path, "is_file", return_value=False):
            with self.assertRaisesRegex(ValueError, "do not regenerate or substitute"):
                lock.project_file(ROOT, lock.REGISTRY_PATH)

    def test_unsafe_paths_rejected(self):
        for path in ("../escape.png", "/escape.png", "C:/escape.png", "a\\b.png", ""):
            with self.subTest(path=path), self.assertRaises(ValueError):
                lock.project_file(ROOT, path)

    def test_anchor_bytes_mismatch_rejected(self):
        with patch.object(lock, "project_file") as mocked:
            mocked.return_value.read_bytes.return_value = b"different image"
            with self.assertRaisesRegex(ValueError, "Frozen content changed"):
                lock.verified_bytes(ROOT, "synthetic.png", "0" * 64)

    def test_png_header_dimensions_and_reject_invalid(self):
        raw = b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + b"IHDR" + struct.pack(">II", 1024, 1536)
        self.assertEqual(lock.png_size(raw), (1024, 1536))
        with self.assertRaises(ValueError):
            lock.png_size(b"not an image")

    def test_static_approval_cannot_claim_motion_verified(self):
        records = synthetic_records()
        records[lock.REGISTRY_PATH]["motion_transfer_approved"] = True
        with self.assertRaisesRegex(ValueError, "Static approval is not motion approval"):
            self.verify_synthetic(records)

    def test_unselected_character_rejected(self):
        records = synthetic_records()
        records[lock.REGISTRY_PATH]["selected"][1]["selection_id"] = "JK03"
        with self.assertRaisesRegex(ValueError, "exactly SA02 and BM01"):
            self.verify_synthetic(records)

    def test_current_synthetic_pair_and_four_view_pass(self):
        result = self.verify_synthetic(synthetic_records())
        self.assertEqual(result["selection_revision"], 2)
        self.assertEqual(result["retired"], ["JK03"])
        self.assertIn("approved_four_view", result["characters"][1])
        self.assertFalse(result["motion_transfer_verified"])

    def test_historical_registry_cannot_become_current(self):
        records = synthetic_records()
        records[lock.CURRENT_PATH]["registry_path"] = "standard-assets/characters/selection.v1.json"
        with self.assertRaisesRegex(ValueError, "Historical selection cannot become current"):
            self.verify_synthetic(records)

    def test_wrong_or_missing_four_view_rejected(self):
        for changed in ("hash", "missing"):
            with self.subTest(changed=changed):
                records = synthetic_records()
                path = "standard-assets/characters/char-blue-maid-bm01/v1/asset.json"
                if changed == "hash":
                    records[path]["supporting_views"]["approved_four_view"]["sha256"] = "0" * 64
                    error = ValueError
                else:
                    del records["standard-assets/characters/char-blue-maid-bm01/v1/four-view.png"]
                    error = KeyError
                with self.assertRaises(error):
                    self.verify_synthetic(records)

    def test_bm01_does_not_inherit_retired_height(self):
        records = synthetic_records()
        path = "standard-assets/characters/char-blue-maid-bm01/v1/asset.json"
        records[path]["constraints"]["height_design_cm"] = 148
        with self.assertRaisesRegex(ValueError, "Do not inherit JK03 height"):
            self.verify_synthetic(records)

    def test_restored_retired_official_asset_rejected(self):
        records = synthetic_records()
        def read(_root, path, _hash):
            value = records[path]
            return value if isinstance(value, bytes) else json.dumps(value).encode()
        with patch.object(lock, "verified_bytes", side_effect=read), patch.object(lock.Path, "exists", return_value=True):
            with self.assertRaisesRegex(ValueError, "Retired official JK03 file"):
                lock.verify_lock(ROOT)


if __name__ == "__main__":
    unittest.main()
