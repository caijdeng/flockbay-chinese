# Flockbay 简体中文界面辅助工具

为 Windows 版 Flockbay 提供本地简体中文界面翻译，包含 617 条文案，支持一键切换中英文。**非官方项目**，不包含 Flockbay 原软件。

已实测兼容 Flockbay **3.5.13**。其他版本可能有未翻译的文案或结构差异。

## 使用条件

| 条件 | 要求 |
| --- | --- |
| 系统 | 64 位 Windows 10 / 11 |
| Flockbay | 从[官方网站](https://flockbay.com/)自行安装；默认路径 `%LOCALAPPDATA%\Flockbay\flockbay-desktop.exe` |
| Node.js | 22 或更高版本，建议 24；使用[官方 Windows 安装程序](https://nodejs.org/)安装到默认路径 `%ProgramFiles%\nodejs\node.exe` |
| WebView2 | Flockbay 自身能够正常运行所需的 WebView2 环境 |
| 桌面启动 | 使用 Windows Script Host / VBScript；如系统已移除此组件，可在已允许运行本地脚本的 PowerShell 中使用附带的安装脚本，并通过 `node launcher.mjs` 启动 |
| 安装权限 | 当前用户可写入 LocalAppData 和桌面，不需要管理员权限 |

只有贡献代码、运行自动测试时才需要 `npm ci`。使用汉化工具无需安装 npm 依赖，也不需要 GitHub、AI 或翻译服务密钥。

## 安装与使用

1. 下载源码 ZIP 或本项目的发行 ZIP，解压到普通文件夹。
2. 确认 Node.js 和 Flockbay 已满足上面的路径条件，保存项目并正常关闭 Flockbay。
3. 双击 **install.vbs**，将运行文件安装到 `%LOCALAPPDATA%\FlockbayChinese`，并创建桌面 **Flockbay 中文版** 快捷方式。
4. 以后从该快捷方式启动。左下角 **中文 · EN** 随时切换，选择会保留在独立的本地存储键中。

另附 `install.ps1`，可供已允许运行本地脚本的 PowerShell 使用。无需为了本工具修改系统执行策略。
不使用安装器时，也可以在解压目录运行 `node launcher.mjs`；此时保留控制台直到 Flockbay 退出。

## 恢复与卸载

- 点击 **中文 · EN** 恢复英文。
- 关闭后从原来的 **Flockbay** 快捷方式启动，也会使用原始界面。
- 退出中文版后，删除 `%LOCALAPPDATA%\FlockbayChinese` 和桌面“Flockbay 中文版”即可卸载。原程序和游戏项目不需要重装。

## 翻译范围

主要覆盖首页、菜单、常规/AI 等设置、连接器、本地模型、创意研究、新建项目等已知界面文案。未收录文案保留原文。
品牌名称、快捷键、部分实时硬件数值、倒计时和动态错误消息可能保持英文。
聊天内容、代码、可编辑内容及已识别的项目名称/路径区域不会自动翻译。内嵌 Godot 原生编辑器不属于此网页脚本的汉化范围。

## 工作方式与注意事项

启动器只为 Flockbay 子进程设置 WebView2 调试参数，通过 **127.0.0.1 的随机端口**加载本地词典和脚本；仅匹配 `tauri.localhost` 页面，外部登录页面不注入。
界面刷新和后续弹窗使用同一套翻译规则。原可执行文件和游戏项目不修改，不访问在线翻译服务。

调试端口在中文版运行期间存在，可被本机其他进程连接，因此应仅在可信的本机环境中使用。不要把该端口代理、映射或转发到外部网络。
本工具不保存账户凭据，不改变付费功能、额度或访问权限。

## 常见问题

- **提示已经运行**：先正常关闭 Flockbay，再启动中文版；启动器不会强制结束你的项目。
- **界面仍是英文**：检查左下角是否显示 `EN · 中文`；点击切换。若没有按钮，请检查是否从中文入口启动。
- **提示找不到 Node.js / Flockbay**：核对上表的默认安装路径。
- **无法启动**：查看安装目录的 `last-error.txt` 和 `launcher.log`。报告问题前请去除账户信息、项目路径和其他隐私内容。
- **原软件升级后有漏译**：原版本仍可使用，欢迎按 [CONTRIBUTING.md](CONTRIBUTING.md) 提交文案适配。

## 开发与验证

```powershell
npm ci
npm test
```

自动测试覆盖动态文案、属性、用户内容保护、中英还原、下拉框值、页面早期注入、目标地址过滤、协议错误和进程退出，共 11 项。
测试不需要安装或启动 Flockbay。GitHub Actions 配置在 Windows 上测试 Node.js 22 / 24。

手动应用验证还应检查：原软件 SHA-256 前后一致；端口只监听回环地址；首页/设置可操作；输入未被改写；切换与菜单重新加载正常。

打包：在 PowerShell 中运行 `./scripts/package.ps1`，生成 `dist/` 内的 ZIP 和 SHA-256 校验文件。发行包仅包含明确列出的运行文件、许可证和说明，不包含日志、凭据、测试依赖或原软件文件。

## 开源与许可证

本项目采用 [MIT License](LICENSE)。第三方权利及项目关系见 [NOTICE.md](NOTICE.md)。贡献方式见 [CONTRIBUTING.md](CONTRIBUTING.md)，安全问题见 [SECURITY.md](SECURITY.md)。
`package.json` 中的 `private: true` 仅用于防止误发布到 npm，与 GitHub 仓库是否公开无关。
