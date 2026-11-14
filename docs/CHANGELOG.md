# 变更记录

## Scope correction: remove unsolicited frontend — 2026-11-14

- 按用户要求移除合成交互前端及相关页面、静态服务、截图、录屏、GIF、媒体清单、专用测试和本地临时副本。
- 清理中英README、英文使用长文、CI及维护规则，发布检查回归纯文档和代码边界，不再要求页面或录制产物。
- 明确约束：未经用户明确指示并给出要求与约束，不得新增前端开发项；文档/发布任务不隐含界面开发授权。
- 保留需求、数据契约、人物与场景锚点、四张构图母版、真实任务记录及正常Git历史；不重写历史。
- Removed the unsolicited frontend, related pages, preview service, captures, recordings, GIFs, media manifest, dedicated tests and temporary copies at the user's direction.
- Kept bilingual solution and maintenance documentation; release checks now cover documentation only. No frontend may be created without explicit user instructions and requirements/constraints.
- Core specifications, contracts, approved local assets and Git history are preserved.

## Earlier publication (frontend additions below have since been removed) — 2026-11-14

- 新增根中英双语README、英文方案与使用长文，明确已实现维护工具和仍待实现的推理/双库阶段。
- 新增真实可操作的中英合成动作工作台，含搜索/筛选、播放/时间轴、独立审核、版本来源和JSON导出；不含真实人物或模型结果。
- 从实际浏览器录制桌面/移动截图、短MP4与GIF，附来源、转换和hash清单；只公开精确白名单媒体。
- 增加静态页面预览、双语/页面/媒体发布检查、源目录与上传边界测试，扩展CI与PR检查。
- 根据用户明确授权绑定GitHub目标，持久化后续README/媒体/CHANGELOG与正常push同步规则；不强推、不公开私有素材。
- Added bilingual root READMEs and an English solution guide with explicit implemented/planned capability boundaries.
- Added an original synthetic workbench and actual desktop/mobile browser captures, a short MP4 and GIF with provenance; these are not inference results.
- Added release checks, isolated static preview tests, CI/PR maintenance gates, and standing normal-push synchronization instructions for the user-selected repository.

### Previously prepared local decisions included in this update

- 根据用户明确选择冻结SA02（二次元亚斯娜红白骑士服）与JK03（写实奶油针织JK）两条独立本地v1锚点。
- 新增定稿约束、使用前hash/版本校验入口及合成数据测试，图片/真实清单仍不进入源码仓。
- 更新总纲、契约与验收状态，去除会与本次选择冲突的成年默认人设/浅灰背景建议。
- 静态角色批准不代表动作、骨架、目标模型或商业权利已验证；角色锁定阶段未生成新图/视频。
- 后续用户选定S02白背景＋网格地面，固定场景v1；经Sub2双参考生成两角色各膝部中景/全身共4张组合母版，独立记录hash和人工视觉检查，人物根锚点不变，未生成视频。

## 0.0.1 — 2026-11-13

- 建立独立本地Git项目与main分支的维护基础。
- 统一公开需求基线v0.3：46项需求、29个计划验收案例。
- 增加可移植源码布局、无敏感配置模板、文档/Schema校验、基础测试和CI配置。
- 默认不跟踪真实媒体、模型、设备记录、历史实验脚本和生成产物。
- 使用MIT许可原创代码/文档，第三方素材、模型和数据保持独立权利边界。

当前版本仍是仓库基础建设，不表示已实现通用源骨架推理、标准动作视频生产、双库应用或提炼skill；软件包未发行。用户已授权指定GitHub仓库同步，实际push/CI以远端状态和执行回执为准。
