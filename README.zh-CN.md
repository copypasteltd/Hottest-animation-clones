# Hottest Animation Clones · AI 动作迁移库

提交 Bilibili、X 或抖音作品链接，取得项目基准人物在白色场景里复现源动作的视频。

[简体中文](<README.zh-CN.md>) · [English](<README.md>) · [文档导航](<docs/README.md>) · [更新说明](<docs/CHANGELOG.md>)

## 从作品链接到成片

| 步骤 | 处理方式 |
| --- | --- |
| 1. 下载 | 用 `/ra-video-download` 下载指定作品。通过媒体探测后登记原片、来源和实际下载结果。 |
| 2. 判断 | 回看原片关键动作，分别判断半身／全身及单人／多人，记录可见部位和关键时刻。 |
| 3. 选图 | 按项目角色预设、站姿等场景、取景和表演者人数匹配对应版本的目标替换图。 |
| 4. 替换 | 在 4090 ComfyUI 的 `user/default/workflows/社区精选H3_人物与场景替换_实验` 下选用匹配的 H3 工作流，传入源视频与目标图，按原任务回执取结果。 |
| 5. 交付 | 核对媒体、目标人物、S02 场景及关键动作与节奏，交付通过审核的基准白模视频。 |

常规任务只需提交链接。项目预先配置常用角色和可执行路线。坐姿可扩展为独立预设，按实际动作再选半身或全身。当前资产覆盖 S02 站立单人图，多人路线需有匹配目标图、工作流与实测。[产品需求](<docs/12-项目需求梳理与实现方案总纲.md>) · [运行与交付规范](<docs/13-动作迁移运行与交付规范.md>)

## 基准人物与 S02

S02 采用纯白背景和细浅灰地面网格。半身目标使用膝部中景，适用于以上身和手势为主的动作。全身目标保留头脚与地面，适用于脚步、转身和位移决定动作的片段。源片只拍到腰部时也可选半身目标，腿部运动按原片能提供的证据核定。[当前构图规范](<docs/17-S02场景定稿与四张构图母版规范.md>)

| SA02 · 二次元亚斯娜 | BM01 · 蓝白鲸尾写实角色 |
| --- | --- |
| ![SA02 已批准正面基准](<docs/images/characters/sa02-front-v1.png>) | ![BM01 已锁定正面基准](<docs/images/characters/bm01-front-v1.png>) |
| 栗色长发、红白骑士服。正面基准已批准。 | 蓝灰长发、蓝白鲸尾女仆服、双手空置。关联正面基准已锁定。 |
| ![SA02 待确认四视图](<docs/images/characters/sa02-four-view-candidate-v1.png>) | ![BM01 已批准四视图](<docs/images/characters/bm01-four-view-v1.png>) |
| 辅助四视图待确认。 | 四视图已批准。 |
| ![F01 SA02 膝部中景](<docs/images/characters/sa02-s02-knee-v1.png>) | ![F05 BM01 膝部中景](<docs/images/characters/bm01-s02-knee-v1.png>) |
| **F01** 半身，既有已查看构图。 | **F05** 半身，已视觉检查，待逐图用户确认。 |
| ![F02 SA02 全身](<docs/images/characters/sa02-s02-full-v1.png>) | ![F06 BM01 全身](<docs/images/characters/bm01-s02-full-v1.png>) |
| **F02** 全身，既有已查看构图。 | **F06** 全身，已视觉检查，待逐图用户确认。 |

运行使用私有工作区当前清单中的正式文件。JK03 已退役。展示副本的校验信息及公开范围见图例和发布规范。[SA02 使用约束](<docs/16-SA02二次元角色使用约束.md>) · [BM01 与 JK03 退役](<docs/19-BM01真实角色替换与JK03退役约束.md>) · [展示清单](<docs/images/characters/manifest.json>) · [发布规范](<docs/18-开源发布与持续同步规范.md>)

## 当前项目进度

已有静态人物和构图、本地历史 H3 样片、文档与记录结构、Python 维护脚本。历史样片证明既有 H3 流程曾使用源视频和一张同时含目标人物与场景的参考图出片，抽样发现手型、时序及脚部出框偏差。三站下载接入、判断与选图、S02 路线绑定、4090 调度和成片审核编排仍待实现，逐路线通过后登记覆盖。[H3 历史证据](<docs/evidence/H3基础用例公开摘要.md>) · [计划验收](<docs/14-实施计划与验收矩阵.md>)

## 工作区与离线检查

源片和来源侧车在 `media/sources/`，本地运行记录在 `runs/`，文字审核在 `docs/runs/`，通过审核的成片在 `outputs/`。正式角色、场景及构图都在 `standard-assets/`。公开内容包括项目文档、虚构样例、维护工具和上面八张授权展示副本。[目录维护规范](<docs/15-项目路径结构与开源维护规范.md>)

在项目根使用 Python 3.11+ 和 Git。

```bash
python -m pip install -e ".[dev]"
python scripts/bootstrap_workspace.py
python scripts/check_project_docs.py
python scripts/check_release.py
python -m unittest discover -s tests -v
python scripts/check_repository.py
```

使用本地正式人物素材前运行 `python scripts/check_character_lock.py`。公开克隆只有展示副本，缺少正式角色清单或文件时角色锁会明确停止。文档维护、校验和同步流程见项目约束。[AGENTS.md](<AGENTS.md>)
