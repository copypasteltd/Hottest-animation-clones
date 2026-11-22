# Hottest Animation Clones · AI 动作迁移库

在会话中提供 Bilibili、X 或抖音视频链接。项目目标是用同一条完整视频生成两份 S02 动作迁移 MP4。单人分别替换成 SA02 和 BM01，双人两版交换 SA02 和 BM01 的人物对应。

[简体中文](<README.zh-CN.md>) · [English](<README.md>) · [文档导航](<docs/README.md>) · [变更记录](<docs/CHANGELOG.md>)

## 从作品链接到成片

用 `/ra-video-download` 下载完整原片，判断取景和表演人数，为 SA02 和 BM01 分别匹配目标图。将两版的整片输入提交到指定 4090 的 ComfyUI 队列，动作和取景以原片为参考。站立单人 S02 使用[轮廓引导纯重画](<docs/operations/h3-4090.md#s02-contour-redraw>)，源片彩色画面不进入生成参考槽。每条包含作品链接的消息默认开一个有编号的新批次，明确要求时可追加。多条视频按同一版本、每组两条入队。逐次反馈生成结果，批次运行中取回 MP4 即交付。[批次规则](<docs/operations/h3-4090.md#queue-and-stop>) · [产品需求](<docs/product/requirements.md>) · [执行手册](<docs/operations/runbook.md>)

两条 Bilibili 原片的整片试跑已覆盖站立单人半身和全身，各取回 SA02 与 BM01 两版。本次实际验证了原片下载或复用、成组入队和按回执取回。轮廓引导方案已通过一条竖屏 SA02 全身样片的用户验收，其他成片单独验收。自动化生产编排仍待实现，X、抖音接入和双人路线待实跑。[当前进度](<docs/product/status.md>) · [流程用例](<docs/verification/acceptance.md>)

### 实测案例：BM01 F06 写实全身足部修复

第一轮重画修正了鞋型，但原片已经分脚时，成片仍常停在交叉姿态。第二轮增加整段灰度动作参考，在两遍采样中都加强腿脚轮廓，并用 F06 的鞋部细节约束鞋型。H3 在 S02 白场中整段重画，保留原片音轨，不做画面合成。

16 个同时间点的对照显示，第二轮在 6.0、6.5、7.0、8.0 秒能看到双脚分开，约 4.5 秒仍保留交错姿态，两只鞋维持同款低帮搭扣样式。静帧不能证明全程落脚、脚滑和重心转换均与原片一致。[修复接线与验证边界](<docs/operations/h3-4090.md#bm01-f06-footwork-repair>)

### 动作迁移画像与标签

画像把平台标题、简介和原始标签、原片观察、每份成片观察分别归档。首轮离线覆盖两条已有 Bilibili 原片及其 SA02／BM01 版本。标签带抽样时点、证据和不确定性；画像不参与生成、不阻挡交付。[采集与校验规范](<docs/operations/motion-profile.md>)

## 用 DSH 技能更新视频库

**`/update-ai-clone` v1.0.0** 是动作库的 DSH 全局入口，串联原片下载、双版计划、回执续接、定稿归档与本机目录刷新。用 `/dsh-skill-installer` 导入可信的完整本地包并绑定现有仓库；在新会话用 `/update-ai-clone` 预检，或附作品链接建立批次。下载器随本地包安装，本仓库仅发布文档。[安装、使用和排障指南](<docs/operations/update-ai-clone-skill.md#install>)

## 浏览动作迁移视频库

**一份成片一张卡。** 首页默认将 SA02 动漫和 BM01 真人风格成片放在同一个列表里排序、分页。点 **按作品** 可按原片归组；点 **只看定稿** 可查看所有已索引且有验收记录的定稿。成功取回不等于验收通过，后续尝试也不会覆盖已验收的旧定稿。

- **全库检索**：可搜标题、简介、关键词、清洗后的中英文标签和别名、作者或 `768×1376` 等媒体规格。到 **筛选** 里可精确选标签；平台原始标签、原片观察、成片观察和生成配置分开。例如，筛选原片标签 **手势舞** 可同时找到匹配作品的真人和动漫成片。
- **检索复核说明**：勾选 **同时检索观察与复核说明**，可搜观察与对照文字。命中说明不等于确认动作出现；候选标签默认不参与检索。

本机版需要 Node.js 24、项目 Python 开发依赖、FFmpeg／ffprobe，以及已核验的私有画像和成片。在仓库根目录运行：

```bash
npm --prefix web/catalog ci --ignore-scripts
python -B scripts/check_character_lock.py
node web/catalog/scripts/build.mjs --target local
node web/catalog/scripts/serve.mjs --target local
```

打开[本机私有视频库](http://127.0.0.1:4176/)。新增成片或定稿验收记录归档后，停止旧预览，再重建并启动。根路径和 GitHub Pages 构建仅含虚构示例，未部署。[运行与更新说明](<docs/operations/motion-catalog-frontend.md#run-catalog-v1>)

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

本项目的新任务接单时先归类，完成后按类别归档。可公开的变更通过检查后自动推送到 GitHub `main`；原片、成片和运行回执仍只留本地。[任务归类与发布规则](<docs/maintenance/publication.md#task-classification>)

在项目根使用 Python 3.11+ 和 Git，并在项目环境安装开发依赖。[工作区与维护命令](<docs/maintenance/workspace.md>)

```bash
python -m pip install -e ".[dev]"
python scripts/check_project_docs.py
python scripts/check_release.py
python -m unittest discover -s tests -v
```

使用本地正式人物素材前运行 `python scripts/check_character_lock.py`。公开克隆缺少正式文件时，该检查会指出缺失项。[维护约束](<AGENTS.md>) · [发布规范](<docs/maintenance/publication.md>)
