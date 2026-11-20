# 变更记录

## 批次恢复与留存 · Batch recovery and retention v0.7（2026-11-20）

- 含作品链接的消息默认新建编号批次，明确要求时可追加。组内仍有原片在下载时等待，另一条失败或阻塞后允许就绪原片单独入队。
- 停止时反馈已生成的远端结果，恢复批次后按原回执取回。继续批次默认恢复所有剩余任务，会话中断后补发尚未反馈的结果。
- 工作流支持时，主动重做默认换种子，故障补跑优先沿用原种子。重复链接复用符合配置且最近成功取回的成片。允许直接参与动作的道具，原片、实际执行图、回执和成片默认按批次长期留存。
- 29 项离线单元测试、24 项 Schema 负例、双语文档和八张展示图检查通过。指定 4090 上的首条试跑待样片链接。
- Start a new numbered batch for each message containing work links, with explicit append support. Wait for a group member that is still downloading. Queue the ready source on its own if the other source fails or is blocked.
- Report results already generated when a batch stops and retrieve them by their original receipts when the batch resumes. Resume remaining work by default and report outstanding results after a session interruption.
- Use a fresh seed for a requested remake and prefer the original seed for a fault retry when the workflow supports seeds. Reuse the most recently retrieved compatible output, allow props used in the action, and retain source videos, executed workflow graphs, receipts, and outputs by batch.
- Passed 29 offline unit tests, 24 negative schema checks, bilingual documentation checks, and verification of the eight display images. The first RTX 4090 trial awaits a source link.

## 双人轮替与队列规则 · Paired assignments and queue handling v0.6 — 2026-11-20

- 首版通过会话收作品链接。双人使用 SA02 与 BM01，第一版按客户指定或随机分配，第二版互换对应。每版保持整片绑定，运镜跟随原片。
- 沿输入顺序每两条原片编为一组，同一版本相邻入指定 ComfyUI 队列。停止指令覆盖当前批次全部未完成任务。每次生成结果都反馈，取回 MP4 即交付。
- 运行记录 2.1 增加入队和已确认停止状态。29 项离线单元测试、24 项 Schema 负例及双语文档与展示图检查通过。首条样片链接待提供，指定 4090 的实跑待完成。
- Use the conversation to collect work links. For two performers, record the requested assignment of SA02 and BM01 or select one at random. Exchange the assignments in the second version and follow the source camera motion.
- Group two source videos at a time and submit matching variants together to the designated ComfyUI queue. A stop request covers all unfinished work in the current batch. Report each generation result and deliver its MP4 upon retrieval.
- Run records 2.1 capture queued and confirmed cancellation states. Passed 29 offline unit tests, 24 negative schema checks, and bilingual documentation and display-image checks. The first source link and live RTX 4090 trial are pending.

## 整片双角色直出 · Whole-video dual output v0.5 — 2026-11-20

- 每条链接选定一个完整参考视频。默认用同一原片分别提交 SA02 和 BM01，按整片取景、人数和姿态选用对应定稿图。动作解析与迁移由 4090 上的 H3 工作流处理。
- 工作流适配可使用项目副本或独立执行图。按每版原回执取回 MP4 后直接交付。跳过成品校验与审查，用户可点名原片或版本调整与重跑。
- 将运行记录升级为 2.0。按完整视频、角色版本与尝试标识记录提交和取回。离线通过 29 项单元测试、21 项 Schema 负例、双语发布检查及八张展示图核验。指定 4090 的整片双版本试跑待完成。
- Use one complete reference video for two default outputs, SA02 and BM01. Select the matching final target images for the framing, performers and posture. The H3 workflow on the RTX 4090 handles motion analysis and transfer.
- Adapt working copies or execution graphs and deliver each MP4 upon retrieval using its submission receipt. Skip finished-video checks and review. Track user-requested revisions or reruns by source or version.
- Updated the run-record schema to 2.0. Passed 29 offline unit tests, 21 negative schema checks, bilingual release checks and validation of all eight display images. Live whole-video dual-output trials on the designated RTX 4090 are pending.

## 主题文档重构 · Documentation reorganization — 2026-11-20

- 将 v0.4 规格组织为产品、执行、资产、验收和维护五个主题。双语 README 指向对应主题，旧编号路径保留原有小节的跳转入口。
- 集中记录三站与各 S02 路线的验收进度、4090 接线和原任务找回规则，以及角色和构图批准状态。本地设备说明、早期规格及运行证据从私有索引查阅。
- 已通过 29 项离线单元测试、公开文档链接和锚点检查、运行记录 Schema、八张展示图核验及本地角色锁。三站现行接入与 4090 成片的样片验收待执行。
- Organized the v0.4 documentation by product, operations, assets, verification, and maintenance. Updated both README entries and preserved section links in the numbered pages.
- Consolidated route status, H3 workflow verification and recovery, asset approvals, and the private evidence index.
- Passed 29 offline unit tests, public link and anchor checks, run-record schema checks, validation of all eight display images, and the local character lock. Sample acceptance for platform integration and RTX 4090 delivery is pending.

## 链接到基准白模成片 · Link-to-video baseline v0.4 — 2026-11-20

- 将现行规格收敛为作品链接、下载、取景与人数判断、匹配目标图、4090 H3 人物替换以及成片交付。常规输入只需 Bilibili、X 或抖音链接，下载使用 /ra-video-download。
- 同步双语 README、人物与 S02 取景规则、运行记录与质检模板。旧双库、骨架、检索、参考包和原下载器方案归入项目本地历史档案。
- 离线验证通过 5 项需求与 10 项计划验收的映射、16 项 Schema 负例、27 项单元测试、8 张展示图及正式角色锁。三站实物下载、4090 接线及成片验收待按路线执行。
- Defined the five-step route from a Bilibili, X, or Douyin link to a reviewed S02 video using the designated RTX 4090 H3 workflows.
- Updated both READMEs, the run record, the acceptance matrix, and the asset rules. Moved superseded dual-library and downloader specifications into the local archive.
- Offline verification passed for the five requirements, ten planned acceptance cases, sixteen negative schema checks, twenty-seven unit tests, eight display images, and the character lock. Live download, workflow execution, and visual acceptance are pending.

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

这一时期交付了仓库维护基础。v0.3 的模型推理、动作库与提炼流程仍为当时的设计目标。软件包尚未发行。
