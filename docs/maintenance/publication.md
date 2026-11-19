# 开源发布与持续同步

公开项目位于 GitHub，目标分支为 `main`。同步内容限于明确授权的变更。项目维护约束规定开发范围及用户的同步要求。[GitHub 仓库](https://github.com/copypasteltd/Hottest-animation-clones) · [维护约束](<../../AGENTS.md>)

<a name="display-assets"></a>

## 公开范围

公开内容包括项目原创文档、维护源码、测试、无敏感配置示例、虚构记录和脱敏实验摘要。媒体只允许两份 README 内嵌的八张既有 PNG 字节一致副本，以及对应的展示清单。清单固定每个文件的路径、状态、尺寸和哈希，发布检查核对图像身份及双语内嵌引用。[展示清单](<../images/characters/manifest.json>) · [人物与构图状态](<../assets/reference-images.md>)

实际源片及侧车、正式资产清单、设备和模型配置、上游工作流、凭据、运行回执和生产成片留在项目私有区域。媒体授权与第三方许可按用途核对。[目录规则](<workspace.md#layout>) · [第三方材料](<../THIRD_PARTY_NOTICES.md>)

<a name="sync"></a>

## 提交与远端核对

1. 查看工作区、已暂存内容、当前分支和实际远端引用，保留其他本地工作。远端发生变化时先获取并比较历史。
2. 同步受影响的中文和英文入口、权威主题页、示例与验收项。在双语变更记录写明实际覆盖及待验证的运行能力。
3. 运行本地文档检查、发布检查和单元测试。按精确路径暂存已审阅变更，再运行索引保护及差异检查。
4. 提交后按用户授权正常推送。用远端 `main` 的实际提交核对同步，CI 结果独立登记。遇到网络、认证或远端历史冲突时保留本地提交和具体诊断。[维护命令](<workspace.md#offline-checks>) · [贡献流程](<../CONTRIBUTING.md>)

```bash
python scripts/check_repository.py
git diff --cached --check
git diff --cached --stat
git ls-remote origin refs/heads/main
```

前端、预览部署、正式版本发行及额外公开媒体的范围按用户的明确要求确定。用户提出先审阅或暂缓同步时依其最新要求执行。[治理规则](<../GOVERNANCE.md>)
