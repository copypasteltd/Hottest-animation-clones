# /update-ai-clone 安装与使用指南

**已核验版本：1.0.0。** 这是维护现有动作迁移库的 DeepSeek Harness（DSH）全局技能入口。它串联作品链接、原片下载与批次分流、按回执跟进 H3、画像与定稿归档，以及本机视频库刷新。不创建新仓库，也不是绕过运行核验的一键渲染器。

[安装](<#install>) · [会话用法](<#usage>) · [命令参考](<#cli>) · [排障与发布边界](<#troubleshooting>) · [English quick start](<#english>)

<a name="install"></a>

## 1. 安装与验证

**先取得可信的完整本地包。** 已装的机器可在 DSH 技能管理器中定位 `update-ai-clone` 的资源目录；另一台机器从维护者提供的完整目录或压缩包导入。**本仓库提供安装使用文档，不分发该技能包；克隆仓库不会安装技能或复制私有素材。** 不要把上游 `ra-video-download` 仓库当成 `update-ai-clone` 的发行地址，也不要只复制 `SKILL.md`。

完整包的根目录名和 `SKILL.md` 中的 `name` 均为 `update-ai-clone`，应包含：

```text
update-ai-clone/
├── SKILL.md
├── PACKAGE.md
├── project.local.json
├── scripts/
│   ├── update_ai_clone.py
│   └── selftest.py
└── references/
    ├── workflow.md
    └── ra-video-download/
        ├── SKILL.md
        ├── LICENSE
        ├── UPSTREAM.md
        ├── agents/openai.yaml
        └── scripts/download_media.py
```

1. **导入前检查**：核对包的版本与来源、保留文件层次和下载组件许可，确认不存在越界路径或链接。先确定实际的 DSH 全局技能目录；默认目标为该 DSH 数据目录下的 `skills/update-ai-clone/`，不是 Codex 的技能目录。发现已有同名技能，先比对版本和差异，不覆盖。
2. **安装到全局范围**：优先用 DSH 技能管理器导入，或在 DSH 会话中用下面的请求。把占位符换成可信的本地包路径。全局安装适用于同一 DSH 环境里的其他会话，不会自动同步到另一台机器。

   ```text
   /dsh-skill-installer 将「<已核验的本地目录或压缩包>」安装为 DSH 全局技能 update-ai-clone，保留脚本、引用与许可证，不覆盖已有同名技能。
   ```

3. **绑定现有项目**：在本机配置中把 `project_root` 指向已有动作库的 Git 仓库根。不要填写 DSH 安装目录、上级文件夹或只含源码而没有所需私有档案的副本。配置示例：

   ```json
   {
     "version": 1,
     "project_root": "D:/Work/AI-Motion-Library"
   }
   ```

   也可设 `UPDATE_AI_CLONE_PROJECT`，或在手动 CLI 中用 `--project-root` 覆盖。本版按 **显式参数 → 环境变量 → `project.local.json` → 当前目录及其父目录中的有效项目** 查找。入口会核对仓库根、项目契约和 `origin` 的读写地址；指向其他仓库或多个地址时拒绝继续。本机路径不写入 Git。
4. **确认宿主已发现**：在 DSH 技能列表找到 `update-ai-clone`，或在新会话输入不带链接的 `/update-ai-clone`。它只做预检并说明用法。文件存在不等于宿主已加载；若未出现，先核对导入范围、启用状态、目录名和 frontmatter，再刷新技能列表或打开新会话。已安装的机器不必为每个会话重装。

### 本机依赖和自检

| 用途 | 依赖 |
| --- | --- |
| 预检、批次与归档 | 原生 Python 3.11+、Git 和现有项目。画像校验使用项目的 Python 开发依赖（包括 `jsonschema`）。 |
| 下载与媒体探测 | 可信的原生 `yt-dlp`、`FFmpeg` 和 `ffprobe`。优先复用现有隔离环境，不改系统 PATH；不自动装浏览器、启用 Cookie 或下载额外运行时。 |
| 生成 | 已获授权的项目 RTX 4090、可核验的 ComfyUI/H3 节点及模型、正式 SA02/BM01 参考图和 S02 空场。公开展示图不能替代正式资产。 |
| 刷新本机目录 | Node.js 24、项目已安装的前端依赖、FFmpeg/ffprobe、核验通过的私有画像及成片。首次配置可按[视频库运行指南](<motion-catalog-frontend.md#run-catalog-v1>)安装必要依赖。 |

如需从另一个目录复查，把路径替换为 DSH 实际加载的技能资源路径：

```bash
python -I -B -X utf8 "<已安装的技能目录>/scripts/update_ai_clone.py" doctor
python -I -B -X utf8 "<已安装的技能目录>/scripts/selftest.py"
```

`doctor` 只检查本机仓库、运行依赖、正式角色锁和预览端口，不连接 4090 或下载视频。`selftest.py` 是离线测试；通过不代表新一轮外部下载、工作流提交或生成画面已验证。需要临时指定工具时，`--project-root` 和 `--yt-dlp`（可信绝对可执行文件路径）放在子命令前。没有现成的可信工具就先处理依赖，不用 Docker 或 WSL 替代。

<a name="usage"></a>

## 2. 在会话中使用

以下是发给 DSH 的示例文字，不是终端命令。请用真实链接或归档中的身份替换占位符。

| 在会话中输入 | 行为与结果 |
| --- | --- |
| `/update-ai-clone` | 定位已绑定项目、只做本机预检并回报。 |
| `/update-ai-clone <作品链接一> <作品链接二>` | 核验所选作品，建立新批次，默认各规划 SA02 动漫和 BM01 真人两版。按已授权的链接范围下载；明确只做一版时仅规划该版。 |
| `/update-ai-clone 把 <作品链接> 追加到 <批次号>` | 查实既有批次后追加；已有同一原片先核验身份和字节，不自动另开批次。 |
| `/update-ai-clone 查批次 <批次号>`／`/update-ai-clone 继续 <批次号>` | 「查」只读本地台账；「继续」按授权的范围和原回执跟进。无回执、超时或结果未知时先对账，不重复提交。 |
| `/update-ai-clone <源条目> 的 <SA02 或 BM01> <尝试号> 通过，登记定稿并刷新` | 核对确切成片及回执，再关联私有验收证据、更新画像并重建本机目录。技术取回不自动算定稿；先前已核验的定稿不会被新尝试覆盖。 |
| `/update-ai-clone 只刷新视频库` | 校验现有档案并重建本机静态目录；不重新下载、渲染、推送或部署。若要求可打开的入口，再核验已知服务的快照或按运行指南启动。 |

实际流程：**规范链接与下载 → 整片分流及两版选图 → 核对具体 H3 方案和授权 → 按原回执取回并逐版交付 → 画像、证据及验收归档 → 刷新本机混排目录**。

- **下载**：随包 `ra-video-download` 提供说明与脚本。本版原生单命令入口适用于规范 B 站 BV 作品页；多 P 明确保留 `?p=N`，不把整个合集当作一个已核验源。X、抖音、短链或多媒体入口需要先核对实际选择，按随包下载流程处理，未标为端到端已验证。仅下载用户指定、可合法访问的作品，不绕过平台限制；原片、快照与侧车私有保存。
- **生成**：默认从完整原片的零点开始重画，站立单人半身 F01/F05、全身 F02/F06，沿用 S02。轮廓等仅作生成条件，不拆段、后期贴补或替换背景。普通双版本按原交接规则成组入队，缺正式资产、可验证接线或明确权限时停在计划；本技能不会自动提交通用渲染。详见[执行手册](<runbook.md>)与 [H3 接线、队列及续接](<h3-4090.md>)。
- **验收与展示**：成功取回可逐版交付，进入目录仍须完成画像和证据校验；内容定稿单独绑定到确切 MP4。原始标签、原片观察、成片观察、候选及配置分开；只陈述有证据的判断。目录更新后可在[本机视频库](http://127.0.0.1:4176/)浏览真人／动漫混排并筛选「只看定稿」。详见[画像规范](<motion-profile.md>)和[展示更新步骤](<motion-catalog-frontend.md#run-catalog-v1>)。

<a name="cli"></a>

## 3. 手动 CLI 参考

下表每个子命令都接在 `python -I -B -X utf8 "<已安装的技能目录>/scripts/update_ai_clone.py"` 之后。项目相对路径以已解析的库根为基准；不要把占位符原样执行。可用 `--help` 查看当前安装版本支持的参数。

| 子命令 | 效果与限制 |
| --- | --- |
| `doctor` | 只读本机预检，报告下载、角色锁与目录工具链是否就绪。 |
| `plan <URL…> [--variant both｜SA02｜BM01] [--append <批次>]` | 校验链接、分组并输出计划，无写入。`--append` 只接受存在的批次。 |
| `download <规范的 B 站 BV URL> --batch <批次>` | 真实下载操作，仅对本次已获授权的链接使用。先核验媒体选择，在私有目录保存下载意图、文件与取回证据；同一入库已验证时复用。 |
| `status <批次>` | 只读本地尝试记录；不会查询远端或提交。 |
| `verify-recipe <配方批次>` | 校验已冻结配方与对应的历史基线。不会替新尝试验收或检查远端能力。 |
| `verify-receipt <批次> <源条目> <SA02 或 BM01> <尝试>` | 核对实际原片、已取回成片、字节和回执绑定，不推断内容通过。 |
| `source-fields <批次> <源条目>` | 读取已归档的 B 站平台字段、标签与媒体规格。不创建画像或推断观察标签；结果含私有资料。 |
| `approval-draft <批次> <源条目> <SA02 或 BM01> <尝试>` | 输出定稿登记草稿，不写入或批准成片。只有用户明确接受该份文件，才能登记并绑定画像里的验收证据。 |
| `verify-profiles [<项目相对画像路径>…]` | 校验指定画像及关联资产；不传路径时检查全库内已有画像。 |
| `audit-local` | 只读审计现有私有静态构建。 |
| `refresh-local` | 校验并重建私有静态构建。服务占用回环端口时拒绝重建；不启停进程、不推送，结果生成后按运行指南启动。 |

<a name="troubleshooting"></a>

## 4. 排障、许可与发布边界

| 现象 | 下一步 |
| --- | --- |
| 找不到技能或解析到错误目录 | 核对 DSH 全局技能位置、`SKILL.md` 和完整资源树，再核对 `project.local.json` 或显式 `--project-root`。只接受正确的现有 Git 仓库；不可改远端冒充匹配。 |
| 下载器找不到、链接不唯一或下载结果未知 | 先补可信原生依赖或明确媒体选择。有下载意图但没有已验证结果时，检查原目录、进程与凭据状态，不换目录重发。 |
| 人物锁失败、缺节点或远端状态不明 | 停在前置校验。不要用 README 图例代替正式人物资产；已提交的未知结果按原回执对账。 |
| 库中没有新卡片或看不到定稿 | 核对原片、MP4、回执、对应尝试、画像和验收证据。`verify-profiles` 通过后重建；确有定稿记录却未进入画像时，修复档案引用，不删除验收或用新尝试顶掉旧定稿。 |
| 4176 已占用或页面仍是旧快照 | 只停止已确认归属的旧预览（对应终端 Ctrl+C 或原受管作业 ID），然后重建、按项目命令启动并核对回环地址。未知进程不杀。 |

随包下载组件源自 [Pluviobyte/rnskill](https://github.com/Pluviobyte/rnskill/tree/83d1783b892bbaa29a137895ff8338264b6872fa/skills/ra-video-download)，基于提交 `83d1783b892bbaa29a137895ff8338264b6872fa`；组件适用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)，安装时保留 `LICENSE` 与 `UPSTREAM.md`。包内脚本只对本项目 B 站入库做了限域加固，不改变独立安装的下载技能。媒体使用与公开播放仍需单独授权。该许可不等同于项目原创源码的 MIT 许可。

**GitHub 同步与本机入库分开。** 通过检查且属于公开范围的项目代码和文档才能按项目规则推送。完整技能包、机器本地绑定、原始快照、媒体、回执、证据、私有画像和预览包不随这份指南发布。只更新私有目录时无需提交；不因安装或刷新触发公网部署。[发布与同步规则](<../maintenance/publication.md#task-classification>)

<a name="english"></a>

## English quick start

1. Get the **complete trusted local `update-ai-clone` 1.0.0 package** from the maintainer or a verified installed copy. This repository publishes the guide, not the installable bundle. Use DSH Skills Manager or `/dsh-skill-installer` to import it into the actual **DSH global skills directory**; keep the directory name, frontmatter, scripts, references, provenance and license intact. Do not overwrite an existing installation.
2. Set `project_root` in the installed `project.local.json` to your existing motion-library checkout. `--project-root` or `UPDATE_AI_CLONE_PROJECT` can override it. Verify native Python 3.11+, Git, yt-dlp and FFmpeg/ffprobe; the local catalog also requires Node.js 24 and project dependencies. In a new session, run `/update-ai-clone` without arguments for a read-only preflight. See the [installation and self-test instructions](<#install>).
3. Use `/update-ai-clone <work URL>` for a new batch; explicitly name a batch to append or resume. Canonical Bilibili BV work pages have guarded native intake, including explicit part selectors. Verify media selection for X, Douyin and short links. SA02 and BM01 are paired by default. H3 requires a verified workflow and approval for the actual plan; an ambiguous result must be reconciled against its original receipt, not resubmitted.
4. After retrieval, validate and archive the profile. Keep delivery separate from content approval. To mark a final, identify the precise rendition and attempt and link the explicit acceptance record. To rebuild the private gallery, ask `/update-ai-clone 只刷新视频库`; an existing preview must be stopped only if its ownership is known. See the [CLI reference](<#cli>) and [catalog operations](<motion-catalog-frontend.md#run-catalog-v1>). Local updates do not publish or deploy anything.
