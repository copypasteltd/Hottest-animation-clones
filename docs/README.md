# AI动作迁移库 · 文档导航 / Documentation index

[English overview](<../README.md>) · [中文概览](<../README.zh-CN.md>) · [Detailed English solution](<en/solution-and-usage.md>) · [更新说明](<CHANGELOG.md>)

## 1. 从哪里开始 / Reading paths

| 目的 | 推荐阅读顺序 |
|---|---|
| 首次了解项目 | 根README → 项目总纲12 → 数据契约13 |
| 安装并核查现有仓库 | 根README第3节 → 维护规范15 → 贡献指南 |
| 使用当前人物／构图 | SA02及历史规则16 → S02规则17 → BM01与JK03退役规则19 |
| 设计生产管线 | 总纲12 → 契约13 → 验收矩阵14 → 采集模板／Schema |
| 维护和推送变更 | AGENTS → 发布规范18 → CONTRIBUTING → CHANGELOG |

Begin with either root README for a complete overview and actual commands. The detailed documents retain requirement IDs, decision history and constraints; they are not an already implemented inference system.

**阅读优先级**：当前用户明确决定与分项批准记录 → 当前角色／构图版本清单 → 对应详细规格 → README概览。历史文档中的旧状态不能覆盖较新的决定，维护文档也不能自行将待确认候选升级为已批准。Read the latest scoped decisions before using historical asset rules; this navigation does not grant generation, frontend or publication rights for private media.

## 2. 当前状态 / Current state

- **公开实现**：需求／契约、虚构记录、Python初始化、文档检查、Git索引边界和本地角色锁。无前端、演示页面或预览服务。
- **未实现**：通用源身体／双手推理、标准动作视频生产、可检索双库和下游A/B完整闭环。需求46项、产品案例29个均不代表已运行模型验收。
- **SA02**：原正面根图已批准，红白服装及2D画风不变；新正／侧／背／脸部四视图已生成并查看，**待用户确认**，与根图／当前清单分开。
- **BM01**：用户批准的蓝白鲸尾真人角色，关联正面与四视图已锁定，无椰子／吸管；不继承JK03年龄或148cm。
- **S02与构图**：场景为纯白＋浅灰地面网格；当前F01/F02为保留SA02膝部／全身，F05/F06为BM01新膝部／全身，已查看但未逐张获用户确认。
- **JK03**：正式角色／构图及重复交付产物已按用户选定范围删除，其他独立历史候选保留。旧清单仅历史，不恢复作当前输入。
- **版本读取**：人物current→selection.v2，构图current→s02-master-set.v2。图片、真实清单和任务回执均在本地忽略区，不随公开源码分发。

Approval of a still or four-view sheet does not approve every derived composition, motion, body/hand track, target model or redistribution right. The new SA02 sheet remains pending; this documentation update does not promote it.

## 3. 现有命令 / Existing tools

从已安装Python 3.11+和Git的项目根执行；完整虚拟环境与安装说明见根README：

```bash
python -m pip install -e ".[dev]"
python scripts/bootstrap_workspace.py
python scripts/check_project_docs.py
python scripts/check_release.py
python -m unittest discover -s tests -v
python scripts/check_repository.py
```

- 初始化仅创建本地忽略目录，不填充数据／模型。
- 文档与测试不调用生成网关、不启动服务、不需要GPU或私有图片。
- 索引检查要求非空Git索引；工作区修改需显式暂存后才能检查对应新内容。
- `python scripts/check_character_lock.py`是私有资产校验，不包含在公开克隆必须通过的命令组。公开克隆缺文件应退出1并返回`stop_no_fallback_no_regeneration`，不能自动下载或生成替代品。
- 当前角色锁检查已批准SA02／BM01及BM01四视图，不自动激活待确认SA02四视图，也不代替构图／视频视觉审核。

## 4. 核心规格与资产规则 / Specifications

| 文档 | 主要内容与定位 |
|---|---|
| [12 · 项目总纲](<12-项目需求梳理与实现方案总纲.md>) | 项目范围、46项需求、双分支依赖与风险 |
| [13 · 数据与skill契约](<13-双库数据契约与Skill执行规范.md>) | ID／版本、来源、时间／坐标、缺失、审核、执行恢复与适配 |
| [14 · 实施与验收](<14-实施计划与验收矩阵.md>) | 校准／冻结评估、29个计划案例、两目标A/B与预算 |
| [15 · 路径和开源维护](<15-项目路径结构与开源维护规范.md>) | 公开／私有目录、Git与发布前检查 |
| [16 · SA02及历史选择](<16-定稿角色SA02与JK03使用约束.md>) | SA02根图约束、新待确认四视图及旧决策历史；不恢复JK03 |
| [17 · S02与当前构图](<17-S02场景定稿与四张构图母版规范.md>) | 场景锁、F01/F02/F05/F06、取景与独立审核边界 |
| [18 · 发布与持续同步](<18-开源发布与持续同步规范.md>) | 用户明确范围、双语同步、正常push与失败处理 |
| [19 · BM01与JK03退役](<19-BM01真实角色替换与JK03退役约束.md>) | BM01批准范围、固定hash、删除边界与当前人物清单 |
| [English solution and usage](<en/solution-and-usage.md>) | 完整英文架构、使用逻辑与限制 |

文档16保留历史标题／文件名以维护旧链接；其顶部现行补充和文档19优先于历史JK03生产规则。角色、场景和构图分别版本化，任何新图都不能静默覆盖已冻结根图。

## 5. 模板、样例与证据 / Examples and evidence

| 资料 | 用途与限制 |
|---|---|
| [动作采集模板](<templates/动作采集与入库模板.md>) | 区分采集意图与实际观测，填写核心事件、可见性和审核范围 |
| [汇总JSON Schema](<schemas/dual-library-record.schema.json>) | 记录形状检查，不验证实际媒体／数值轨迹和业务通过 |
| [虚构双库记录](<examples/dual-library-record.example.json>) | 明确未执行的结构示例，不能当真实来源或批准证据 |
| [H3历史公开摘要](<evidence/H3基础用例公开摘要.md>) | 既往约13秒本地试验及偏差，不代表当前人物或通用管线已通过 |
| [无敏感配置样例](<../configs/project.example.toml>) | 可移植字段模板；默认关闭联网、远程生成和模型下载 |

源视频／语义是共同基础；源骨架直接来自原片，生成片骨架只作独立质检。保持原速、根位移、朝向和unknown，身体／手部／视觉／对齐／下游模型各自判定。标准片二次参考可能累积误差，必须通过原片A／标准片B的实际对照验证。

## 6. 维护与权利 / Maintenance and rights

[项目长期约束](<../AGENTS.md>) · [贡献指南](<CONTRIBUTING.md>) · [治理](<GOVERNANCE.md>) · [安全](<SECURITY.md>) · [第三方材料](<THIRD_PARTY_NOTICES.md>) · [更新说明](<CHANGELOG.md>)

**未经用户明确指示并给出要求与约束，不得构建前端、交互页、Dashboard或预览服务。** README、录制、发布与继续项目不包含自行开发界面的权限。文档维护不生成新媒体，不修改人物批准状态，不运行Docker／WSL或模型服务。

授权变更需同步双语README与相关规格、样例／测试、更新说明；检查后正常提交推送，并核验远端commit。用户要求先审阅／暂不推送时优先遵守，不force、不泄露私有素材。源码MIT不自动授权第三方角色、音乐、视频、模型或人像再分发。所有实际同步／CI结果以执行证据为准，不预填成功。
