"""Public documentation illustrations: exact identity and inline visibility."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import check_readme_images as images
from check_repository import allowed_path


class ReadmeImageTests(unittest.TestCase):
    def manifest(self):
        return json.loads((ROOT / images.MANIFEST_PATH).read_text(encoding="utf-8"))

    def test_all_eight_public_images_and_both_readmes_pass(self):
        result = images.validate()
        self.assertEqual(result["public_character_images"], 8)
        self.assertEqual(result["readme_languages_with_images"], 2)

    def test_public_exception_is_exact_not_a_directory(self):
        for name in images.PUBLIC_IMAGES.union({images.MANIFEST_PATH}):
            self.assertTrue(allowed_path(name), name)
        for name in ("docs/images/characters/private.png", "docs/images/characters/reference-1.png", "docs/images/characters/jk03-front.png", "docs/images/characters/extra.json", "docs/images/characters/index.html", "docs/images/private.png", "media/references/reference-1.png", "standard-assets/characters/char-blue-maid-bm01/v1/four-view.png", "docs/demo/index.html"):
            self.assertFalse(allowed_path(name), name)

    def test_manifest_extra_missing_duplicate_paths_fail(self):
        for mutation in ("extra", "missing", "duplicate"):
            with self.subTest(mutation=mutation):
                manifest = self.manifest()
                if mutation == "extra":
                    manifest["files"].append({**manifest["files"][0], "path": "docs/images/characters/extra.png"})
                elif mutation == "missing":
                    manifest["files"].pop()
                else:
                    manifest["files"][1] = copy.deepcopy(manifest["files"][0])
                with self.assertRaises(ValueError):
                    images.validate_manifest(manifest)

    def test_candidate_cannot_be_promoted_by_image_publication(self):
        manifest = self.manifest()
        item = next(x for x in manifest["files"] if "four-view-candidate" in x["path"])
        item["status"] = "user_approved"
        with self.assertRaisesRegex(ValueError, "approval label changed"):
            images.validate_manifest(manifest)

    def test_changed_image_bytes_fail(self):
        entries = images.validate_manifest(self.manifest())
        name = sorted(images.PUBLIC_IMAGES)[0]
        raw = (ROOT / name).read_bytes()
        altered = raw[:-1] + bytes([raw[-1] ^ 1])
        with self.assertRaisesRegex(ValueError, "bytes/hash changed"):
            images.validate_payload(name, altered, entries[name])

    def test_download_link_does_not_count_as_inline_image(self):
        name = sorted(images.PUBLIC_IMAGES)[0]
        self.assertEqual(images.readme_images(f"[download](<{name}>)"), set())
        self.assertEqual(images.readme_images(f"![visible reference](<{name}>)"), {name})


if __name__ == "__main__":
    unittest.main()
