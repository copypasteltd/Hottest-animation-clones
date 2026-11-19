from pathlib import Path
import sys
import tomllib
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "src"))

from check_project_docs import validate
from check_release import validate as validate_release
from check_repository import allowed_path, scan_text
from bootstrap_workspace import DIRECTORIES
from ai_motion_library import __version__


class FoundationTests(unittest.TestCase):
    def test_distributable_requirements_and_schema(self):
        result = validate()
        self.assertEqual(result["requirements"], 5)
        self.assertEqual(result["planned_acceptance_cases"], 10)
        self.assertEqual(result["schema_negative_checks"], 16)

    def test_bilingual_docs_keep_explicit_frontend_scope_boundary(self):
        result = validate_release()
        self.assertEqual(result["status"], "passed")
        self.assertEqual(result["readme_languages"], 2)

    def test_package_version(self):
        metadata = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
        self.assertEqual(metadata["project"]["version"], __version__)

    def test_portable_config_disables_external_actions(self):
        config = tomllib.loads((ROOT / "configs/project.example.toml").read_text(encoding="utf-8"))
        self.assertEqual(config["project"]["root"], ".")
        self.assertFalse(config["execution"]["allow_network"])
        self.assertFalse(config["execution"]["allow_remote_generation"])
        self.assertFalse(config["execution"]["allow_model_download"])
        self.assertEqual(config["source"]["downloader"], "ra-video-download")
        self.assertEqual(config["source"]["platforms"], ["bilibili", "x", "douyin"])
        self.assertEqual(
            config["workflow"]["workflow_directory"],
            "user/default/workflows/社区精选H3_人物与场景替换_实验",
        )
        for relative in config["paths"].values():
            self.assertFalse(Path(relative).is_absolute())
            self.assertNotIn("..", Path(relative).parts)

    def test_public_source_boundary(self):
        for path in ["pyproject.toml", "src/ai_motion_library/__init__.py", "docs/schemas/motion-transfer-run.schema.json", "configs/project.example.toml"]:
            self.assertTrue(allowed_path(path), path)
        for path in ["runs/private.json", "outputs/demo.mp4", "tooling/remote.py", "docs/runs/private.md", "configs/project.local.toml", "docs/examples/private.json", "docs/templates/private.png", "docs/demo/index.html", "docs/demo/app.js", "docs/demo/styles.css", "docs/assets/workbench-zh.png", "docs/assets/workbench-tour.gif", "docs/assets/capture-manifest.json"]:
            self.assertFalse(allowed_path(path), path)

    def test_public_run_contract_excludes_local_archives(self):
        self.assertTrue(allowed_path("docs/examples/motion-transfer-run.example.json"))
        self.assertTrue(allowed_path("docs/templates/动作迁移任务与交付模板.md"))
        for path in (
            "docs/archive/v0.3/README.md",
            "docs/local/4090工作流定位.md",
            "docs/examples/dual-library-record.example.json",
            "docs/schemas/dual-library-record.schema.json",
            "docs/schemas/unreviewed.json",
            "docs/templates/动作采集与入库模板.md",
        ):
            self.assertFalse(allowed_path(path), path)

    def test_credential_guard_detects_synthetic_value(self):
        synthetic = "Bearer " + "Z" * 32
        self.assertIn("bearer_value", scan_text(synthetic))

    def test_guard_allows_env_variable_reference(self):
        self.assertEqual(scan_text('remote_token_env = "AI_MOTION_REMOTE_TOKEN"'), [])

    def test_data_directories_are_relative(self):
        for name in DIRECTORIES:
            self.assertFalse(Path(name).is_absolute())
            self.assertNotIn("..", Path(name).parts)


if __name__ == "__main__":
    unittest.main()
