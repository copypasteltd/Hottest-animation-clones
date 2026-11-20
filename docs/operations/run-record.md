# 运行记录与状态

记录版本为 `motion-transfer-run/2.0`。一条记录对应同一完整源视频、一个目标版本的一次尝试。`run_id` 标识任务或批次，`item_id` 标识批次内的完整视频，两个版本共享 `run_id`、`item_id` 和源 ID。`variant` 区分 `SA02` 和 `BM01`，`execution.attempt_id` 区分同一版本的各次尝试。[运行记录 Schema](<../schemas/motion-transfer-run.schema.json>) · [未执行的示例](<../examples/motion-transfer-run.example.json>)

## 字段与引用

| 字段 | 记录内容 |
| --- | --- |
| `source`、`input_scope` | 平台、源 ID、下载状态、方法、私有来源侧车和原片媒体摘要。输入范围固定为 `whole_video`。 |
| `decision` | 整片的可见范围、取景、人数、姿态、理由与限制。此表只供路线与目标图选择。 |
| `target` | 场景 ID 与版本、定稿目标图版本及哈希、整片表演者到角色和图片的对应。 |
| `workflow` | 指定目录内原工作流的路径与哈希，实际执行图的路径基准、身份与哈希，以及活动分支、输入位和输出映射。原图路径以远端 ComfyUI 根为基准。执行图路径可相对项目根或远端 ComfyUI 根。 |
| `execution` | 尝试 ID、运行状态、实际输入清单路径、原任务回执以及阻塞、失败或回执未明的原因。 |
| `output` | 取回的项目内 MP4 路径、实际音轨处理和已知执行限制。音轨处理信息无法由执行记录确定时使用 `unknown`。 |

视频、目标图、输入清单及交付路径采用项目相对路径。两份交付按 `outputs/<run_id>/<item_id>/<variant>/<attempt_id>.mp4` 存放，记录实际取回的那份输出。Schema 检查记录结构，各版本分别根据实际回执更新。[项目目录](<../maintenance/workspace.md>)

## 记录状态

| 范围 | 状态与使用条件 |
| --- | --- |
| 下载 `source.download_status` | `not_run`、`downloaded`、`blocked`、`failed`、`unknown`。`downloaded` 有源片的下载核验与来源侧车。 |
| 路线 `decision.status` | `planned`、`undetermined`、`decided`。无法确定整片路线时标 `undetermined` 并填写原因。`decided` 有取景、姿态和人数。 |
| 执行 `execution.status` | `planned` 为计划，`blocked` 为前置能力或资产缺失，`running` 为已有回执且等待输出，`unknown` 为原尝试待核，`failed` 为已知失败，`completed` 为对应 MP4 已实际取回并可交付。 |

`completed` 作为直接交付状态，跳过成品校验与审查。已取回版本可以单独交付，另一个版本继续按各自回执跟踪。复用时引用原记录与已取回的文件。新尝试保留本版旧记录。历史 `1.0` 记录按原版 Schema 解释。[历史 Schema 1.0](https://github.com/copypasteltd/Hottest-animation-clones/blob/c9a5ad2e48b5ad96d95e362c78f33a324eaaadd7/docs/schemas/motion-transfer-run.schema.json)[提交与找回](<h3-4090.md#submission>) · [填写模板](<../templates/动作迁移任务与交付模板.md>)
