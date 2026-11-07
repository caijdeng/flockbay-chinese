# GitHub 发布与仓库设置

建议仓库名：`flockbay-chinese`，所有者：`caijdeng`。

## 首次上传

- 仓库可见性选择 **Public**；默认分支使用 **main**。
- 公开版本包含本仓库的运行代码、完整词典、测试、许可证和文档。
- 原开发目录中的 evidence、提取资源、日志、状态文件、对话记录和内部计划不进入此仓库，也不导入其历史。
- `LICENSE` 和 `package.json` 标注 MIT，第三方保留权利单独在 `NOTICE.md` 说明。
- 源码包和发行包均不包含 Flockbay / Node.js / Godot / WebView2 的二进制文件。

## 上传后检查

1. 在仓库页面确认 Public、main、MIT 三项显示正确。
2. 在 Actions 中确认 Windows / Node 22 与 Windows / Node 24 两项测试通过。工作流只请求 `contents: read`，不需要配置密钥。
3. 在 Settings → Actions 中维持默认工作流权限为只读；不要向来自 fork 的 PR 工作流开放仓库密钥。
4. 在仓库支持的功能范围内启用 Dependabot alerts、Secret scanning、Push protection 及私密漏洞报告。是否已启用以 GitHub 设置页显示为准。
5. 维护时建议为 main 启用禁止强制推送/删除及测试检查；如要求所有修改走 PR，可同时配置管理员规则，避免把首次初始化或单人维护锁死。
6. 不需要 GitHub Pages、自建服务器、仓库 Secret、AI 密钥或付费 GitHub 套餐来运行此工具和本 CI。

## 发行版

本地执行 `./scripts/package.ps1`。在 GitHub 创建版本标签 `v1.0.0` 的 Release，附加 `dist/flockbay-chinese-1.0.0.zip` 和 `dist/SHA256SUMS.txt`。
发布说明注明兼容 Flockbay 3.5.13、Node.js 条件、617 条文案、已知动态文案/Godot 原生界面限制，并链接 NOTICE。
后续每个版本都重新运行测试并生成校验值；不要复用本机旧安装目录整体压缩为公开发行包。
