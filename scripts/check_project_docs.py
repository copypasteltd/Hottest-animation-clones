"""Validate the public requirements, acceptance matrix, and run record offline."""
from __future__ import annotations

import copy
import json
from pathlib import Path
import re
import sys

from jsonschema import Draft202012Validator

from check_motion_profiles import EXAMPLE as PROFILE_EXAMPLE, load_json, validate_profile
from documentation import ACCEPTANCE_PATH, EXAMPLE_PATH, REQUIREMENTS_PATH, SCHEMA_PATH, read_public_markdown, validate_local_links

ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def check_contract(schema: dict, example: dict) -> int:
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    validator.validate(example)
    require(example["record_kind"] == "illustrative_example", "Sample must be marked illustrative")

    # Use a fictional source and two fictional retrievals for the same whole video.
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
        status="decided", framing="half_body", performers="single", performer_count=1,
        visible_parts=["upper_body", "hands"],
    )
    completed["target"] = {
        "scene_id": "scene-s02-white-grid", "scene_revision": 1,
        "images": [{
            "image_id": "example-knee", "revision": 1, "sha256": digest,
            "path": "standard-assets/framing/example/image.png",
        }],
        "performer_mapping": [{
            "performer_ref": "performer-1", "character_id": "example-character",
            "image_id": "example-knee",
        }],
    }
    completed["workflow"] = {
        "original_path": "user/default/workflows/社区精选H3_人物与场景替换_实验/example.json",
        "original_sha256": digest, "active_branch": "example",
        "execution_graph": {
            "kind": "copy", "path_base": "project", "path": "workflows/example/sa02.json", "sha256": "1" * 64,
        },
        "input_mapping": {"motion_video": "video", "target_images": ["image"], "scene": None, "audio": None},
        "output_mapping": "video-output",
    }
    completed["execution"].update(
        status="completed", reason=None, receipt_id="example-receipt",
        inputs_manifest_path="runs/example/input.json",
    )
    completed["output"] = {
        "path": "outputs/example-run-001/example-item-001/SA02/example-attempt-001.mp4",
        "audio_treatment": "silent", "warnings": [],
    }
    validator.validate(completed)

    second = copy.deepcopy(completed)
    second["variant"] = "BM01"
    second["target"]["images"][0].update(image_id="example-bm01-knee", sha256="2" * 64)
    second["target"]["performer_mapping"][0].update(
        character_id="example-bm01", image_id="example-bm01-knee",
    )
    second["workflow"]["execution_graph"].update(
        kind="api", path="workflows/example/bm01.api.json", sha256="3" * 64,
    )
    second["execution"].update(
        attempt_id="example-attempt-002", receipt_id="example-receipt-002",
        inputs_manifest_path="runs/example/bm01-input.json",
    )
    second["output"].update(
        path="outputs/example-run-001/example-item-001/BM01/example-attempt-002.mp4",
        audio_treatment="unknown",
    )
    validator.validate(second)

    queued = copy.deepcopy(completed)
    queued["execution"]["status"] = "queued"
    queued["output"] = None
    validator.validate(queued)

    cancelled = copy.deepcopy(queued)
    cancelled["execution"].update(status="cancelled", reason="Example queued task cancelled")
    validator.validate(cancelled)

    stopped_before_submission = copy.deepcopy(example)
    stopped_before_submission["record_kind"] = "run"
    stopped_before_submission["execution"].update(
        status="cancelled", reason="Example batch stopped before submission",
    )
    validator.validate(stopped_before_submission)

    cases = (
        (queued, "queued without receipt", ("execution", "receipt_id"), None),
        (queued, "queued with retrieved output", ("output",), completed["output"]),
        (cancelled, "cancelled without reason", ("execution", "reason"), None),
        (example, "unsupported default variant", ("variant",), "other"),
        (completed, "partial source scope", ("input_scope",), "clip"),
        (example, "false receipt in sample", ("execution", "receipt_id"), "synthetic-id"),
        (example, "unsupported platform", ("source", "platform"), "other"),
        (example, "unknown field", ("unknown_field",), True),
        (completed, "missing source sidecar", ("source", "sidecar_path"), None),
        (completed, "legacy review field", ("review",), {"status": "passed"}),
        (completed, "manual source interval", ("decision", "core_ms"), {"start": 0, "end": 1}),
        (completed, "manual action timestamps", ("decision", "evidence_ms"), [0]),
        (completed, "wrong multi-performer count", ("decision", "performers"), "multiple"),
        (completed, "original workflow outside required folder", ("workflow", "original_path"), "other/flow.json"),
        (completed, "escaping original workflow path", ("workflow", "original_path"), "user/default/workflows/社区精选H3_人物与场景替换_实验/../flow.json"),
        (completed, "escaping execution graph path", ("workflow", "execution_graph", "path"), "../flow.json"),
        (completed, "missing input mapping", ("workflow", "input_mapping", "target_images"), []),
        (completed, "missing receipt", ("execution", "receipt_id"), None),
        (completed, "missing submitted input record", ("execution", "inputs_manifest_path"), None),
        (completed, "completed before retrieval", ("output",), None),
        (completed, "absolute output path", ("output", "path"), "C:/outside/result.mp4"),
        (completed, "output outside delivery directory", ("output", "path"), "runs/example/result.mp4"),
        (completed, "non-MP4 output", ("output", "path"), "outputs/example/result.txt"),
        (completed, "undetermined route after submission", ("decision", "status"), "undetermined"),
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
    texts = read_public_markdown(ROOT)
    requirements = re.findall(r"^\| (R-\d{2}) \|", texts[REQUIREMENTS_PATH], re.M)
    require(requirements == [f"R-{number:02d}" for number in range(1, 6)], "Expected R-01..05")
    cases = re.findall(r"^\| (TC-\d{2}) \| ([^|]+) \|", texts[ACCEPTANCE_PATH], re.M)
    require([number for number, _ in cases] == [f"TC-{number:02d}" for number in range(1, 11)], "Expected TC-01..10")
    covered: set[str] = set()
    for case, raw_refs in cases:
        refs = {ref.strip() for ref in raw_refs.split(",")}
        require(refs <= set(requirements), f"Unknown requirement in {case}")
        covered.update(refs)
    require(covered == set(requirements), "Uncovered requirements")

    link_count = validate_local_links(ROOT, texts)
    schema = json.loads((ROOT / SCHEMA_PATH).read_text(encoding="utf-8"))
    example = json.loads((ROOT / EXAMPLE_PATH).read_text(encoding="utf-8"))
    return {
        "status": "passed", "scope": "public_document_and_schema_checks",
        "requirements": len(requirements), "planned_acceptance_cases": len(cases),
        "schema_negative_checks": check_contract(schema, example), "local_links_checked": link_count,
        "public_markdown_pages": len(texts),
        "illustrative_profile_checked": validate_profile(load_json(ROOT / PROFILE_EXAMPLE))["status"] == "passed",
    }


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(validate(), ensure_ascii=False, indent=2))
