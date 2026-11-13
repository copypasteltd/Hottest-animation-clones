# 双库数据契约与skill执行规范

- 版本：v0.3，2026-11-13。
- 配套：[项目总纲](12-项目需求梳理与实现方案总纲.md)、[实施与验收矩阵](14-实施计划与验收矩阵.md)。
- 本篇为拟实现契约，未实现轨迹提取器、素材库后端或可安装skill。字段与样例的结构通过不等于业务质量通过。

## 1. ID与版本关系

### 1.1 身份分层

| 对象 | 身份示例 | 最低关系 |
|---|---|---|
| CollectionPlan | plan_<uuid>@revision | 采集目标、意图、反例和期待范围 |
| SourceVideo | src_<content_hash_prefix> | 原片指纹、媒体时间/来源/用途 |
| SourceGroup | group_<uuid> | 同次表演来源关系及确认依据 |
| Occurrence | occ_<uuid>@revision | 固定源、主体、核心/上下文区间 |
| ActionDefinition | act_<uuid>@revision | 语义、不变量、允许变化、实例支持 |
| Family/Variant | fam/var_<uuid>@revision | 关联定义与实例，非时间父子 |
| EventSet | evtset_<uuid>@revision | 实际观测的事件、证据/未知和时间 |
| NormalizationSpec | norm_<uuid>@revision | 时间、镜像、坐标、锚点与变换策略 |
| PoseTrack | pose_<uuid>@revision | 源/生成来源、实例、模型/映射/轨迹 |
| CanonicalVisual | vis_<uuid>@revision | 源实例、标准角色/场景/构图及生成运行 |
| AlignmentReview | align_<uuid>@revision | 固定源事件、视觉及可选生成轨迹 |
| ReferenceBundle / UsageRun | bundle/use_<uuid> | 固定发布版本、目标角色/模型和真实结果 |
| StageAttempt / ReviewRecord | attempt/review_<uuid> | 阶段能力/结果与对指定版本的评审 |

ID稳定，内容实质变化增加revision。源内容hash改变必须新源；移动路径/改文件名不改变内容身份。角色、场景、构图、词表、schema、骨架映射、提取器、工作流、权重与模型规格均独立版本化。

### 1.2 必须可追溯的链

```text
action_id@definition_rev
  └─ occurrence_id@occurrence_rev + eventset_id@eventset_rev
       ├─ source_id + content_hash + source_core_range
       ├─ source_pose_id@pose_rev + normalization_id@norm_rev
       └─ visual_id@visual_rev
            ├─ same occurrence_rev / eventset_rev
            ├─ character_rev + scene_rev + framing_rev + workflow/model revision
            └─ optional generated_pose_id@rev
       alignment_id@rev 引用上面固定版本，不引用“latest”
```

同一动作定义可有多实例、多轮生成及多轨迹版本。骨架与视觉各自引用同一源实例，不依赖生成后反推。source_pose中`origin_kind=source`；generated_pose中`origin_kind=generated`，必须有visual_ref。两者不能互相覆盖。

## 2. 每类记录的最低字段

### 2.1 采集计划与源片

| 字段 | 含义与约束 |
|---|---|
| capture_intent | 想找的手型/顺序、身体范围、连续长度与困难反例，只是目标 |
| source_id / content_hash | 原片身份，hash至少SHA256，缺文件时为未提供而不是虚构hash |
| origin_refs / group_relation | 来源链接、取得时间、原题/备注、same/independent/unknown及证据 |
| allowed_uses / rights_evidence | 编目、提取、生成、商用、再分发分别登记；未知保持可见 |
| media_info | 宽高、旋转、视频/音频stream、fps有理数、PTS时间基、各stream起点/时长 |
| source_mirror_status | mirrored/unmirrored/unknown，附判断依据 |
| observation_scope | 实际单人/镜头、可见部位、遮挡/模糊/出框区间，未分析则unknown |

独立来源数仅计经确认彼此独立的来源组。两个关系unknown的视频只能称两个实例，不得当作两组独立共识。采集前目标不能复制进实际观测。

### 2.2 实例、定义与事件

