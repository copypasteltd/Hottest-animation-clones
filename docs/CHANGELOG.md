# 变更记录

## Restore explicitly requested README character illustrations — 2026-11-15

- 修正此前将所有人物图排除的错误：按用户明确要求，在中英README直接嵌入SA02／BM01正面基准、两张四视图及F01/F02/F05/F06构图，共8张既有PNG。
- 图片旁明确标注定稿／待确认／已查看状态和脸、发型、服装、媒介、空手／场景约束；公开展示不改变SA02候选四视图或其他未逐图批准状态。
- 只公开精确白名单内的字节一致副本及图例清单；原始3张参考照片、源舞视频、正式私有清单、JK03和其他候选、凭据日志仍不公开，不恢复前端。
- 增加PNG签名／尺寸／hash、精确清单、两份README全部嵌图及索引边界检查，防止文档再次缺图或意外扩大媒体范围。
- Restored eight explicitly requested existing character PNG illustrations inline in both READMEs, with visual constraints and unchanged per-image approval labels.
- Published only precise byte-identical display copies and a sanitized manifest; raw references and private production data remain excluded. Added image identity/inline-presence checks, without generation or frontend work.

## Systematic bilingual README refresh — 2026-11-15

- 系统重整中英文README为相同十部分：目标／架构、真实实现、安装／命令、人物与构图状态、计划生产流程、数据规则、目录、路线、文档索引、维护／权利。
- 将用户批准、文件／人工视觉检查与待确认分开：SA02根图批准但新四视图待确认，BM01四视图已批准，F05/F06不伪填逐图用户批准；JK03退役和历史候选保留范围不变。
- 说明公开克隆与私有工作区差异、角色锁预期失败及不检查范围、默认关闭外部动作的配置模板，避免将任务专用Sub2出图过程误写成公开生产CLI；补充阅读／使用顺序与最新明确决策优先于历史文字的规则。
- 重整docs导航，保留完整规格／历史链接；仅修改文档，不重出图片、不改批准／角色清单、不新增代码或前端。
- Reorganized both READMEs into matching architecture, capability, setup, asset-status, workflow, data, layout, roadmap, documentation and maintenance sections.
- Clarified approved versus pending references, clean-clone behavior and the limits of checks. Updated the documentation index; no assets, approval states, production code or frontend were changed.

## SA02 supporting four-view candidate — 2026-11-15

- 按用户要求以已批准SA02主图为唯一参考，经Sub2默认模型制作正面全身／90°侧面／背面全身／正脸近照四视图，保持栗发红白骑士服与2D画风。
- 新图为本地待确认辅助视图，已文件／人工视觉检查；侧背细节为保守生成补全，不预填用户批准。原锚点、asset、选择清单、BM01及现有S02构图均不改。
- Generated and inspected a local SA02 four-view candidate from the frozen approved front root. User confirmation is still pending; no approved identity record or existing composition was overwritten, and no media or frontend is published.

## BM01 real-character approval and JK03 retirement — 2026-11-15

- 用户批准蓝白鲸尾真人四视图作为BM01；冻结关联正面根图与批准四视图，真实角色映射改为BM01，二次元SA02保持不变。
- 按进一步确认，仅删除JK03正式角色和膝部／全身图及重复交付产物，保留SA02、S02和其他独立历史候选。旧选择记录保留历史，不自动回退或恢复已删除资产。
- 使用指定Sub2默认模型制作BM01＋S02的F05膝部中景／F06全身图，已文件及人工视觉查看；新图逐张用户复审与角色批准分开记录，动作／骨架／模型适配仍未验证。
- 选择与组合索引升级v2，锁校验增加current指针、BM01四视图、JK03退役与禁止继承旧身高的检查；同步双语说明与当前规则。私人图片和清单不公开，不新增前端。
- Approved BM01's displayed photographic four-view as the new real character, keeping SA02 unchanged. Pin the front root and approved sheet; do not inherit JK03 age/height.
- Removed only JK03's official anchor/framing outputs and duplicate delivery artifacts; independent historical candidates remain. Version-2 registries prevent retired-character fallback.
- Produced and visually inspected BM01/S02 knee and full-body images via the requested Sub2 route. New outputs are not falsely marked individually user-approved or motion-validated. No private media or frontend is published.

## README synchronization after scope correction — 2026-11-14

- 同步中英文README与文档导航：明确公开文档／维护工具、本地静态资产、未实现动作能力和已移除前端的边界。
- 补充现有检查命令的预期结果与限制，明确无浏览器／预览服务启动步骤；未新增代码、页面或媒体。
- Synchronized both root READMEs and the documentation index with the documentation-and-maintenance-only repository state.
- Added expected check results and explicit limits; no code, frontend, preview service or media was added.

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
