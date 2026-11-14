"""Contract/guard tests using only synthetic bytes and mocked local reads.
No real character media is required by the public repository tests.
"""
import json
from pathlib import Path
import struct
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import check_character_lock as lock


class CharacterLockTests(unittest.TestCase):
    def test_exact_two_separate_identities_are_pinned(self):
        self.assertEqual(set(lock.EXPECTED), {"SA02", "JK03"})
        self.assertEqual(len({v["character_id"] for v in lock.EXPECTED.values()}), 2)
        self.assertNotEqual(lock.EXPECTED["SA02"]["medium"], lock.EXPECTED["JK03"]["medium"])

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
        synthetic = {"status": "frozen_static_selection", "revision": 1, "separate_character_tracks": True, "motion_transfer_approved": True}
        with patch.object(lock, "verified_bytes", return_value=json.dumps(synthetic).encode()):
            with self.assertRaisesRegex(ValueError, "Static approval is not motion approval"):
                lock.verify_lock(ROOT)

    def test_unselected_character_rejected(self):
        synthetic = {"status": "frozen_static_selection", "revision": 1, "separate_character_tracks": True, "motion_transfer_approved": False, "default_when_unspecified": "ask_which_of_the_two_no_silent_choice", "selected": [{"selection_id": "SA01"}, {"selection_id": "JK05"}]}
        with patch.object(lock, "verified_bytes", return_value=json.dumps(synthetic).encode()):
            with self.assertRaisesRegex(ValueError, "exactly SA02 and JK03"):
                lock.verify_lock(ROOT)


if __name__ == "__main__":
    unittest.main()
