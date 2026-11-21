"""Inventory and link checks for the repository's public documentation."""
from pathlib import Path
import re
from urllib.parse import unquote

from check_readme_images import MANIFEST_PATH, PUBLIC_IMAGES


README_PATHS = ("README.md", "README.zh-CN.md")
REQUIREMENTS_PATH = "docs/product/requirements.md"
ACCEPTANCE_PATH = "docs/verification/acceptance.md"
SCHEMA_PATH = "docs/schemas/motion-transfer-run.schema.json"
EXAMPLE_PATH = "docs/examples/motion-transfer-run.example.json"
TOPIC_PAGES = (
    REQUIREMENTS_PATH,
    "docs/product/status.md",
    "docs/operations/runbook.md",
    "docs/operations/h3-4090.md",
    "docs/operations/run-record.md",
    "docs/operations/motion-profile.md",
    "docs/assets/reference-images.md",
    "docs/assets/sa02.md",
    "docs/assets/bm01.md",
    ACCEPTANCE_PATH,
    "docs/maintenance/workspace.md",
    "docs/maintenance/publication.md",
)
PUBLIC_MARKDOWN = (
    *README_PATHS,
    "AGENTS.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "docs/README.md",
    "docs/en/solution-and-usage.md",
    "docs/CHANGELOG.md",
    "docs/CONTRIBUTING.md",
    "docs/GOVERNANCE.md",
    "docs/SECURITY.md",
    "docs/THIRD_PARTY_NOTICES.md",
    "docs/evidence/H3基础用例公开摘要.md",
    "docs/templates/动作迁移任务与交付模板.md",
    *TOPIC_PAGES,
    "docs/12-项目需求梳理与实现方案总纲.md",
    "docs/13-动作迁移运行与交付规范.md",
    "docs/14-实施计划与验收矩阵.md",
    "docs/15-项目路径结构与开源维护规范.md",
    "docs/16-SA02二次元角色使用约束.md",
    "docs/17-S02场景定稿与四张构图母版规范.md",
    "docs/18-开源发布与持续同步规范.md",
    "docs/19-BM01真实角色替换与JK03退役约束.md",
)
PUBLIC_DOC_PATHS = frozenset((
    *PUBLIC_MARKDOWN, SCHEMA_PATH, EXAMPLE_PATH,
    "docs/schemas/motion-video-profile.schema.json", "docs/schemas/motion-tags.v1.json",
    "docs/examples/motion-video-profile.example.json",
))
PUBLIC_LINK_TARGETS = PUBLIC_DOC_PATHS | PUBLIC_IMAGES | {
    MANIFEST_PATH, "LICENSE", "configs/project.example.toml",
}

_FENCE = re.compile(r"^ {0,3}([`~])\1{2,}")
_HEADING = re.compile(r"^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$")
_ANCHOR = re.compile(r"""<a\s+(?:name|id)=["']([^"']+)["']\s*>""")
_LINK = re.compile(r"!?\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^\s)]+))\s*\)")


def read_public_markdown(root: Path) -> dict[str, str]:
    return {name: (root / name).read_text(encoding="utf-8") for name in PUBLIC_MARKDOWN}


def _document_lines(name: str, text: str) -> list[str]:
    lines = []
    fence = ""
    for line in text.splitlines():
        match = _FENCE.match(line)
        if fence:
            if match and match[0].lstrip().startswith(fence) and not line[match.end():].strip():
                fence = ""
        elif match:
            fence = match[0].lstrip()
        else:
            lines.append(line)
    if fence:
        raise ValueError(f"Unclosed code fence: {name}")
    return lines


def _anchors(lines: list[str]) -> set[str]:
    headings: set[str] = set()
    named: set[str] = set()
    for line in lines:
        named.update(_ANCHOR.findall(line))
        if match := _HEADING.match(line):
            slug = re.sub(r"[^\w -]", "", match[1].lower()).replace(" ", "-")
            if slug:
                anchor = slug
                suffix = 1
                while anchor in headings:
                    anchor = f"{slug}-{suffix}"
                    suffix += 1
                headings.add(anchor)
    return named | headings


def validate_local_links(root: Path, texts: dict[str, str], pages: tuple[str, ...] | None = None) -> int:
    """Check public inline links and Markdown anchors without fetching external URLs."""
    root = root.resolve()
    lines = {name: _document_lines(name, text) for name, text in texts.items()}
    anchors = {name: _anchors(body) for name, body in lines.items()}
    count = 0
    for source in texts if pages is None else pages:
        for angled, plain in _LINK.findall("\n".join(lines[source])):
            target = angled or plain
            if target.startswith(("https://", "http://", "mailto:")):
                continue
            relative, _, fragment = target.partition("#")
            relative = unquote(relative)
            if relative.startswith("/") or any(char in relative for char in (":", "\\", "\0")):
                raise ValueError(f"Nonportable link: {source} -> {target}")
            path = ((root / source).parent / relative).resolve() if relative else root / source
            if not path.is_relative_to(root):
                raise ValueError(f"Link leaves project: {source} -> {target}")
            name = path.relative_to(root).as_posix()
            if name not in PUBLIC_LINK_TARGETS or not path.is_file():
                raise ValueError(f"Missing or nonpublic link: {source} -> {target}")
            if fragment and name.endswith(".md") and unquote(fragment) not in anchors.get(name, set()):
                raise ValueError(f"Missing heading or anchor: {source} -> {target}")
            count += 1
    return count
