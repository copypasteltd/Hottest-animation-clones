# 贡献指南

欢迎通过需求、Schema、测试和后续实现完善项目。当前为specification-first基础仓库，尚无生产姿态提取器、白模生成管线或已安装skill。先读[项目入口](README.md)与[路径规范](15-项目路径结构与开源维护规范.md)。

## 变更流程

1. Issue说明用户问题、范围/非目标、涉及的需求ID和可观察验收。
2. 新分支采用feat/、fix/、docs/或chore/前缀；除本篇规定的8个README显示副本外，不把原始参考照片、源舞视频、私有资产/注册表、设备配置等放入PR。
3. 同步修改需求、契约、虚构示例和测试。改变核心手型/时间/来源规则必须更新版本与失效逻辑。
4. 本地运行文档/Schema检查和单元测试，显式暂存本次改动，运行索引保护检查。
5. PR写明实测与未测项、兼容影响和第三方来源。不要把计划TC写成已跑模型验证。
6. 根据用户持续同步要求，相关变更同时更新根中英README、CHANGELOG与相关说明，经检查后正常提交/推送指定origin；若用户要求先审阅则暂不推送。同步授权不允许扩展功能范围，见[发布与持续同步规范](18-开源发布与持续同步规范.md)。

```bash
python -m pip install -e ".[dev]"
python scripts/check_project_docs.py
python scripts/check_release.py
python -m unittest discover -s tests -v
python scripts/check_repository.py
```

最后一条要求Git索引包含已审阅源码。在CI中完整checkout后的索引同样可检查。

## 数据与文档规则

- 详细说明、提示词、模板和运行报告在docs内；根中英README与AGENTS为用户明确要求的公开入口例外。机器数据/媒体在项目内对应忽略目录。
- 数据契约样例保持纯虚构且not_run，不上传人脸视频、原始3张参考照片、私有训练素材、歌词/音乐、权重、其他候选、已删除JK03、真实注册表或未核权利工作流。
- 本次用户明确要求的唯一静态展示例外是`docs/images/characters/`中的8个PNG及`manifest.json`：`sa02-front-v1.png`、`sa02-four-view-candidate-v1.png`、`sa02-s02-knee-v1.png`、`sa02-s02-full-v1.png`、`bm01-front-v1.png`、`bm01-four-view-v1.png`、`bm01-s02-knee-v1.png`、`bm01-s02-full-v1.png`。使用既有图的字节一致副本，不重画，不扩成整个媒体目录放行。见[发布范围](18-开源发布与持续同步规范.md)与[展示清单](images/characters/manifest.json)。
- README图旁必须保留真实状态：SA02根图批准、四视图待确认，BM01四视图批准；F01/F02保留已查看，F05/F06是执行者视觉检查、未逐图用户批准。公开展示不改变current v2、正式角色锁、许可或训练/商用权。
- 精确PNG签名、尺寸、hash、manifest、Git索引及双语README内嵌引用需一致，按实际检查结果报告。公开克隆含8个显示副本但没有完整私有注册表及正式目录，缺文件时角色锁仍应明确失败，不利用显示图伪造通过。
- **未经用户明确指示并给出相应要求与约束，不得构建前端开发项。** 网站、交互页面、Dashboard、演示应用和静态预览服务不属于整理README或发布仓库的隐含授权。
- 新公开目录需要同时更新.gitignore、路径保护脚本和对应测试，不用强制添加绕过。
- MIT覆盖本项目原创贡献，不自动覆盖外部材料；见[第三方说明](THIRD_PARTY_NOTICES.md)。
- 原视频、源轨迹、生成视频与生成轨迹必须标明来源；unknown不得升级为passed。

## 暂不接受的“完成证明”

只有一张漂亮结果图、仅生成success、只有骨架MP4、只报最佳种子，均不能证明完整动作保持。后续模型实现需按[验收计划](14-实施计划与验收矩阵.md)保存可追溯证据；真实运行证据默认本地，公开摘要须授权和脱敏。本次明确要求的8张静态README展示图并不是动作推理证据，不扩大公开运行媒体的范围。
