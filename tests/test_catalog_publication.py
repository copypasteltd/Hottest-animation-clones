"""Publish catalog sources, not preview builds, private data or media."""
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from check_repository import CATALOG_SOURCE_PATHS, allowed_path


class CatalogPublicationTests(unittest.TestCase):
    def test_catalog_source_allowlists_agree(self):
        found = {line.removeprefix("!/") for line in (ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()
                 if line.startswith("!/web/catalog/") and not line.endswith("/")}
        self.assertEqual(found, CATALOG_SOURCE_PATHS)
        self.assertTrue({"web/catalog/src/main.tsx", "web/catalog/package-lock.json",
                         "web/catalog/scripts/build.mjs", "web/catalog/tests/browser.mjs"} <= found)
        self.assertTrue(all(allowed_path(name) for name in found))

    def test_generated_and_unreviewed_files_are_not_public(self):
        for name in ("web/catalog/dist/index.html", "web/catalog/dist-pages/index.html",
                     "web/catalog/src/extra.ts", "web/catalog/public/data/catalog-meta.json",
                     "web/catalog/public/clip.mp4", "web/catalog/.env",
                     "tmp/motion-catalog-v1/local/index.html", "runs/private/motion-profile-v1.json",
                     "docs/demo/index.html"):
            self.assertFalse(allowed_path(name), name)