实例：occurrence_id、revision、source_ref、performer_track、core_range_us、context_range_us、granularity（primitive/phrase/routine）、parent_refs、required_body、quality_scope、eventset_ref。

定义：action_id、revision、taxonomy_revision、名称/别名、粒度、初始/结束、步骤、不变量、允许变化/禁止变化、实例与代表、家族/变体、独立组数、暂定/多源状态。

事件：event_id、type、source_range_us、local_range_us、anchor_definition、anchor_us、body_part、手型/掌面/双手关系、左右依据、观测状态、evidence_refs、审核。

事件观测状态区分observed / inferred / manual_verified / unknown。manual_verified必须有实际可见证据；人工不能确认源片未拍到的脚或被遮挡指尖。动态事件记录连续观测覆盖、采样时刻和间隙；稀疏首尾相同不能证明中间动作相同。

### 2.3 标准角色、场景与构图

角色：版本、锚点与辅助图hash、年龄/风格意图、体型/服装、手/指结构、遮挡限制、已审外观要素。

场景：版本、空场参考hash、墙地/光照/颜色、无道具限制、镜头与阴影意图、可控性声明（AI视觉参考/真实3D渲染）。

构图：版本、半身/全身、目标画幅、工作分辨率/对齐规则、必要部位与安全边界、允许位移与镜头变化、源起姿/前导策略。阈值需要试产校准，未冻结时不得宣告构图已验证。

### 2.4 视觉记录与来源骨架

视觉：visual_id、revision、固定source/occurrence/eventset、角色/场景/构图版本、模型/权重/工作流/提示hash、种子或unknown、队列receipt、输出规格/时间映射、所有attempt及审核。

轨迹：pose_id、revision、origin_kind、source_ref或visual_ref、occurrence_ref、adapter/model/weights版本、native_skeleton_id、canonical_mapping_id、coordinate_spaces、time_axis、artifact、point_status、repair_history、normalization_ref及scope。

来源明确不代表提取准确。原轨迹自动估计仍需审核；生成轨迹不能用于填补源轨迹后声称“源动作已观测完整”。

## 3. 时间与空间契约

### 3.1 时间

- 整数微秒表示绝对源时间与局部时间；区间统一半开`[start_us,end_us)`，满足0≤start<end≤视频可用范围。
- context包含core，不能跨不同人物/镜头拼成连续动作。
- source PTS和源帧索引均保留；帧索引从0起。VFR不能只用index/fps推算。
- `t_stage → t_occurrence → t_source`在真实对应区间通过显式单调映射实现。映射样本增加`mapping_kind=source_resample / synthetic_prefix / repeated_tail / synthetic_transition`与`source_correspondence_valid`；真正对应源帧时才填写`source_timestamp_us`。合成前导/过渡没有真实源对应时该值为null，不能夹到0或假写源PTS；重复尾帧可填`anchor_source_timestamp_us`说明复制来源，但`source_timestamp_us`仍为null，不当成新的源观测。对齐指标只在有效源对应和明确事件映射区间计算，合成区间单列。
- 原片、骨架提取、生成工作副本、导出各自fps和时间戳，不强制原数据24fps；H3适配按24fps并保存映射。
- 音频stream起点与视频stream起点分开保存；原音packet相同不证明生成动作踩拍正确。
- 重采样映射可保存到JSONL或数值数组，逐样本给source_timestamp_us与sample_timestamp_us。动作事件的生成对应关系是质检结果，不与媒体PTS映射混同。

### 3.2 骨架与坐标

核心拟定`body17_hands21_v1`，身体COCO17命名集合、左右手各21点。点序和名称写入skeleton definition，足部/面部作为声明扩展保留native数据。身体腕点与hand wrist分别保留观测；融合点独立派生，准确率不双重计数。

坐标空间：

