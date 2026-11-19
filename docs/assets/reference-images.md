# S02 场景与目标替换图

本页定义 S02 和站立单人目标图的匹配、版本及核验。人物外观见两份角色说明，取景与人数的判断见执行手册。[SA02](<sa02.md>) · [BM01](<bm01.md>) · [取景与人数判断](<../operations/runbook.md#routing>)

<a name="s02"></a>

## S02 场景

| 项目 | 规格 |
| --- | --- |
| 固定引用 | `scene-s02-white-grid@1` |
| 背景 | 纯白空场，网格仅在地面。 |
| 地面 | 白色哑光地面，带细浅灰透视网格。网格用作视觉参照。 |
| 镜头与光线 | 正面水平、自然透视、柔和中性光，控制明显投影与反射。 |

场景清单位于 `standard-assets/scenes/selection.v1.json`。正式空场图位于 `standard-assets/scenes/scene-s02-white-grid/v1/background.png`，SHA256 为 `7bacc21b84b7657d924a442908325d1c3d655f1326acdca0701e619da2b3082d`。同目录的 `asset.json` 记录场景版本。

<a name="target-frames"></a>

## 按人物与取景选图

| 角色 | 半身目标 | 全身目标 | 当前构图审核 |
| --- | --- | --- | --- |
| SA02 二次元 | F01 · `ref-sa02-s02-knee@1` | F02 · `ref-sa02-s02-full@1` | 两张沿用既有已查看状态。 |
| BM01 写实 | F05 · `ref-bm01-s02-knee@1` | F06 · `ref-bm01-s02-full@1` | 两张均已经视觉检查，待逐图用户确认。 |

两种半身图都是从头顶到膝部或上胫的中景，留出双手与服装空间。全身图保留头顶、双手、鞋底及地面，工作流样片需要检查动作幅度、抬手和横移时的留边。F05 尾饰靠近画面边缘。多人和坐姿等预设按实际人数、姿态及图像输入方式补充，F03／F04 随 JK03 退役。[执行手册](<../operations/runbook.md#target-selection>) · [公开图例清单](<../images/characters/manifest.json>)

<a name="asset-checks"></a>

## 正式文件与核验

1. 运行 `python scripts/check_character_lock.py`，确认 `standard-assets/characters/current.json` 指向 `selection.v2.json`，通过正式角色与固定参考文件核验。
2. 读取 `standard-assets/framing/current.json` 指向的 `s02-master-set.v2.json`。核对选中图的版本、哈希、审核状态及同目录 `asset.json` 中的人物、场景和构图关系。
3. 按本次工作流记录实际输入图及其角色。人物锁覆盖角色锚点和 BM01 已批准四视图，S02、构图与动态效果按对应清单和成片证据核对。

| 编号 | 正式图片的项目相对路径 | SHA256 |
| --- | --- | --- |
| F01 | `standard-assets/framing/ref-sa02-s02-knee/v1/image.png` | `21262a3aa400ad81158ecc021ba28075cff3e9f2a04f01b7d608a83d8b04536f` |
| F02 | `standard-assets/framing/ref-sa02-s02-full/v1/image.png` | `e0a9a681bc34a721ff2b8f877e89742d4a924c764e714466c2636bc97dece3d1` |
| F05 | `standard-assets/framing/ref-bm01-s02-knee/v1/image.png` | `838203a596e83ad2ed107b9208043a7d628f7b03a4f701dc29542fe172d66c7a` |
| F06 | `standard-assets/framing/ref-bm01-s02-full/v1/image.png` | `5e847ade47edda1c9c320ac24d306e158d87af3cc41560548a7ae9d200b7e012` |

四张图的制作记录保存在相邻资产记录中。SA02 的两张图使用正面锚点和 S02 空场，BM01 的两张图分别使用正面锚点、已批准四视图和 S02 空场。正式构图均为 1024×1536 PNG。工作流使用哪张图，由该路线的实际输入位和样片验证确定。[工作流接线](<../operations/h3-4090.md>)
