# Hottest Animation Clones · AI Motion Transfer

Supply a Bilibili, X, or Douyin video link in the conversation. The project is designed to deliver two S02 motion-transfer MP4s from the same whole video. Single-performer videos use SA02 and BM01 separately. Two-performer videos use both characters and exchange their assignments between outputs.

[English](<README.md>) · [简体中文](<README.zh-CN.md>) · [Documentation index](<docs/README.md>) · [Changelog](<docs/CHANGELOG.md>)

## From a work link to the finished video

Use `/ra-video-download` to obtain the complete source video, select framing and performer bindings, and submit both full-video inputs to the designated ComfyUI queue. The source guides motion and framing. For a standing single performer in S02, the approved [contour-guided redraw](<docs/operations/h3-4090.md#s02-contour-redraw>) keeps source RGB out of the generation references. Start a new numbered batch for each message containing work links unless the customer requests an append. Queue matching variants in groups of two. Report each result and deliver its MP4 upon retrieval while the batch is active. [Batch handling](<docs/operations/h3-4090.md#queue-and-stop>) · [Product requirements](<docs/product/requirements.md>) · [English operating guide](<docs/en/solution-and-usage.md>)

A two-source Bilibili trial retrieved both SA02 and BM01 for the standing half-body and full-body routes. The trial covered source download or reuse, grouped queue submission, and receipt-based retrieval. The contour-guided route has one user-accepted vertical SA02 full-body sample; content acceptance is per output. Automated production orchestration is pending implementation. X and Douyin integration and the two-performer routes still need live trials. [Current status](<docs/product/status.md>) · [Workflow test cases](<docs/verification/acceptance.md>)

### Case study: BM01 F06 footwork repair

The first full-body redraw corrected the footwear but still kept the legs crossed when the source feet had separated. The second used a full-length grayscale motion reference and stronger leg and foot contours in both sampling passes, with an F06 shoe detail reference. H3 redrew the whole shot in S02 with the original soundtrack; no visual compositing was used.

Across 16 matched time samples, the second redraw showed the feet apart at 6.0, 6.5, 7.0, and 8.0 seconds, while retaining the crossed pose at about 4.5 seconds and the matching low-cut Mary Jane shoes. The stills do not establish exact landings, absence of foot sliding, or weight transfer throughout playback. [Repair setup and verification limits](<docs/operations/h3-4090.md#bm01-f06-footwork-repair>)

## Reference characters and S02

S02 uses a plain white background and a fine light-gray floor grid. The four current compositions cover standing single performers. Half-body uses knee-length framing. Full-body includes the shoes and floor. [S02 and target images](<docs/assets/reference-images.md>)

| SA02 · 2D Asuna | BM01 · photographic blue-and-white whale-tail character |
| --- | --- |
| ![SA02 approved front anchor](<docs/images/characters/sa02-front-v1.png>) | ![BM01 locked front anchor](<docs/images/characters/bm01-front-v1.png>) |
| Chestnut hair and red-and-white knight outfit. Front anchor approved. | Blue-gray hair, blue-and-white costume, and empty hands. Associated front anchor locked. |
| ![SA02 pending four-view sheet](<docs/images/characters/sa02-four-view-candidate-v1.png>) | ![BM01 approved four-view sheet](<docs/images/characters/bm01-four-view-v1.png>) |
| Supporting four-view sheet pending confirmation. | Four-view sheet approved. |
| ![F01 SA02 knee-length view](<docs/images/characters/sa02-s02-knee-v1.png>) | ![F05 BM01 knee-length view](<docs/images/characters/bm01-s02-knee-v1.png>) |
| **F01** final half-body composition. | **F05** final half-body composition. |
| ![F02 SA02 full-body view](<docs/images/characters/sa02-s02-full-v1.png>) | ![F06 BM01 full-body view](<docs/images/characters/bm01-s02-full-v1.png>) |
| **F02** final full-body composition. | **F06** final full-body composition. |

Production uses the registered local originals. The manifest records the display labels at publication. JK03 is retired. [SA02](<docs/assets/sa02.md>) · [BM01](<docs/assets/bm01.md>) · [Display manifest](<docs/images/characters/manifest.json>)

## Workspace and offline checks

Use Python 3.11+ and Git from the project root. Install the development dependencies in the project environment first. [Workspace layout and checks](<docs/maintenance/workspace.md>)

```bash
python -m pip install -e ".[dev]"
python scripts/check_project_docs.py
python scripts/check_release.py
python -m unittest discover -s tests -v
```

Before using the formal local references, run `python scripts/check_character_lock.py`. The check reports missing formal files in a public clone. [Project instructions](<AGENTS.md>) · [Publication policy](<docs/maintenance/publication.md>)