| 空间 | 定义 | 禁止误用 |
|---|---|---|
| native | 原模型轴向、原点与单位 | 未声明时不得发布统一轨迹 |
| source_pixel_2d | 显示方向校正后的像素，x右/y下 | 裁切/旋转需反映射到同一源画面 |
| source_norm_2d | x/W、y/H | 宽高单位不同，计算距离前转统一尺度 |
| body_local_2d | 像素减anchor后按可靠躯干尺度等比例缩放 | anchor不同不直接比较，不删根轨迹 |
| hand_local_2d | 手局部形状与手腕相对身体位置配套 | 不仅保留局部形状而丢空间手势关系 |
| estimated_3d | 可选，显式轴向、尺度/单位、相机与估计来源 | 不称真实动捕，不自动拼接不同手/身world原点 |

归一化保存anchor_method、scale_method、每样本变换、无效掩码、inverse/原始坐标引用。尺度过小、anchor丢失时标invalid，不产生巨值；fallback方法单独标签。朝向、根部运动、尺度变化、相机运动和镜像信息保留，不用“统一居中”抹掉行进/转身。

### 3.3 数值文件最低要求

可选择NPZ/Parquet/JSONL等开放容器，adapter必须声明数组名、shape、dtype与点序。最低语义字段：

```text
sample_timestamp_us[T]
source_timestamp_us[T]  # 合成区间可null/NaN，另有source_correspondence_valid[T]
mapping_kind[T] + optional anchor_source_timestamp_us[T]
points[T,J,D]
score[T,J] + score_kind + adapter_version
valid_mask[T,J]
observation_state[T,J]
skeleton_definition + coordinate_definition
normalization_transforms + invalid_transform_mask
```

JSON缺失坐标用null；数值容器可NaN并附mask。不得以(0,0)隐含缺失。visibility、presence、detector score不是同一量；模型不提供的字段标not_provided，不编造概率。

raw、repaired、normalized分别存储。repair声明区间、算法、人工点和参数；短缺口可按策略插值，但切镜/主体切换/长关键缺失不得跨越补造。读取NPZ不启用pickle。骨架预览只是按某渲染配置派生的媒体，颜色、线宽不写死为主数据含义。

## 4. 双库独立审核与发布

### 4.1 规则

每条ReviewRecord包含subject_id/revision、scope、reviewer、时间、方法、证据、结论、findings与pass_contract版本。

结论：not_run / needs_review / passed / failed / not_applicable。未知关键事件不能写passed；required维度不得用not_applicable绕过。not_applicable需要scope依据，例如“上半身动作无需脚步评审”，不能解释为“手拍不清所以不评手”。

| 产物 | 独立发布条件 |
|---|---|
| 源片/整舞收藏 | 指纹/来源/可播放检查，有缺陷可标受限 |
| 动作定义 | 事件、不变量与来源可追溯，经过语义审核 |
| 身体轨迹 | 结构/时间/映射通过，所需身体点质量审核通过 |
| 手部轨迹 | 对所需左右手及决定性指节单独通过，不能借身体分数 |
| 标准视觉 | 角色/场景/构图与声明动作范围可用，无未处理的required事件错误 |
| 双库配对 | required身体/手部、视觉及源→标准事件对齐均通过 |
| 目标模型已验证 | 对固定参考包/角色/模型/模式的真实使用通过 |

某资产可留候选或部分可用，不导致其原片删除。双库配对失败时仍可发布独立源轨迹或可用原片，但默认“完整双库”检索不得返回。

### 4.2 对齐

AlignmentReview必须固定source EventSet和visual revision；每个required事件记录源锚点、生成对应锚点/区间、匹配状态与误差。允许missing/reversed/uncertain，不强行建立映射。时间偏差在0整体平移补偿下主报，若提供对齐后分数另列，不能用DTW把丢失/颠倒事件隐藏。

自动姿态距离仅在双方骨架/视角/尺度/有效点可比时计算，报告可比条件和有效覆盖；手部缺失不能拿身体误差给细手势通过。生成片姿态质检可选，原片与标准片人工事件对照是必需，不能由生成模型自评替代。

### 4.3 事前通过约定pass_contract

包含：所需动作/部位、全部required事件及顺序、关键手型/接触、原/输出时间模式、允许伸缩/偏差、外观/场景/构图要素、严重伪影清单、未知/不可评估处理、评审者、尝试预算和判定规则。

