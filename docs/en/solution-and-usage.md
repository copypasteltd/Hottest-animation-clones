# Motion-transfer operating guide

The v0.4 specification describes how a Bilibili, X, or Douyin work link becomes a reviewed MP4 of a reference character performing the source motion in the white S02 scene. The project configures the character and workflow before routine link-only runs. The status page records completed checks and outstanding route tests. [Requirements](<../product/requirements.md>) · [Current status](<../product/status.md>)

## Prepare a route

Confirm the configured character, posture, shot framing, and performer count. The standing single-performer references are SA02 F01/F02 and BM01 F05/F06 for half-body/full-body output. Multi-performer routes need a matching set of target images and a verified correspondence for each performer. [Target images and approvals](<../assets/reference-images.md#target-frames>)

On the designated RTX 4090 ComfyUI host, verify the H3 workflow in the configured directory, its active branch, its executable graph, and the actual video and image inputs. Check a matching sample for media integrity, character, scene, and motion before enabling the route. [H3 connection guide](<../operations/h3-4090.md>)

## Process a link

1. Use `/ra-video-download` to fetch the selected work or part. Check the actual media and retain the untouched video and source metadata in the project’s private source area. [Execution runbook](<../operations/runbook.md>)
2. Review the continuous performance and its key moments. Choose half-body framing for torso and hand movements or full-body framing when steps, ground contact, turns, or travel determine the action. Count the performers who contribute to the action or interaction. Record source visibility separately from the intended framing. [Routing criteria](<../operations/runbook.md#routing>)
3. Select the matching versioned target images and record the workflow inputs. Follow the original submission receipt through queue, history, and retrieval. If the submission result is unknown, reconcile that attempt before deciding on another. [Target selection](<../operations/runbook.md#target-selection>) · [Execution and recovery](<../operations/h3-4090.md#submission>)
4. Check the retrieved video, then review identity, scene, framing, key motion, timing, and audio as required by the route. Deliver the reviewed MP4 with its source ID, processed interval, and any limits. [Delivery checks](<../verification/acceptance.md#delivery-review>) · [Run record](<../operations/run-record.md>)

## Maintain the checkout

Use the workspace guide for local paths, offline checks, and formal character verification. The publication policy defines the material tracked in Git. [Workspace guide](<../maintenance/workspace.md>) · [Publication policy](<../maintenance/publication.md>)
