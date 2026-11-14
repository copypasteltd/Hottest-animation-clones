"""Check public bilingual docs, demo assets and real-capture provenance offline.

Does not run models, contact GitHub, or validate private media quality.
"""
from __future__ import annotations

import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
MEDIA_NAMES = {"workbench-zh.png", "workbench-en.png", "workbench-mobile.png", "workbench-tour.mp4", "workbench-tour.gif"}
MARKDOWN_PATHS = (
    "README.md", "README.zh-CN.md", "AGENTS.md", "docs/README.md",
    "docs/18-开源发布与持续同步规范.md", "docs/en/solution-and-usage.md",
    "docs/assets/README.md", "docs/CONTRIBUTING.md", "docs/GOVERNANCE.md",
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


class DemoLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        for key in ("href", "src"):
            if key in attributes:
                self.links.append(attributes[key])
        if "id" in attributes:
            self.ids.add(attributes["id"])


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
        text = texts[name]
        for required in ("scripts/serve_demo.py", "scripts/check_release.py", "scripts/check_character_lock.py", "workbench-tour.gif", "workbench-tour.mp4", "docs/CHANGELOG.md", "README.zh-CN.md", "README.md"):
            require(required in text, f"Bilingual entry missing {required}: {name}")
    require("not implemented" in texts["README.md"] and "仍待实现" in texts["README.zh-CN.md"], "Implementation limits must be explicit")
    require("git@github.com:copypasteltd/Hottest-animation-clones.git" in texts["AGENTS.md"], "Standing synchronization destination missing")
    html_path = ROOT / "docs/demo/index.html"
    page = html_path.read_text(encoding="utf-8")
    parser = DemoLinks()
    parser.feed(page)
    for target in parser.links:
        if target.startswith("#"):
            require(target[1:] in parser.ids, f"Unknown demo section: {target}")
        else:
            local_target(html_path, target)
    require({"search", "scope-filter", "play", "timeline", "download", "tour", "lang-zh", "lang-en"} <= parser.ids, "Demo controls missing")
    app = (ROOT / "docs/demo/app.js").read_text(encoding="utf-8")
    require("fetch(" not in app and "XMLHttpRequest" not in app and "WebSocket" not in app, "Synthetic demo must not call inference or data services")
    require("synthetic_documentation_example" in app and "not_inference_result:true" in app, "Export must retain synthetic-data provenance")
    manifest = json.loads((ROOT / "docs/assets/capture-manifest.json").read_text(encoding="utf-8"))
    require(manifest["inference_result"] is False and manifest["private_media_included"] is False, "Capture scope changed")
    require(manifest["source_completeness"] == "complete" and manifest["source_stop_reason"] == "duration_limit", "Capture completion must be reported accurately")
    files = manifest["files"]
    require({Path(item["path"]).name for item in files} == MEDIA_NAMES and len(files) == len(MEDIA_NAMES), "Unexpected public media inventory")
    for item in files:
        path = ROOT / item["path"]
        require(path.parent == ROOT / "docs/assets", "Capture must stay in precise public directory")
        raw = path.read_bytes()
        require(len(raw) == item["bytes"] and hashlib.sha256(raw).hexdigest() == item["sha256"], f"Capture changed without provenance update: {path.name}")
        require(0 < len(raw) <= 12_000_000, "Capture size outside source policy")
        if path.suffix == ".png":
            require(raw.startswith(b"\x89PNG\r\n\x1a\n"), "Invalid PNG capture")
        elif path.suffix == ".gif":
            require(raw[:6] in {b"GIF89a", b"GIF87a"}, "Invalid GIF capture")
        else:
            require(raw[4:8] == b"ftyp", "Invalid MP4 capture")
    for name, expected_hash in manifest["page_source_hashes"].items():
        require(hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == expected_hash, "Demo changed after capture; update captures/provenance")
    require(sum(s["codec_type"] == "video" for s in manifest["video_probe_summary"]) == 1, "Expected one video stream")
    return {"status": "passed", "scope": "public_docs_demo_and_capture_provenance_not_inference_quality", "readme_languages": 2, "markdown_links_checked": links, "public_capture_files": len(files), "demo_external_data_calls": 0}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(validate(), ensure_ascii=False, indent=2))
