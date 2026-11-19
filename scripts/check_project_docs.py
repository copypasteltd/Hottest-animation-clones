"""Validate the public requirements, acceptance matrix, and run record offline."""
from __future__ import annotations

import copy
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
MAIN = "12-项目需求梳理与实现方案总纲.md"
CONTRACT = "13-动作迁移运行与交付规范.md"
ACCEPTANCE = "14-实施计划与验收矩阵.md"
PUBLIC_DOCS = (
    "README.md", MAIN, CONTRACT, ACCEPTANCE,
    "15-项目路径结构与开源维护规范.md", "16-SA02二次元角色使用约束.md",
    "17-S02场景定稿与四张构图母版规范.md", "18-开源发布与持续同步规范.md",
    "19-BM01真实角色替换与JK03退役约束.md", "en/solution-and-usage.md",
    "CONTRIBUTING.md", "SECURITY.md", "CHANGELOG.md", "GOVERNANCE.md",
    "THIRD_PARTY_NOTICES.md", "templates/动作迁移任务与交付模板.md",
    "evidence/H3基础用例公开摘要.md",
)
SCHEMA_PATH = DOCS / "schemas/motion-transfer-run.schema.json"
EXAMPLE_PATH = DOCS / "examples/motion-transfer-run.example.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def check_contract(schema: dict, example: dict) -> int:
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    validator.validate(example)
    require(example["record_kind"] == "illustrative_example", "Sample must be marked illustrative")

    # Exercise an executed record with synthetic identifiers and file metadata.
    # Neither fixture refers to a real file, download, or model job.
    completed = copy.deepcopy(example)
    digest = "0" * 64
    source_media = {
        "path": "media/sources/test/source.mp4", "sha256": digest, "bytes": 100,
        "duration_ms": 3000, "width": 1080, "height": 1920, "frame_rate": "24/1",
        "video_codec": "h264", "audio_codec": "aac",
    }
    completed["record_kind"] = "run"
    completed["source"].update(
        download_status="downloaded", download_method="yt-dlp",
        sidecar_path="media/sources/test/source.json", media=source_media,
    )
    completed["decision"].update(
        status="decided", core_ms={"start": 0, "end": 3000},
        framing="half_body", performers="single", performer_count=1,
        evidence_ms=[0, 1500, 2999],
    )
    completed["target"] = {
        "scene_id": "scene-s02-white-grid", "scene_revision": 1,
        "images": [{
            "image_id": "example-knee", "revision": 1, "sha256": digest,
            "path": "standard-assets/framing/example/image.png", "review_status": "viewed",
        }],
        "performer_mapping": [{
            "performer_ref": "performer-1", "character_id": "example-character",
            "image_id": "example-knee",
        }],
    }
    completed["workflow"] = {
        "path": "user/default/workflows/社区精选H3_人物与场景替换_实验/example.json",
        "sha256": digest, "active_branch": "example",
        "input_mapping": {"motion_video": "video", "target_images": ["image"], "scene": None, "audio": None},
        "output_mapping": "video-output",
    }
    completed["execution"].update(
        status="completed", reason=None, receipt_id="example-receipt",
        inputs_manifest_path="runs/example/input.json",
    )
    completed["output"] = {
        "media": {**source_media, "path": "outputs/example/result.mp4", "audio_codec": None},
        "audio_treatment": "silent", "warnings": [],
    }
    completed["review"].update(status="passed", evidence_paths=["docs/runs/example/review.md"])
    validator.validate(completed)

    cases = (
        (example, "false review in sample", ("review", "status"), "passed"),
        (example, "false receipt in sample", ("execution", "receipt_id"), "synthetic-id"),
        (example, "unsupported platform", ("source", "platform"), "other"),
        (example, "unknown field", ("unknown_field",), True),
        (completed, "missing source sidecar", ("source", "sidecar_path"), None),
        (completed, "missing review evidence", ("review", "evidence_paths"), []),
        (completed, "missing source observations", ("decision", "evidence_ms"), []),
        (completed, "wrong multi-performer count", ("decision", "performers"), "multiple"),
        (completed, "workflow outside required folder", ("workflow", "path"), "other/flow.json"),
        (completed, "escaping workflow path", ("workflow", "path"), "user/default/workflows/社区精选H3_人物与场景替换_实验/../flow.json"),
        (completed, "missing input mapping", ("workflow", "input_mapping", "target_images"), []),
        (completed, "missing receipt", ("execution", "receipt_id"), None),
        (completed, "missing submitted input record", ("execution", "inputs_manifest_path"), None),
        (completed, "completed without media", ("output",), None),
        (completed, "absolute output path", ("output", "media", "path"), "C:/outside/result.mp4"),
        (completed, "silent record with audio stream", ("output", "media", "audio_codec"), "aac"),
    )
    for original, label, path, value in cases:
        record = copy.deepcopy(original)
        field = record
        for key in path[:-1]:
            field = field[key]
        field[path[-1]] = value
        require(not validator.is_valid(record), f"Invalid record accepted: {label}")
    return len(cases)


def validate() -> dict:
    texts = {name: (DOCS / name).read_text(encoding="utf-8") for name in PUBLIC_DOCS}
    requirements = re.findall(r"^\| (R-\d{2}) \|", texts[MAIN], re.M)
    require(requirements == [f"R-{number:02d}" for number in range(1, 6)], "Expected R-01..05")
    cases = re.findall(r"^\| (TC-\d{2}) \| ([^|]+) \|", texts[ACCEPTANCE], re.M)
    require([number for number, _ in cases] == [f"TC-{number:02d}" for number in range(1, 11)], "Expected TC-01..10")
    covered: set[str] = set()
    for case, raw_refs in cases:
        refs = {ref.strip() for ref in raw_refs.split(",")}
        require(refs <= set(requirements), f"Unknown requirement in {case}")
        covered.update(refs)
    require(covered == set(requirements), "Uncovered requirements")

    link_count = 0
    for name, text in texts.items():
        require(text.count("```") % 2 == 0, f"Unbalanced code fence: {name}")
        for match in re.finditer(r"!?\[[^\]\n]*\]\(([^)\n]+)\)", text):
            target = match[1].strip().strip("<>")
            if target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            relative = unquote(target.split("#", 1)[0])
            require(not re.match(r"^[A-Za-z]:", relative), f"Machine-specific link: {name}")
            path = ((DOCS / name).parent / relative).resolve()
            require(path.is_relative_to(ROOT.resolve()) and path.is_file(), f"Missing local link: {name} -> {target}")
            link_count += 1
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    example = json.loads(EXAMPLE_PATH.read_text(encoding="utf-8"))
    return {
        "status": "passed", "scope": "public_document_and_schema_checks",
        "requirements": len(requirements), "planned_acceptance_cases": len(cases),
        "schema_negative_checks": check_contract(schema, example), "local_links_checked": link_count,
    }


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(validate(), ensure_ascii=False, indent=2))
