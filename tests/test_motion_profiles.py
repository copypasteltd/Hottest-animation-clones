"""Offline structural, provenance and release-boundary tests for motion profiles."""
from pathlib import Path
from unittest.mock import mock_open, patch
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from check_motion_profiles import EXAMPLE, SCHEMA, TAXONOMY, load_json, project_bilibili_fields, project_bilibili_identity, validate_profile
from check_repository import allowed_path


class MotionProfileTests(unittest.TestCase):
    def setUp(self):
        self.profile = load_json(ROOT / EXAMPLE)

    def test_example_is_fictitious_and_has_both_renditions(self):
        summary = validate_profile(self.profile)
        self.assertEqual((summary["kind"], summary["renditions"], summary["verified_files"]),
                         ("illustrative_example", 2, 0))
        with self.assertRaisesRegex(ValueError, "illustrative examples"):
            validate_profile(self.profile, verify_assets=True)

    def test_metadata_keeps_raw_tags_and_distinguishes_missing_states(self):
        result = project_bilibili_fields({"title": "原题 ＃话题", "description": "原文 #话题 #另一项",
            "tags": ["舞蹈", "原标签", "舞蹈"], "duration": 1.2345, "view_count": 0,
            "like_count": True, "comment_count": None, "subtitles": {"zh": [{"url": "not imported"}]},
            "automatic_captions": {}, "track": "", "uploader_id": 15}, "snapshot")
        self.assertEqual(result["native_tags"]["value"], ["舞蹈", "原标签", "舞蹈"])
        self.assertEqual(result["text_hashtags"]["value"], ["话题", "另一项"])
        self.assertEqual(result["text_hashtags"]["origin"], "derived_from_snapshot")
        self.assertEqual(result["platform_hashtags"]["state"], "not_obtained")
        self.assertEqual(result["view_count"]["value"], 0)
        self.assertEqual(result["like_count"]["state"], "invalid")
        self.assertEqual(result["comment_count"]["state"], "not_obtained")
        self.assertEqual(result["declared_duration_ms"]["value"], 1235)
        self.assertEqual(result["subtitle_languages"]["value"], ["zh"])
        self.assertEqual(result["automatic_caption_languages"]["state"], "empty")
        self.assertEqual(result["track"]["value"], "")
        self.assertEqual(result["creator_id"]["value"], "15")

    def test_default_entry_does_not_invent_a_part(self):
        url = "https://www.bilibili.com/video/av123/?tracking=omit"
        result = project_bilibili_identity({"id": "av123", "webpage_url": url}, {"source_url": url})
        self.assertEqual(result["selection_kind"], "work_page_default")
        self.assertIsNone(result["selected_part"])
        self.assertIsNone(result["platform_media_id"])
        self.assertEqual(result["work_url"], "https://www.bilibili.com/video/av123/")

    def test_explicit_part_and_conflicting_capture_are_distinct(self):
        url = "https://www.bilibili.com/video/av123/?p=2"
        captured = {"id": "av123_p2", "webpage_url": url, "cid": 456, "playlist_index": 2}
        self.assertEqual(project_bilibili_identity(captured, {"source_url": url})["platform_media_id"], "456")
        with self.assertRaisesRegex(ValueError, "conflicting Bilibili part"):
            project_bilibili_identity(captured, {"source_url": url.replace("p=2", "p=3")})
        with self.assertRaisesRegex(ValueError, "no verified work page"):
            project_bilibili_identity({**captured, "webpage_url": "https://example.invalid/video/av123/"}, {})

    def test_clip_scope_and_visibility_are_not_optional(self):
        for changed in ({"visibility": "private"}, {"key": {**self.profile["key"], "input_scope": "segment"}}):
            with self.subTest(changed=changed), self.assertRaisesRegex(ValueError, "schema violation"):
                validate_profile({**self.profile, **changed})

    def test_duplicate_and_cross_media_evidence_are_rejected(self):
        self.profile["evidence"].append(self.profile["evidence"][0].copy())
        with self.assertRaisesRegex(ValueError, "duplicate evidence"):
            validate_profile(self.profile)
        self.profile["evidence"].pop()
        self.profile["source"]["observations"]["labels"][0]["evidence_ids"] = ["SA02-frames"]
        with self.assertRaisesRegex(ValueError, "cross-media evidence"):
            validate_profile(self.profile)

    def test_snapshot_text_cannot_certify_a_visual_fact(self):
        self.profile["source"]["observations"]["labels"][0]["evidence_ids"] = ["platform"]
        with self.assertRaisesRegex(ValueError, "no direct media evidence"):
            validate_profile(self.profile)

    def test_unknown_tag_and_impossible_sample_times_are_rejected(self):
        label = self.profile["source"]["observations"]["labels"][3]
        prior = label["tag_id"]
        label["tag_id"] = "visibility.unregistered"
        with self.assertRaisesRegex(ValueError, "unknown taxonomy tag"):
            validate_profile(self.profile)
        label["tag_id"] = prior
        label["extent"]["times_ms"] = [777]
        with self.assertRaisesRegex(ValueError, "unsupported observation times"):
            validate_profile(self.profile)
        label["extent"] = {"kind": "estimated_interval", "start_ms": 1000, "end_ms": 5000, "resolution_ms": 500}
        with self.assertRaisesRegex(ValueError, "invalid or unsupported label interval"):
            validate_profile(self.profile)

    def test_comparison_requires_samples_of_both_media(self):
        comparison = self.profile["renditions"][0]["comparison"]["motion"]
        comparison["evidence_ids"] = ["source-frames", "SA02-delivery"]
        with self.assertRaisesRegex(ValueError, "shared nominal sample times"):
            validate_profile(self.profile)

    def test_rendition_requires_matching_source_and_acceptance_evidence(self):
        row = self.profile["renditions"][0]
        row["source_sha256"] = "f" * 64
        with self.assertRaisesRegex(ValueError, "not bound to this source"):
            validate_profile(self.profile)
        row["source_sha256"] = self.profile["source"]["media"]["asset"]["sha256"]
        row["acceptance"]["status"] = "user_accepted_sample"
        with self.assertRaisesRegex(ValueError, "acceptance state has no review record"):
            validate_profile(self.profile)

    def test_path_and_json_admission(self):
        self.profile["evidence"][0]["artifact"]["path"] = "runs/../unsafe.json"
        with self.assertRaisesRegex(ValueError, "schema violation"):
            validate_profile(self.profile)
        for raw, message in ((b'{"field": 1, "field": 2}', "duplicate JSON key"),
                             (b'{"field": 1e999}', "non-finite"),
                             (b'{"field": NaN}', "non-finite")):
            with self.subTest(raw=raw), patch.object(Path, "open", mock_open(read_data=raw)):
                with self.assertRaisesRegex(ValueError, message):
                    load_json(Path("unused"))

    def test_profile_publication_uses_explicit_paths_only(self):
        for path in (SCHEMA, TAXONOMY, EXAMPLE, "docs/operations/motion-profile.md"):
            self.assertTrue(allowed_path(path), path)
        for path in ("runs/example-run/example-item/motion-profile-v1.json", "docs/runs/private-profile.json",
                     "media/sources/example-item/source.info.json", "outputs/example-item/attempt-01.mp4",
                     "docs/examples/real-profile.json", "docs/schemas/unreviewed-profile.json"):
            self.assertFalse(allowed_path(path), path)
