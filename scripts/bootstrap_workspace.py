"""Create ignored local data directories beneath a chosen project root.

No model download, credential setup, network call or inference is performed.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

DIRECTORIES = (
    "media/sources", "catalog", "standard-assets/characters",
    "standard-assets/scenes", "standard-assets/framing", "assets",
    "workflows", "models", "runs", "indexes", "exports", "outputs", ".local",
)


def bootstrap(root: Path) -> list[str]:
    root = root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError("Project root must be an existing directory")
    created = []
    for relative in DIRECTORIES:
        target = root / relative
        if not target.resolve().is_relative_to(root):
            raise ValueError(f"Directory points outside project: {relative}")
        target.mkdir(parents=True, exist_ok=True)
        created.append(relative)
    return created


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    arguments = parser.parse_args()
    print(json.dumps({"workspace_directories": bootstrap(arguments.root)}, indent=2))
