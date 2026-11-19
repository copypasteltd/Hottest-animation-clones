# 运行记录与状态

记录版本为 `motion-transfer-run/1.0`。每条记录对应一段源视频执行区间的一次尝试。`run_id` 归集本次任务或批次，`item_id` 标识其中的执行条目，`execution.attempt_id` 区分不同尝试。批次汇总按输入和条目各自计数。[JSON Schema](<../schemas/motion-transfer-run.schema.json>) · [未执行的虚构样例](<../examples/motion-transfer-run.example.json>)

## 字段与证据

| 字段 | 记录内容 |
| --- | --- |
| `source` | 平台、源 ID、下载状态、方法、私有来源侧车引用和原片媒体摘要。 |
| `decision` | 来源区间、可见范围、关键时间点、目标取景、人数、姿态、理由与限制。 |
| `target` | 场景 ID 与版本、实际目标图版本及哈希、各图审核状态，及表演者到角色和目标图的对应。 |
| `workflow` | 远端 ComfyUI 根下的工作流相对路径、哈希、活动分支、输入位和输出映射。 |
| `execution` | 尝试 ID、执行状态、实际输入与参数清单相对路径、原任务回执及阻塞或失败原因。 |
| `output` | 已取回并通过媒体检查的文件、实际音轨处理及限制。审核前指向可复核候选，成片路径随通过审核的交付记录登记。 |
| `review` | 审核结论、证据文件路径和问题说明。 |

源片、目标图、参数清单、审核证据和成片引用以项目内路径保存。工作流路径以远端 ComfyUI 根为基准。文件、时间范围、逐人对应、任务所有权和媒体内容在实际运行中核验。Schema 校验覆盖字段结构及其中编码的状态关系。[工作区路径](<../maintenance/workspace.md>)

## 记录状态

| 范围 | 状态与使用条件 |
| --- | --- |
| 下载 `source.download_status` | `not_run`、`downloaded`、`blocked`、`failed`、`unknown`。`downloaded` 有媒体核验及来源侧车。 |
| 判定 `decision.status` | `planned`、`needs_review`、`decided`。`decided` 有区间、动作证据、取景、姿态和人数。 |
| 执行 `execution.status` | `planned` 为计划，`blocked` 为前置缺失，`running` 有明确回执并待结果，`unknown` 待核原尝试，`failed` 为已确认失败，`completed` 表示实际输出已取回且通过媒体检查。 |
| 审核 `review.status` | `not_run`、`needs_review`、`failed`、`passed`。`passed` 需执行已完成且有审核证据，作为成片交付依据。 |

开启新尝试时保存原记录。变更片段、目标图、工作流或执行参数时，在新记录中标明实际变更。对回执不明的尝试沿原记录核对并更新结果。[提交与找回](<h3-4090.md>) · [填写模板](<../templates/动作迁移任务与交付模板.md>)
