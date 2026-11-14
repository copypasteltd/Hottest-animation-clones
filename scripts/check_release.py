"""Check public bilingual documentation offline, without any frontend or media.

Does not run models, contact GitHub, serve pages, or read private assets.
"""
from __future__ import annotations

from pathlib import Path
import json
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
MARKDOWN_PATHS = (
    "README.md", "README.zh-CN.md", "AGENTS.md", "docs/README.md",
    "docs/18-开源发布与持续同步规范.md", "docs/en/solution-and-usage.md",
    "docs/CONTRIBUTING.md", "docs/GOVERNANCE.md",
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def local_target(path: Path, target: str) -> Path | None:
    if target.startswith(("http://", "https://", "mailto:", "#")):
        return None
    relative = unquote(target.strip("<>").split("#", 1)[0])
    require(not re.match(r"^[A-Za-z]:", relative), "Machine-specific public link")
    resolved = (path.parent / relative).resolve()
    require(resolved.is_relative_to(ROOT.resolve()) and resolved.is_file(), f"Missing public link: {path.name} -> {target}")
    return resolved


def validate(root: Path = ROOT) -> dict:
    require(root.resolve() == ROOT.resolve(), "Release validation is scoped to its checkout")
    links = 0
    texts = {}
    for relative in MARKDOWN_PATHS:
        path = ROOT / relative
        text = path.read_text(encoding="utf-8")
        texts[relative] = text
        require(text.count("```") % 2 == 0, f"Unbalanced fence: {relative}")
        for target in re.findall(r"!?\[[^\]\n]*\]\(([^)\n]+)\)", text):
            local_target(path, target.strip())
            links += 1
    for name in ("README.md", "README.zh-CN.md"):
        for required in ("scripts/check_release.py", "scripts/check_character_lock.py", "docs/CHANGELOG.md", "README.zh-CN.md", "README.md"):
            require(required in texts[name], f"Bilingual entry missing {required}: {name}")
    require("not implemented" in texts["README.md"] and "仍待实现" in texts["README.zh-CN.md"], "Implementation limits must remain explicit")
    require("git@github.com:copypasteltd/Hottest-animation-clones.git" in texts["AGENTS.md"], "Synchronization destination missing")
    require("Do not create a frontend without an explicit user instruction" in texts["AGENTS.md"], "Explicit frontend scope boundary missing")
    require("未经用户明确指示" in texts["AGENTS.md"], "Chinese frontend scope boundary missing")
    return {"status": "passed", "scope": "public_bilingual_documentation_consistency_not_inference_quality", "readme_languages": 2, "markdown_links_checked": links}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(validate(), ensure_ascii=False, indent=2))
