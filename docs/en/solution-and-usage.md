# Motion-transfer operating guide

The v0.6 workflow starts with a Bilibili, X, or Douyin video link in the conversation. It uses the complete selected video for two S02 outputs. Single-performer outputs use SA02 and BM01 separately. Two-performer outputs use both characters with the assignments exchanged between versions. [Product requirements](<../product/requirements.md>) · [Current status](<../product/status.md>)

## Choose the route and references

1. Identify the requested video or Bilibili part. If the link and page leave multiple plausible choices, ask once which video to use. Download it through `/ra-video-download` and keep the original file and source metadata in the private source directory.
2. Assess the full video to choose half-body or full-body framing, standing or another available posture, and single- or multi-performer replacement. Choose half-body for upper-body motion and gestures, and full-body when footwork, turns or travel drive the action. Record any limitation that prevents routing the whole video.
3. For a standing single performer, use F01 and F05 for half-body or F02 and F06 for full-body. For a two-performer route, use the customer’s assignments when supplied. Otherwise, choose one of the two assignments at random and record it once. Exchange the assignments for the second version. Keep both assignments fixed throughout their respective videos and reuse them for retries. [Execution runbook](<../operations/runbook.md>) · [Final target images](<../assets/reference-images.md#target-frames>)

## Run and deliver both versions

Use the designated RTX 4090 H3 workflow. Bind the same entire source video and the corresponding target image to each run. H3 handles motion analysis and transfer, with camera motion following the source. Manual segmentation, frame extraction for specifying motion, and delivery of shortened segments are excluded. Apply adaptations to a working copy or the execution graph so the source workflow stays intact. [H3 connection and execution](<../operations/h3-4090.md>)

Submit to the designated ComfyUI queue even while the device is busy. Take source videos in groups of two in input order. Queue both SA02 versions for the group, followed by both BM01 versions. Queue the last source on its own if the group contains one. Track each submission with its own receipt. Reconcile uncertain submissions using the original attempt. While the batch is active, a confirmed failure with a correctable cause allows one automatic retry for that version. Reuse retrieved outputs when the source, version, target images, workflow and actual parameters match. A user-requested adjustment or rerun creates a new attempt for the selected item or version. [Execution and recovery](<../operations/h3-4090.md#submission>)

A stop request covers all unfinished work in the current batch, including both versions. Use their receipts to track the cancellation of queued or running jobs. Report each generation result and deliver each MP4 as soon as it has been retrieved for its receipt. Skip finished-video checks, review and approval. The delivery note gives the source ID, character version, whole-video input, audio handling and any known execution limits. Use the route’s output dimensions and frame rate by default. Select a matching preset if the request specifies a format such as 9:16. Prefer the source audio when it can be kept on the full timeline. Use a silent output if source audio cannot be retained, and use generated audio only by request. [Delivery conditions](<../verification/acceptance.md#delivery-review>) · [Run record](<../operations/run-record.md>)

## Maintain the checkout

Use the workspace guide for local paths, offline checks and formal character verification. The publication guide defines the material tracked in Git. [Workspace guide](<../maintenance/workspace.md>) · [Publication policy](<../maintenance/publication.md>)
