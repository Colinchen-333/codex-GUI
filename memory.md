# Product Direction (Codex Desktop GUI)

目标：为 Codex CLI 打造一个强大、可靠、协议原生（JSON-RPC）的可视化桌面端，体验对标 Codex Desktop 与 Claude Code。

## 设计与体验

- 默认以「速度 + 可控 + 可信」为第一优先级：任何写文件/执行命令必须走结构化 approval 流程。
- 面向 power user：键盘为主（命令面板、快捷键、快速切换线程/项目/会话）。
- UI 字符串统一使用英文；主题使用语义化 token（避免硬编码颜色）。
- 避免“假数据 UI”：未接入真实数据的页面必须明确标注 placeholder，并且不应展示 sample task/sample logs 之类的内容误导用户。

## 功能方向（对标项）

- 多会话并发与线程管理（start/resume/interrupt/close），可靠的 pending request 清理与超时保护。
- 审批体验：可视化 diff、命令预览、风险提示、Accept/Reject，支持撤销/回滚（snapshots）。
- 工程工作流：Git 状态、分支/提交/PR（以及 worktree 模式），文件预览与搜索。
- 诊断与可观测性：Debug 页面可查看引擎状态、版本、运行环境、关键日志，便于定位问题。

## 稳定性与质量门槛

- 任何持续轮询/定时器必须可被清理；避免 dangling timers 与内存增长。
- 每做完一个小模块就提交（小步、可回滚）。
- 每轮改动至少跑 `npm run lint`、`npm run test:unit -- --run`；涉及 Rust 改动跑 `cargo check`。

