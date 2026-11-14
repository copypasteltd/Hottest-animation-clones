# Project maintenance instructions / 项目持续维护约束

## Scope and truthfulness

- Preserve the user's existing project work and Git history. The public repository is `git@github.com:copypasteltd/Hottest-animation-clones.git`.
- Keep current state explicit: requirements/contracts, maintenance tools and a synthetic documentation demo exist; production source-pose inference and canonical motion-video skill do not yet exist.
- Source observations and generated derivatives remain separate. Static character approval does not approve motion, pose, unseen views or rights.
- Never replace a frozen local anchor silently. Run `python scripts/check_character_lock.py` before using locally provided character media. A public clone lacking that media must fail clearly without downloading/regenerating it.

## File and publication boundaries

- All detailed docs, prompt templates and reports stay under `docs/`. The user explicitly requested bilingual root README files; `README.md` and `README.zh-CN.md` are the public entry exceptions. This instruction file is also intentional at the root.
- Real sources, character images, weights, device configuration, gateway scripts, private keys, logs and generated project outputs remain ignored. Do not change those rules or use `git add -f` to expose them.
- Only the reviewed synthetic-demo capture files listed in `docs/assets/capture-manifest.json` may be published as README media. They are actual page captures, not proof of inference. Re-record if page behavior changes.
- Follow `docs/18-开源发布与持续同步规范.md` and the existing path/text/asset guards. Code MIT licensing does not relicense third-party media or IP.

## Required update and synchronization workflow

The user explicitly asked that future work on this project keep the specified GitHub repository, documentation and update notes synchronized.

1. Before editing, inspect status and remote refs. Preserve unrelated local changes; never overwrite unknown remote history.
2. For behavior, schema, CLI, structure or capability changes, update **both** root README languages plus the relevant detailed docs. Correct stale implementation claims.
3. For demo/UI changes, run the real page, inspect desktop/mobile, update screenshots and actual screen recording/GIF when applicable, then update capture provenance/hashes. Do not present mock screenshots as evidence.
4. Add a scoped bilingual entry to `docs/CHANGELOG.md`; list actual verification and any untested model behavior in the commit/PR explanation.
5. Run `python scripts/check_project_docs.py`, `python scripts/check_release.py`, and `python -m unittest discover -s tests -v`. After explicitly staging reviewed files, run `python scripts/check_repository.py` and `git diff --cached --check`.
6. Commit only the authorized project changes. Normal-push the completed change to the configured repository when within the user's standing synchronization request, and verify the remote branch points at the intended commit.
7. If the user says not to push or asks for review first, that newer instruction wins. Never force-push, erase history, expose secrets, or alter unrelated remotes. If authentication/permissions/network prevent pushing, retain the local commit and report the exact synchronization failure; do not claim the repository is updated.

## Local commands

```bash
python -m pip install -e ".[dev]"
python scripts/bootstrap_workspace.py
python scripts/serve_demo.py --port 8765
python scripts/check_project_docs.py
python scripts/check_release.py
python -m unittest discover -s tests -v
python scripts/check_repository.py
```

The final command checks indexed content. Do not install or launch remote generation services just to maintain documentation. Stop task-owned preview servers/browser sessions/recordings after captures are complete; do not stop unrelated user services.
