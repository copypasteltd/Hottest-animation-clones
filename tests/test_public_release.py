from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import sys
from threading import Thread
import unittest
from urllib.error import HTTPError
from urllib.request import build_opener, ProxyHandler

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from check_release import validate
from check_repository import PUBLIC_MEDIA, allowed_path
from serve_demo import DEMO, DemoHandler


class QuietDemoHandler(DemoHandler):
    def log_message(self, format, *args):
        pass


class PublicReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietDemoHandler, directory=str(DEMO)))
        cls.worker = Thread(target=cls.server.serve_forever, daemon=True)
        cls.worker.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"
        cls.client = build_opener(ProxyHandler({}))

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.worker.join(timeout=2)

    def test_bilingual_readmes_and_capture_integrity(self):
        result = validate()
        self.assertEqual(result["readme_languages"], 2)
        self.assertEqual(result["public_capture_files"], 5)

    def test_exact_capture_allowlist_does_not_open_private_media(self):
        for name in PUBLIC_MEDIA:
            self.assertTrue(allowed_path(name))
        for name in ["docs/assets/private.png", "docs/assets/source-video.mp4", "docs/demo/private.mp4", "docs/assets/other.gif", "standard-assets/characters/private.png"]:
            self.assertFalse(allowed_path(name), name)
        self.assertTrue(allowed_path("README.md"))
        self.assertTrue(allowed_path("README.zh-CN.md"))
        self.assertTrue(allowed_path("AGENTS.md"))

    def test_static_server_only_exposes_fixed_demo_files(self):
        for name in ("/", "/styles.css", "/app.js"):
            with self.subTest(path=name), self.client.open(self.base + name, timeout=3) as response:
                self.assertEqual(response.status, 200)
                self.assertEqual(response.headers["Cache-Control"], "no-store")
        for name in ("/../standard-assets/private.png", "/%2e%2e/AGENTS.md", "/private.txt", "/README.md"):
            with self.subTest(path=name), self.assertRaises(HTTPError) as error:
                self.client.open(self.base + name, timeout=3)
            self.assertEqual(error.exception.code, 404)

    def test_root_and_explicit_index_reject_linked_final_leaf(self):
        with TemporaryDirectory(prefix=".local-test-demo-", dir=ROOT) as temporary:
            fixture = Path(temporary) / "public"
            fixture.mkdir()
            outside = Path(temporary) / "outside.txt"
            outside.write_text("synthetic outside marker", encoding="utf-8")
            index = fixture / "index.html"
            index.write_text("synthetic public page", encoding="utf-8")
            server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietDemoHandler, directory=str(fixture)))
            worker = Thread(target=server.serve_forever, daemon=True)
            worker.start()
            base = f"http://127.0.0.1:{server.server_port}"
            try:
                for name in ("/", "/index.html"):
                    with self.client.open(base + name, timeout=3) as response:
                        self.assertEqual(response.status, 200)
                # A deterministic synthetic link-resolution fixture works on
                # Windows without requiring permission to create OS symlinks.
                original_resolve = Path.resolve
                def linked_resolve(path, *args, **kwargs):
                    if path == index:
                        return outside
                    return original_resolve(path, *args, **kwargs)
                with patch.object(Path, "resolve", linked_resolve):
                    for name in ("/", "/index.html"):
                        with self.subTest(path=name), self.assertRaises(HTTPError) as error:
                            self.client.open(base + name, timeout=3)
                        self.assertEqual(error.exception.code, 404)
            finally:
                server.shutdown()
                server.server_close()
                worker.join(timeout=2)

    def test_static_server_has_no_upload_handler(self):
        with self.assertRaises(HTTPError) as error:
            self.client.open(self.base + "/", data=b"not-a-real-upload", timeout=3)
        self.assertEqual(error.exception.code, 501)


if __name__ == "__main__":
    unittest.main()
