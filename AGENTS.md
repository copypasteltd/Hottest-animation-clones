# Project maintenance instructions / 项目持续维护约束

## Explicit scope boundary / 禁止擅自新增前端

- **未经用户明确指示并给出相应要求与约束，不得构建任何前端开发项。**不得自行创建网站、交互页面、演示工作台、Dashboard、静态预览服务或相关前端工程。
- **Do not create a frontend without an explicit user instruction and its requirements/constraints.** Requests to organize code, improve a README, record content, publish a repository or continue the project do not authorize inventing a UI or demo application.
- Use Markdown, data contracts, scripts and actual task artifacts for the currently authorized work. If frontend work is relevant, explain why and establish scope with the user before creating it.
- Do not recreate the removed frontend or its screenshots, recordings, GIFs, server, tests or former frontend-capture exceptions. The explicitly requested eight static character PNG display copies listed below are separate from that removed frontend and do not authorize UI work. Future UI work requires a new explicit instruction; repository synchronization authorization does not expand implementation scope.

## Scope and truthfulness

- Preserve the user's project work and Git history. The public repository is `git@github.com:copypasteltd/Hottest-animation-clones.git`.
- The v0.4 requirements cover Bilibili/X/Douyin link intake, `/ra-video-download`, framing and performer assessment, target image selection, the specified 4090 H3 workflows, and checked standard-scene video delivery. Production orchestration is pending. Follow the [current requirements](docs/12-项目需求梳理与实现方案总纲.md) and [runtime contract](docs/13-动作迁移运行与交付规范.md).
- Source observations and generated derivatives remain separate. Static character approval does not approve motion, pose, unseen views or rights.
- Never replace a frozen local anchor silently. Run `python scripts/check_character_lock.py` before using locally provided character media. A public clone lacking it must fail clearly without downloading or regenerating replacements.
- Current user-approved characters are SA02 (anime, unchanged) and BM01 (photographic blue/white whale-tail costume). BM01 replaces retired official JK03; only JK03's formal anchor/framing outputs were deleted, while unrelated historical candidates remain. Use `standard-assets/characters/current.json` → `selection.v2.json`. Follow the configured role preset for link-only runs. Set a missing preset during setup. Explicit photographic and anime choices map to BM01 and SA02 respectively. Pin BM01's approved four-view and front anchor. Its design follows the BM01 references. See `docs/19-BM01真实角色替换与JK03退役约束.md`.

## File and publication boundaries

- Detailed docs, prompt templates and reports stay under `docs/`. User-requested bilingual root README files and this instruction file are intentional root entries.
- Real source photographs/videos, production outputs, private asset registries, weights, machine configuration, credentials, logs and local archives stay ignored. Do not use `git add -f` or broaden publication to include those materials.
- The user explicitly requested inline character images in both READMEs. The sole current display-media exception is the eight existing static PNG byte-identical copies in `docs/images/characters/` plus `manifest.json`: `sa02-front-v1.png`, `sa02-four-view-candidate-v1.png`, `sa02-s02-knee-v1.png`, `sa02-s02-full-v1.png`, `bm01-front-v1.png`, `bm01-four-view-v1.png`, `bm01-s02-knee-v1.png`, `bm01-s02-full-v1.png`. Do not infer a whole-directory, other-candidate, video, original-reference-photo or frontend exemption. See `docs/18-开源发布与持续同步规范.md`.
- README display authorization is separate from design approval: SA02's root is approved but its four-view remains pending; BM01's four-view is approved; F01/F02 remain preserved/viewed, and BM01 F05/F06 are visually checked but not individually user-approved. Current v2 selection and lock remain unchanged. A public clone has these display copies, not the complete private registry/formal directories, so the private character lock still fails clearly when required private files are absent.
- Public content otherwise consists of reviewed source, documentation, contracts and illustrative machine-readable examples. Validate the exact PNG signatures, sizes, hashes, manifest inventory, index paths and inline README references before publishing this exception; report actual results rather than assuming success. Displaying the images does not grant a new license, commercial/training rights or broader publication authority, and creates no frontend.
- Follow `docs/18-开源发布与持续同步规范.md` and existing path/text guards. Code MIT licensing does not relicense third-party media or IP.

## Required update and synchronization workflow

The user requested that completed project work keep the specified GitHub repository, documentation and update notes synchronized. This grants normal repository synchronization, not permission to create additional features.

1. Inspect worktree status and remote refs before editing. Preserve unrelated local changes and unknown remote history.
2. Update both root README languages and relevant detailed docs when behavior, schema, CLI, structure, scope or capability claims change. Do not add new implementation merely to decorate documentation.
3. Add a scoped bilingual entry to `docs/CHANGELOG.md`, stating actual verification and untested model behavior.
4. Run `python scripts/check_project_docs.py`, `python scripts/check_release.py`, and `python -m unittest discover -s tests -v`. Explicitly stage reviewed files, then run `python scripts/check_repository.py` and `git diff --cached --check`.
5. Commit only authorized changes, normal-push within the user's synchronization request, then verify the remote branch points at the intended commit.
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
