# Hottest Animation Clones · AI 动作迁移库

项目目标是将一条 Bilibili、X 或抖音视频链接转换为两份 S02 动作迁移 MP4，SA02 二次元和 BM01 写实各一份。

[简体中文](<README.zh-CN.md>) · [English](<README.md>) · [文档导航](<docs/README.md>) · [变更记录](<docs/CHANGELOG.md>)

## 从作品链接到成片

用 `/ra-video-download` 下载完整原片，判断取景和表演人数，为 SA02 和 BM01 分别匹配目标图。两版各自用整条原片调用指定 4090 的 H3 工作流。每版取回即交付，跳过成品校验和审查。[产品需求](<docs/product/requirements.md>) · [执行手册](<docs/operations/runbook.md>)

当前已有规格、运行记录结构、离线维护工具、静态参考资产和历史 H3 样片。从链接到成片的生产编排仍待实现。三站下载接入与 S02 整片双版本路线待试跑。[当前进度](<docs/product/status.md>) · [流程用例](<docs/verification/acceptance.md>)

## 基准人物与 S02

S02 采用纯白背景和细浅灰地面网格。当前四张构图覆盖站立单人，半身使用膝部中景，全身保留鞋底和地面。[S02 与目标图](<docs/assets/reference-images.md>)

| SA02 · 二次元亚斯娜 | BM01 · 蓝白鲸尾写实角色 |
| --- | --- |
| ![SA02 已批准正面基准](<docs/images/characters/sa02-front-v1.png>) | ![BM01 已锁定正面基准](<docs/images/characters/bm01-front-v1.png>) |
| 栗色长发、红白骑士服。正面基准已批准。 | 蓝灰长发、蓝白鲸尾女仆服、双手空置。关联正面基准已锁定。 |
| ![SA02 待确认四视图](<docs/images/characters/sa02-four-view-candidate-v1.png>) | ![BM01 已批准四视图](<docs/images/characters/bm01-four-view-v1.png>) |
| 辅助四视图待确认。 | 四视图已批准。 |
| ![F01 SA02 膝部中景](<docs/images/characters/sa02-s02-knee-v1.png>) | ![F05 BM01 膝部中景](<docs/images/characters/bm01-s02-knee-v1.png>) |
| **F01** 半身定稿。 | **F05** 半身定稿。 |
| ![F02 SA02 全身](<docs/images/characters/sa02-s02-full-v1.png>) | ![F06 BM01 全身](<docs/images/characters/bm01-s02-full-v1.png>) |
| **F02** 全身定稿。 | **F06** 全身定稿。 |

正式任务使用本地清单中的定稿原件。展示清单保留发布时的图例状态。JK03 已退役。[SA02](<docs/assets/sa02.md>) · [BM01](<docs/assets/bm01.md>) · [展示清单](<docs/images/characters/manifest.json>)

## 工作区与离线检查

在项目根使用 Python 3.11+ 和 Git，并在项目环境安装开发依赖。[工作区与维护命令](<docs/maintenance/workspace.md>)

```bash
python -m pip install -e ".[dev]"
python scripts/check_project_docs.py
python scripts/check_release.py
python -m unittest discover -s tests -v
```

使用本地正式人物素材前运行 `python scripts/check_character_lock.py`。公开克隆缺少正式文件时，该检查会指出缺失项。[维护约束](<AGENTS.md>) · [发布规范](<docs/maintenance/publication.md>)
