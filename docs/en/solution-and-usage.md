# Motion-transfer operating guide

Requirements baseline v0.4 defines a link-to-video operation. A configured run takes a Bilibili, X, or Douyin work link and delivers a checked motion-transfer video with a project character in the standard white S02 scene. [Product requirements](<../12-项目需求梳理与实现方案总纲.md>) · [Runtime contract](<../13-动作迁移运行与交付规范.md>)

## Download and inspect the source

Pass the supplied work link to `/ra-video-download` with its output directory under the project's private source area. Preserve the selected Bilibili part or the specific video in a post. Keep the untouched file, fingerprint, metadata sidecars, and actual media probe. A batch gives each input its own result, including duplicates, unsupported access, and download failures.

Identify the continuous performance interval and record key action times. Use closer review for fast hands, occlusion, and changes in performers or shots. Record observed source framing and the chosen output framing separately.

| Choice | How to decide |
| --- | --- |
| Half-body | Key movements are in the torso, shoulders, arms, or hands. Waist-up footage can provide evidence for these movements while the target uses a knee-length composition. |
| Full-body | Steps, turns, travel, or weight shifts matter to the action. Check the necessary body parts and contact with the ground during key events. |
| Single performer | One person performs the relevant action. A bystander can be recorded separately. |
| Multiple performers | More than one person contributes to the motion or interaction. Keep the participants, corresponding identities, and relevant spacing. |

Standing is the current posture preset. A seated preset can use either framing. A route needs reviewed evidence if the required motion or participants are unclear. [Run and delivery template](<../templates/动作迁移任务与交付模板.md>)

## Choose a target and run the workflow

Set the preferred project character at setup. For S02 standing single-person output, select F01 or F02 for SA02 and F05 or F06 for BM01, in half-body and full-body order. Check the official role registry, framing registry, image hash, and per-image review status. BM01 uses its approved four-view sheet to establish identity. The SA02 four-view candidate remains pending. Multi-person inputs require a corresponding group target or verified mapping of individual images. [S02 composition rules](<../17-S02场景定稿与四张构图母版规范.md>)

Use the H3 workflows already under `user/default/workflows/社区精选H3_人物与场景替换_实验` on the designated RTX 4090 ComfyUI host. Verify the workflow file and hash, active branch, reference video and image connections, actual API graph, duration and format handling, and output mapping. Test a combined character and S02 composition for an eligible single-reference branch. Verify separate scene and subject inputs and multi-person mappings on their respective routes. Enable routine runs after the matching sample passes review. Record the returned submission ID and follow the same attempt through queue, history, and output retrieval. [Workflow and execution contract](<../13-动作迁移运行与交付规范.md#3-4090-工作流>)

## Verify and deliver

Retrieve the actual video, check decoding and duration, and record the media properties, audio treatment, and SHA256. Review the key events for order, timing, required limbs or interaction, identity, and scene and frame coverage. A finished delivery requires both the media checks and visual review to pass for the declared scope. Report blocked or failed items individually. Keep private source URLs and raw source metadata with the source sidecars. [Acceptance cases](<../14-实施计划与验收矩阵.md>) · [Illustrative run record](<../examples/motion-transfer-run.example.json>)

Local maintenance commands cover documentation and static asset identity. The previous H3 run is evidence for a single historical clip. Check the current route and production status in the repository overview. [H3 historical evidence](<../evidence/H3基础用例公开摘要.md>) · [Repository overview](<../../README.md>)
