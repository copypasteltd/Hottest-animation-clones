# 项目目录与本地维护

在项目根运行维护命令，按产物用途使用项目相对路径。运行记录中的远端工作流相对路径以指定 4090 ComfyUI 根为基准。[运行记录](<../operations/run-record.md>)

<a name="layout"></a>

## 目录与用途

| 路径 | 内容 |
| --- | --- |
| 项目根 README 与 `docs/README.md` | 双语概览和主题文档入口。 |
| `docs/product/`、`docs/operations/`、`docs/assets/`、`docs/verification/`、`docs/maintenance/` | 产品要求、执行、资产、验收和维护。 |
| `docs/schemas/`、`docs/examples/`、`docs/templates/` | 公开的运行结构、虚构样例和填写模板。 |
| `docs/evidence/` | 经审阅、脱敏的历史实验文字摘要。 |
| `configs/project.example.toml` | 可公开的配置字段说明。实际配置放在本地忽略的 `configs/project.local.toml`。 |
| `media/sources/<source_id>/` | 私有原片、来源侧车和媒体探测摘要。 |
| `standard-assets/` | 私有人物、场景、构图及版本清单。 |
| `workflows/` | 私有工作流副本或版本记录。运行以指定设备目录的实际图为依据。 |
| `runs/<run_id>/`、`docs/runs/<run_id>/` | 私有回执、两版输入清单、执行状态和文字运行说明。 |
| `outputs/<run_id>/` | 按视频、角色版本和尝试存放已取回的 MP4。 |
| `docs/local/`、`docs/archive/` | 私有设备定位说明、早期需求和实验档案。 |
| `.local/`、`tooling/` | 本地维护资料和历史设备工具。 |

本地工作区的既有实验及早期资料按原路径与版本追溯。本地 `docs/local/README.md` 提供设备定位和归档索引。公开历史入口为变更记录和脱敏实验摘要。[配置样例](<../../configs/project.example.toml>) · [变更记录](<../CHANGELOG.md>) · [历史 H3 摘要](<../evidence/H3基础用例公开摘要.md>)

<a name="offline-checks"></a>

## 离线维护命令

在项目根使用 Python 3.11+ 和 Git。开发依赖可在本项目的虚拟环境安装。

```bash
python -m pip install -e ".[dev]"
python scripts/bootstrap_workspace.py
python scripts/check_project_docs.py
python scripts/check_release.py
python -m unittest discover -s tests -v
```

| 命令 | 可核验的范围 |
| --- | --- |
| `bootstrap_workspace.py` | 初始化其清单中的本地数据目录。 |
| `check_project_docs.py` | 需求编号、验收映射、公开文档链接与运行记录结构。 |
| `check_release.py` | 双语入口、项目边界和八张公开展示图。 |
| `check_repository.py` | 检查当前 Git 索引中的全部文件，包括本次暂存改动和其余已跟踪内容。 |
| `check_character_lock.py` | 私有角色清单、固定图片及批准状态。使用正式人物素材前执行，资产缺失或哈希不符会停止。 |

项目的目录规则与公开范围以维护约束和发布规范为准。路线接通状态按实际提交与取回记录登记。[维护约束](<../../AGENTS.md>) · [同步与发布](<publication.md>) · [流程验证](<../verification/acceptance.md>)
