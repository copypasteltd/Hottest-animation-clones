"""Validate distributable v0.3 requirements without private media or reports.

This script performs document/schema checks only; it never runs inference,
contacts a service, reads historical device logs, or writes generated reports.
"""
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
PREFIXES = ("STD", "SRC", "ACT", "POSE", "VIS", "DUAL", "LIB", "USE", "OPS")
MAIN = "12-项目需求梳理与实现方案总纲.md"
CONTRACT = "13-双库数据契约与Skill执行规范.md"
ACCEPTANCE = "14-实施计划与验收矩阵.md"
PUBLIC_DOCS = (
    "README.md", MAIN, CONTRACT, ACCEPTANCE,
    "15-项目路径结构与开源维护规范.md",
    "CONTRIBUTING.md", "SECURITY.md", "CHANGELOG.md", "GOVERNANCE.md",
    "THIRD_PARTY_NOTICES.md", "templates/动作采集与入库模板.md",
    "evidence/H3基础用例公开摘要.md",
)
SCHEMA_PATH = DOCS / "schemas/dual-library-record.schema.json"
EXAMPLE_PATH = DOCS / "examples/dual-library-record.example.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def check_contract(schema: dict, example: dict) -> int:
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    validator.validate(example)
    require(example["record_kind"] == "illustrative_example", "Example must remain illustrative")
    require(example["execution"]["state"] == "not_run", "Example must not claim execution")
    require(not example["semantic"]["observed_events"], "Example has no real observations")
    require(example["semantic"]["independent_origin_count"] == 0, "No source consensus exists")
    for review in example["reviews"].values():
        require(review["status"] == "not_run", "Example reviews must remain unperformed")
    occurrence = example["occurrence"]["ref"]
    require(example["source_pose"]["source_occurrence_ref"] == occurrence, "Pose parent mismatch")
    require(example["canonical_visual"]["source_occurrence_ref"] == occurrence, "Visual parent mismatch")
    require(example["canonical_visual"]["eventset_ref"] == example["semantic"]["eventset_ref"], "Event revision mismatch")
    require(example["alignment"]["visual_ref"] == example["canonical_visual"]["ref"], "Alignment parent mismatch")
    start, end = example["occurrence"]["core_range_us"]
    before, after = example["occurrence"]["context_range_us"]
    require(0 <= before <= start < end <= after, "Invalid example ranges")

    def reject(name: str, mutation) -> None:
        invalid = copy.deepcopy(example)
        mutation(invalid)
        require(not validator.is_valid(invalid), f"Invalid record accepted: {name}")

    reject("generated source pose", lambda r: r["source_pose"].update(origin_kind="generated"))
    reject("source pose with generated parent", lambda r: r["source_pose"].update(generated_from_visual={"id": "fake", "revision": 1}))
    reject("required review bypass", lambda r: r["reviews"]["hand_pose"].update(status="not_applicable"))
    reject("false approval", lambda r: r["reviews"]["visual"].update(status="passed"))
    reject("fabricated BPM", lambda r: r["semantic"].update(measured_bpm=120))
    reject("false present artifact", lambda r: r["canonical_visual"]["output"].update(state="present"))
    reject("unknown field", lambda r: r.update(pretend_already_generated=True))
    reject("negative time", lambda r: r["occurrence"].update(core_range_us=[-1, 1]))
    reject("invalid revision", lambda r: r["action_ref"].update(revision=0))

    def generated_without_parent(record):
        record["generated_pose_check"] = copy.deepcopy(record["source_pose"])
        record["generated_pose_check"]["origin_kind"] = "generated"
    reject("generated pose missing parent", generated_without_parent)
    return 10


def validate() -> dict:
    texts = {name: (DOCS / name).read_text(encoding="utf-8") for name in PUBLIC_DOCS}
    prefix = "(?:" + "|".join(PREFIXES) + ")"
    requirements = re.findall(r"^\| (" + prefix + r"-\d{2}) \| P[012] \|", texts[MAIN], re.M)
    require(len(requirements) == len(set(requirements)) == 46, "Expected 46 unique requirements")
    for name in PREFIXES:
        group = [item for item in requirements if item.startswith(name + "-")]
        require(group == [f"{name}-{i:02d}" for i in range(1, len(group) + 1)], f"Nonsequential {name}")
    cases = re.findall(r"^\| (TC-\d{2}) \| ([^|]+) \|", texts[ACCEPTANCE], re.M)
    require([case[0] for case in cases] == [f"TC-{i:02d}" for i in range(1, 30)], "Expected TC-01..29")
    covered: set[str] = set()
    for case, references in cases:
        refs = set(re.findall(prefix + r"-\d{2}", references))
        require(bool(refs) and refs <= set(requirements), f"Unknown requirement in {case}")
        covered |= refs
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
    negatives = check_contract(schema, example)
    return {"status": "passed", "scope": "public_document_consistency_not_product_testing", "requirements": len(requirements), "planned_acceptance_cases": len(cases), "schema_negative_checks": negatives, "local_links_checked": link_count}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(validate(), ensure_ascii=False, indent=2))
