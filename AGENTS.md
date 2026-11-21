# Project maintenance instructions / 项目持续维护约束

## Explicit scope boundary / 禁止擅自新增前端

- **未经用户明确指示并给出相应要求与约束，不得构建任何前端开发项。**不得自行创建网站、交互页面、演示工作台、Dashboard、静态预览服务或相关前端工程。
- **Do not create a frontend without an explicit user instruction and its requirements/constraints.** Requests to organize code, improve a README, record content, publish a repository or continue the project do not authorize inventing a UI or demo application.
- Use Markdown, data contracts, scripts and actual task artifacts for the currently authorized work. If frontend work is relevant, explain why and establish scope with the user before creating it.
- Do not recreate the removed frontend or its screenshots, recordings, GIFs, server, tests or former frontend-capture exceptions. The explicitly requested eight static character PNG display copies listed below are separate from that removed frontend and do not authorize UI work. Future UI work requires a new explicit instruction; repository synchronization authorization does not expand implementation scope.

## Scope and truthfulness

- Preserve the user's project work and Git history. The public repository is `git@github.com:copypasteltd/Hottest-animation-clones.git`.
- The v0.7 requirements take Bilibili/X/Douyin links in the conversation. Each version uses the whole video and follows the source camera motion. Prepare a paired SA02 and BM01 plan for each source. Submit both ready versions in the same batch to the specified ComfyUI queue, using the agreed groups of two source videos. Open a numbered batch for each message containing work links unless the customer requests an append. Report each result and deliver MP4s upon retrieval while the batch is active. Use the recorded receipts for stop, resume, and session recovery. Production orchestration is pending. Follow the [current requirements](docs/product/requirements.md) and [execution guide](docs/operations/runbook.md).
- Source observations and generated derivatives remain separate. Static character approval does not approve motion, pose, unseen views or rights.
- Never replace a frozen local anchor silently. Run `python scripts/check_character_lock.py` before using locally provided character media. A public clone lacking it must fail clearly without downloading or regenerating replacements.
- Current user-approved characters are SA02 (anime, unchanged) and BM01 (photographic blue/white whale-tail costume). BM01 replaces retired official JK03; only JK03's formal anchor/framing outputs were deleted, while unrelated historical candidates remain. Use `standard-assets/characters/current.json` → `selection.v2.json`. For a single performer, produce an SA02 output and a BM01 output. Use F01 and F05 for standing half-body or F02 and F06 for standing full-body. For two performers, both versions use SA02 and BM01 with their assignments exchanged. Pin BM01's approved four-view and front anchor. Follow the current reference design. See [BM01’s asset rules](docs/assets/bm01.md).

## File and publication boundaries

- Detailed docs, prompt templates and reports stay under `docs/`. User-requested bilingual root README files and this instruction file are intentional root entries.
- Real source photographs/videos, production outputs, private asset registries, weights, machine configuration, credentials, logs and local archives stay ignored. Do not use `git add -f` or broaden publication to include those materials.
- The user explicitly requested inline character images in both READMEs. The sole current display-media exception is the eight existing static PNG byte-identical copies in `docs/images/characters/` plus `manifest.json`: `sa02-front-v1.png`, `sa02-four-view-candidate-v1.png`, `sa02-s02-knee-v1.png`, `sa02-s02-full-v1.png`, `bm01-front-v1.png`, `bm01-four-view-v1.png`, `bm01-s02-knee-v1.png`, `bm01-s02-full-v1.png`. Do not infer a whole-directory, other-candidate, video, original-reference-photo or frontend exemption. See the [display inventory and publication policy](docs/maintenance/publication.md#display-assets).
- F01/F02 and F05/F06 are the fixed S02 half-body and full-body production references for SA02 and BM01. The README manifest preserves the labels recorded during its November 15 display publication. SA02’s front anchor and BM01’s four-view sheet are approved. SA02’s supporting four-view candidate is pending. A public clone has these display copies, not the complete private registry/formal directories, so the private character lock still fails clearly when required private files are absent.
- Public content otherwise consists of reviewed source, documentation, contracts and illustrative machine-readable examples. Validate the exact PNG signatures, sizes, hashes, manifest inventory, index paths and inline README references before publishing this exception; report actual results rather than assuming success. Displaying the images does not grant a new license, commercial/training rights or broader publication authority, and creates no frontend.
- Follow the [publication policy](docs/maintenance/publication.md) and existing path/text guards. Code MIT licensing does not relicense third-party media or IP.

## Required update and synchronization workflow

The user has given standing authorization to classify and archive each new task handled in this project, and to synchronize verified, publication-eligible changes to the authorized GitHub `main` without waiting for a separate push request. This is a project maintenance rule, not permission for new features, scheduled jobs, deployment or wider publication.

- At intake, distinguish a new media batch, a rerun or repair, asset or workflow maintenance, code or documentation maintenance, and read-only investigation. For media, record the source, observed framing and performer count, variant, and batch or attempt; follow the existing batch rules. Keep old outputs and receipts when opening a new attempt.
- Archive actual outputs, receipts and review evidence in the designated private project paths. Record pending, failed and verified results distinctly. Only update public documentation or code when there is an authorized, substantive, non-sensitive change. A read-only task, a private-only result or no public diff does not require a commit or push.
- Use the [task classification and synchronization policy](<docs/maintenance/publication.md#task-classification>) for the public/private split.

1. Inspect worktree status and remote refs before editing. Preserve unrelated local changes and unknown remote history.
2. Update both root README languages and relevant detailed docs when behavior, schema, CLI, structure, scope or capability claims change. Do not add new implementation merely to decorate documentation.
3. Add a scoped bilingual entry to `docs/CHANGELOG.md`, stating actual verification and untested model behavior.
4. Run `python scripts/check_project_docs.py`, `python scripts/check_release.py`, and `python -m unittest discover -s tests -v`. Explicitly stage reviewed files, then run `python scripts/check_repository.py` and `git diff --cached --check`.
5. Commit only the reviewed changes for this task. Automatically normal-push eligible changes to `main` of `copypasteltd/Hottest-animation-clones` after the checks pass, then verify the actual remote ref points to the intended commit. Never include unrelated worktree or staged changes.
6. A newer user instruction to hold a push or request review wins. Never force-push, erase history, expose secrets or change unrelated remotes. If a push fails, preserve the local commit and report the failure instead of claiming synchronization.

## Local commands

```bash
python -m pip install -e ".[dev]"
python scripts/bootstrap_workspace.py
python scripts/check_project_docs.py
python scripts/check_release.py
python -m unittest discover -s tests -v
python scripts/check_repository.py
```

The final command checks indexed content. Do not launch browsers, preview servers or remote generation services for ordinary documentation maintenance. Do not stop unrelated user services.