校准后冻结；修改约定产生新版本并使相关结论重新评审，不能看结果后改原通过线。缺少任何required项证据，状态只能needs_review/failed。

## 5. 归档与文件边界

以下为未来实施目录，不表示均已创建：

```text
AI动作迁移库/
  docs/                         # 所有文档、模板、skill说明、提示词、报告
    templates/
    runs/<run_id>/
    bundles/<bundle_id>/
    skills/motion-library/
  media/sources/<source_id>/    # 用户主动导入的原片与机器清单
  catalog/                     # 定义、事件、来源关系、评审记录
  standard-assets/             # 角色、场景、构图的媒体与机器配置
  assets/<action_id>/
    <occurrence_id>/
      source-pose/<pose_rev>/
      normalized-pose/<pose_rev>/
      canonical-visual/<visual_rev>/
      generated-pose-check/<rev>/
      alignment/<review_rev>/
  runs/<run_id>/                # 状态、请求、回执、日志、缓存、失败证据
  indexes/                     # 可重建全文/向量索引
  exports/<bundle_id>/          # 媒体、姿态与manifest；人读说明在docs/bundles
```

媒体引用为project-relative路径；拒绝`..`、根外绝对路径和指外symlink/junction。schema文档和示例在docs下；未来机器数据目录不存说明文档。远程已有ComfyUI可以在具体运行任务获得授权后使用，远程产物的device/path/hash与本地映射明确记录，不用远程绝对路径冒充本地文件。

Artifact字段最低为artifact_id、role、path、media_type、hash、bytes、state。state为planned / present / missing / invalid；planned路径为空或显式未存在，present必须有实际文件与hash校验；路径存在也不等于内容质量通过。

## 6. skill与执行器契约

### 6.1 用户操作模式

| 操作 | 输入 | 输出 | 不隐式包含 |
|---|---|---|---|
| plan_collection | 想收的动作/部位/难点 | 待采卡与反例 | 自动抓平台 |
| ingest | 项目内来源文件/清单 | 指纹/PTS/适用性/逐项终态 | 假动作语义 |
| annotate | 视频实例与粒度 | 事件、定义、未知和待审 | 仅缩略图推断整段 |
| extract_pose | 固定实例与提取规格 | 原生轨迹与审核材料 | 标准人先生成 |
| normalize_pose | raw/repaired轨迹和归一化版本 | 局部轨迹与变换 | 伪造3D真值 |
| canonicalize | 源实例、角色/场景/构图、模型与预算 | 标准视觉候选、回执、真实结果 | 未授权批量生成 |
| consolidate | 实例/定义/来源关系 | 家族/变体与代表建议 | 删除成员 |
| review | 指定版本与scope | 独立评审、对齐关系 | 自动冒充人审 |
| prepare | 选中资产、目标角色与模型 | 参考包与约束损失 | 默认外部上传/付费 |
| record_usage | 实际输入、结果与配置 | 适配经验/A-B比较 | 修改源事实 |
| resume | run/attempt引用 | 查明实际状态后继续 | 盲目重提远程任务 |

skill文档未来放docs/skills内，执行脚本可以同包或项目tooling内。本轮只定义契约，不创建已安装skill。

### 6.2 请求与状态

请求最低字段：run_id、operation、project_root、input_refs、definition/occurrence版本、requested_scope、profile_refs、stop_after、review_policy、resource_budget、network_policy、external_targets及document_output_root。

阶段依赖：ingest→annotate；annotate后source pose与canonical visual各自可执行；source pose→normalize/preview；visual可选→generated pose；上述结果→独立审核→alignment→按scope发布→检索/导出。单GPU允许顺序执行，不改变数据依赖。

StageAttempt包含：stage/attempt_id、idempotency_key、状态、输入/配置hash、checkpoint、开始/结束、device、external_receipt、outputs、errors、取消原因和资源消耗。

运行状态：planned / ready / running / waiting_input / waiting_review / completed / partial / failed / cancelled / unknown。运行completed只表示请求阶段完成，不更新业务审核为passed。

