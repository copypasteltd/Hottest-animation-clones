# Hottest Animation Clones · AI Motion Transfer

Provide a Bilibili, X, or Douyin work link to obtain a video in which a project reference character performs the source motion in a standard white scene.

[English](<README.md>) · [简体中文](<README.zh-CN.md>) · [Documentation index](<docs/README.md>) · [Changelog](<docs/CHANGELOG.md>)

## From a work link to the finished video

| Step | Planned behavior |
| --- | --- |
| 1. Download | Use `/ra-video-download` for the supplied work. Probe the file and register the source and download outcome. |
| 2. Assess | Review key parts of the source performance. Decide half-body or full-body framing and single- or multi-performer replacement independently. Record visibility and key times. |
| 3. Choose the target | Match a versioned target image against the project character preset, posture, framing, and performer count. |
| 4. Transfer | Select a matching H3 workflow under `user/default/workflows/社区精选H3_人物与场景替换_实验` on the RTX 4090 ComfyUI host. Supply the source video and target image, then track the returned job ID. |
| 5. Deliver | Verify the media, target character, S02 scene, key motions, and timing before delivering the finished standard-scene motion-transfer video. |

A link is the only routine input. The project holds the preferred character and supported workflow mappings. Seated and other postures can use their own presets with either framing option. Current target images cover standing single performers in S02. Multi-performer routes need compatible targets, workflow inputs, and sample results. [Product requirements](<docs/12-项目需求梳理与实现方案总纲.md>) · [English operating guide](<docs/en/solution-and-usage.md>)

## Reference characters and S02

S02 uses a plain white background and a fine light-gray floor grid. Half-body framing uses a knee-length composition intended for torso and hand movements. Full-body framing keeps the head, feet, and ground available for assessing steps, turns, and travel. Waist-up footage can supply upper-body motion for a knee-length composition. Reviewers assess lower-body fidelity only where source evidence is available. [S02 framing rules](<docs/17-S02场景定稿与四张构图母版规范.md>)

| SA02 · 2D Asuna | BM01 · photographic blue-and-white whale-tail character |
| --- | --- |
| ![SA02 approved front anchor](<docs/images/characters/sa02-front-v1.png>) | ![BM01 locked front anchor](<docs/images/characters/bm01-front-v1.png>) |
| Chestnut hair and red-and-white knight outfit. Front anchor approved. | Blue-gray hair, blue-and-white costume, and empty hands. Associated front anchor locked. |
| ![SA02 pending four-view sheet](<docs/images/characters/sa02-four-view-candidate-v1.png>) | ![BM01 approved four-view sheet](<docs/images/characters/bm01-four-view-v1.png>) |
| Supporting four-view sheet pending confirmation. | Four-view sheet approved. |
| ![F01 SA02 knee-length view](<docs/images/characters/sa02-s02-knee-v1.png>) | ![F05 BM01 knee-length view](<docs/images/characters/bm01-s02-knee-v1.png>) |
| **F01** half-body. Previously viewed. | **F05** half-body. Visually checked, pending individual user confirmation. |
| ![F02 SA02 full-body view](<docs/images/characters/sa02-s02-full-v1.png>) | ![F06 BM01 full-body view](<docs/images/characters/bm01-s02-full-v1.png>) |
| **F02** full-body. Previously viewed. | **F06** full-body. Visually checked, pending individual user confirmation. |

Production uses the official files in the workspace's current private registries. JK03 is retired. The manifest and publication policy define the scope of the display copies. [SA02 rules](<docs/16-SA02二次元角色使用约束.md>) · [BM01 and JK03 retirement](<docs/19-BM01真实角色替换与JK03退役约束.md>) · [Illustration manifest](<docs/images/characters/manifest.json>) · [Publication policy](<docs/18-开源发布与持续同步规范.md>)

## Current progress

The project has static assets and framing references, an archived H3 sample, documentation, a run record schema, and Python maintenance tools. The historical H3 run produced a video from a source clip and one combined target-character and scene image. Sampled frames showed differences in hand shapes and timing and feet leaving the frame. The three-platform downloader integration, assessment, S02 route binding, 4090 dispatch, and delivery checks are not implemented as a production pipeline. Each route will be recorded against observed results. [Historical H3 evidence](<docs/evidence/H3基础用例公开摘要.md>) · [Planned acceptance cases](<docs/14-实施计划与验收矩阵.md>)

## Workspace and offline checks

Source media and its sidecars live in `media/sources/`, private run records in `runs/`, review notes in `docs/runs/`, and verified local videos in `outputs/`. Official character, scene, and framing assets live in `standard-assets/`. The public repo contains project documentation, an illustrative record, maintenance tools, and the eight authorized display copies above. [Workspace layout](<docs/15-项目路径结构与开源维护规范.md>)

Use Python 3.11+ and Git from the project root.

```bash
python -m pip install -e ".[dev]"
python scripts/bootstrap_workspace.py
python scripts/check_project_docs.py
python scripts/check_release.py
python -m unittest discover -s tests -v
python scripts/check_repository.py
```

Before using the official local assets, run `python scripts/check_character_lock.py`. With only the public display copies, the character lock reports missing official files and stops. See the project instructions for maintenance and publishing checks. [AGENTS.md](<AGENTS.md>)
