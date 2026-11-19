"""Check bilingual publication entry points and the eight public character images."""
from pathlib import Path
import json
import sys

from check_readme_images import validate as validate_readme_images
from documentation import README_PATHS, read_public_markdown, validate_local_links


ROOT = Path(__file__).resolve().parents[1]
RELEASE_PAGES = (*README_PATHS, "AGENTS.md", "docs/README.md", "docs/en/solution-and-usage.md")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def validate(root: Path = ROOT) -> dict:
    require(root.resolve() == ROOT.resolve(), "Release validation is scoped to its checkout")
    texts = read_public_markdown(root)
    links = validate_local_links(root, texts, RELEASE_PAGES)
    for name in README_PATHS:
        for required in (*README_PATHS, "scripts/check_release.py", "scripts/check_character_lock.py", "docs/CHANGELOG.md", "docs/product/status.md"):
            require(required in texts[name], f"Bilingual entry missing {required}: {name}")
    require("pending implementation" in texts["README.md"] and "仍待实现" in texts["README.zh-CN.md"], "Implementation status missing")
    require("git@github.com:copypasteltd/Hottest-animation-clones.git" in texts["AGENTS.md"], "Synchronization destination missing")
    require("Do not create a frontend without an explicit user instruction" in texts["AGENTS.md"], "Explicit frontend scope boundary missing")
    require("未经用户明确指示" in texts["AGENTS.md"], "Chinese frontend scope boundary missing")
    images = validate_readme_images(root)
    return {
        "status": "passed", "scope": "public_bilingual_documentation_and_image_identity",
        "readme_languages": len(README_PATHS), "markdown_links_checked": links,
        "public_character_images": images["public_character_images"],
    }


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(validate(), ensure_ascii=False, indent=2))