### 6.3 缓存、恢复与重复提交

- 幂等键采用`hash(stage＋该stage实际依赖的固定版本投影)`，不能把全部项目配置统一塞入每个stage。源提取只依赖源hash/区间/主体、提取模型权重、native输出schema与提取配置；归一化再依赖raw/repaired轨迹、骨架映射和归一化策略；视觉依赖源实例/事件集、角色/场景/构图、模型/工作流/提示与生成配置；审核/索引/导出分别依赖它们实际引用的版本。词表只影响语义及依赖语义阶段，角色改版不改变source pose缓存键。
- 提交前持久化submission_intent；得到prompt_id后保存receipt。网络超时无receipt时为unknown，查询queue/history按client/task关联；查不明不能无条件重提。
- 恢复从最后有效checkpoint开始，校验输出hash和依赖。视觉失败不重跑source pose；仅角色改版重跑视觉与其下游。
- 重试只能针对可恢复错误，并有次数/时间/费用预算；所有attempt保留。资源降级改配置版本并写loss_report。
- 取消只中断当前明确拥有的任务，保留其他用户队列，不全局清空。无法安全取消则停止新增提交并报告。
- 不自动重启共用服务、不全局安装依赖；环境变更需要具体实施任务明确范围。

### 6.4 版本失效矩阵

| 改变 | 需要重新处理/审核 | 不受影响 |
|---|---|---|
| 来源显示名/位置 | 引用重连、索引 | 内容hash、原定义和历史 |
| 核心区间/主体 | 片段、事件、骨架、视觉、对齐、相关包 | 原源文件 |
| 关键事件/手型 | 定义/家族、相关hand/body语义审核、visual语义审核、alignment、相关包与A-B结论重新评审；旧visual固定旧eventset不得直接认领新版；经重审适用可建新revision绑定记录，否则重新生成 | 与其无关raw pose及原视觉媒体字节可保留，不代表审核仍有效 |
| 源pose模型/映射 | 新轨迹、归一化、轨迹检索和相关评审 | 已有视觉不重生成，但对应对齐评审更新 |
| 归一化策略 | 新normalized、相似索引和有关比较 | native raw、视觉 |
| 角色/场景/构图 | 新visual、generated check、alignment、相关包 | source pose、源观测 |
| 生成模型/工作流 | 新visual及下游 | source pose/源原片 |
| 许可/用途状态 | 用途门禁与导出状态重查 | 历史证据不擦除 |

历史参考包始终固定旧版本，不偷偷跟随最新资产。

## 7. 导出包与目标模型兼容

可选导出类型：原视频参考、标准视觉参考、数值骨架包、骨架渲染视频、审核对照。不能将类型互相冒充。

manifest应包含文件角色（motion/identity/timing/background/evidence/instruction）、固定版本、hash、源区间与时间/空间变换、source/standard/generated来源、模型规格/核验日期、未满足约束、用途与审核状态。

用户目标角色参考图与标准示范角色分开。提示词说明动作片负责运动、目标图负责外观；仍要实测身份/背景泄漏。上传版不烧入审核标注；说明与提示词在docs/bundles内，媒体在exports内。

模型能力分别声明：RGB参考、图片参考、独立音频、骨架视频、数值姿态、3D绑定。状态documented / verified / unsupported / unknown。当前H3只验证RGB参考路径，结构化坐标和骨架视频未验证，不能将未验证能力出成“直接可用”包。

## 8. 契约示例与校验范围

[记录样例](examples/dual-library-record.example.json)是一条完全虚构、尚未执行的动作记录，原片/角色/场景/轨迹/视觉文件均未提供，review为not_run，不能用于证明运行效果。

[JSON Schema草案](schemas/dual-library-record.schema.json)定义汇总记录的字段、引用和状态形状，不是所有数值轨迹容器的完整schema，也不替代上述业务规则。业务校验还必须检查：源区间/映射有效、版本存在、point mask/shape一致、来源分支、required review不可绕过、present文件hash/解码、同源计数、外部回执与预算。

完整系统实现前，不把“样例通过结构校验”记为骨架提取/生成能力已验收。
