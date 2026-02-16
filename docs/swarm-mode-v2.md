# Swarm Mode v2 — Self-Organizing Agent Team

---

## 范式转变

### 旧范式：Orchestrator 是代码

```
v1.0:  3000 行 Python 状态机控制一切
v2 draft: 600 行 Python 调度 agent

两者的本质相同：一段确定性代码管理 agent。
Agent 是被管理的对象。
```

### 新范式：Orchestrator 本身是 Agent

```
v2 final: Team Lead 是一个 agent
          Worker 是 agent
          整个系统 = agent 之间的自组织协作
          "Orchestrator code" = 0 行
          整个 swarm = 两个 prompt
```

**从"代码编排 agent"到"agent 领导 agent"。**

---

## Part I: 从第一性原理推导

### 真实工程团队怎么工作？

一个 3 人开发团队做一个 feature：

```
1. Tech Lead 看需求，看代码，拆任务，分配到 JIRA
2. 开发者各自认领任务，开分支，写代码
3. 写代码时发现什么——Slack 上说一声
4. 写完了——开 PR，merge 到 develop
5. 下一个开发者开始时，pull 最新 develop，能看到前面人的修改
6. 全部 merge 完——Tech Lead review，跑 CI
7. 有问题——谁方便谁修
```

这里的关键特征：

| 特征 | 人类团队 | v2 draft | 新方案 |
|------|---------|---------|--------|
| 谁分任务 | Tech Lead | Python 脚本调用 LLM | Team Lead agent（能探索代码库） |
| 怎么通信 | Slack 随时聊 | 零通信 | 异步消息（peer-to-peer） |
| 怎么集成 | 持续 merge 到 develop | 全部完成后大爆炸 merge | 持续 merge 到 staging |
| 谁 review | Tech Lead | 单独的 Integration Agent | Team Lead 自己（它最懂全局） |
| 出问题谁修 | 谁方便谁修 | 专门的 Fix Agent | 任何有空的 worker |
| 编排系统 | 无（自组织） | 600 行 Python | 无（两个 prompt） |

### 三个设计决策

**决策 1：Team Lead 是 agent，不是 LLM 调用**

v2 draft 的 planner 是 1 次 LLM 调用，输入只有 `git ls-tree`。看不到代码内容、不能探索架构、不能读测试。

Team Lead agent 可以：
- 探索代码库（agentic search）
- 理解模块边界和接口
- 读现有测试来设计更好的 AC
- 基于 ground truth 做分解，不是基于猜测

**决策 2：通信是去中心化的，不经过 orchestrator**

```
v2 draft:                          新方案:
  Worker A → (无通信) → Worker B      Worker A ←→ Worker B
  Worker A → (无通信) → Worker C      Worker A ←→ Worker C
  全部靠最后的 Integration Agent      Worker B ←→ Worker C
                                      + Team Lead 看得到所有消息
```

Worker 完成 merge 后广播一条消息："我改了 X，接口是 Y"。
其他 Worker 收到后可以调整方案。不需要等全部完成再事后修补。

**决策 3：持续集成，不是大爆炸 merge**

```
v2 draft:
  Worker A 完成 → 等待
  Worker B 完成 → 等待
  Worker C 完成 → 等待
  全部完成 → Integration Agent 一次性 merge 3 个分支

新方案:
  Worker A 完成 → 立即 merge 到 staging
  Worker B 完成 → pull staging（含 A 的工作）→ merge 到 staging
  Worker C 开始时 → checkout from staging（已含 A+B）→ 天然拿到前序工作
```

好处：
- 每次 merge 更小（1 个分支 vs 3 个分支）
- 后续 worker 天然看到前序修改（代码即 handoff）
- 不需要单独的 Integration Agent——集成是持续发生的

---

## Part II: 架构

```
用户："给 auth 模块加 token 过期检查"

┌───────────────────────────────────────────────┐
│                   Team Lead                   │
│                  (一个 agent)                  │
│                                               │
│  1. 探索代码库，理解架构                         │
│  2. 创建 plan → 写到共享任务板                   │
│  3. 创建 staging branch                        │
│  4. 为每个任务创建 worktree                     │
│  5. 派出 worker agent 作为队友                  │
│  6. 监听消息，处理问题                           │
│  7. 所有任务完成 → review staging → 跑测试      │
│  8. 报告结果给用户                              │
└───────────┬───────────────────────────────────┘
            │ 派出                 ▲ 消息回报
  ┌─────────┼─────────┐           │
  ▼         ▼         ▼           │
┌────┐   ┌────┐   ┌────┐         │
│ W1 │←→│ W2 │←→│ W3 │ ── peer messaging
└──┬─┘   └──┬─┘   └──┬─┘
   │        │        │
   ▼        ▼        ▼
  merge    merge    merge   ←── 持续集成到 staging
   │        │        │
   └────────┼────────┘
            ▼
     staging branch
     (共享工作区)
```

### 通信拓扑

```
去中心化消息 + 中心化愿景

     Team Lead
    ╱    │    ╲         设方向、分任务、最终 review
   ╱     │     ╲
  W1 ←──→ W2 ←──→ W3   peer-to-peer 发现分享、接口协调
   ╲     │     ╱
    ╲    │    ╱
     staging branch     stigmergy（通过代码间接通信）
```

三层通信：
1. **Task Board**（结构化）：任务状态、认领、完成
2. **消息**（自然语言）：发现、接口约定、求助
3. **代码**（stigmergy）：merge 到 staging = 最强的"通信"

---

## Part III: 详细设计

### Team Lead 的 Prompt

```markdown
# Role: Tech Lead

You are the tech lead of a small development team. Your job:

1. **Understand the task**: Read the user's request, explore the codebase
   to understand architecture, key patterns, and relevant code.

2. **Plan the work**: Break the task into 2-5 subtasks. Create each as
   a task on the shared board (TaskCreate). Each task should have:
   - Clear description (enough for a developer to work independently)
   - Acceptance criteria
   - Test command to verify
   - Dependencies (which tasks must complete first)

3. **Set up the workspace**:
   - Create a staging branch: git checkout -b swarm/{task-name} main
   - For each task, create a worktree: git worktree add .swarm/worker-{id} main

4. **Spawn workers**: Use the Task tool to spawn worker agents as teammates.
   Tell each worker:
   - Their worktree path
   - The full plan (so they know what everyone is doing)
   - How to merge to staging when done

5. **Monitor and support**:
   - Workers will message you when they complete tasks or encounter issues
   - Update the task board as tasks complete
   - If a worker is stuck, provide guidance or reassign
   - If a worker discovers something that affects others, relay the info

6. **Review and deliver**:
   - When all tasks are done, review the staging branch
   - Run the full test suite: {test_cmd}
   - Fix any integration issues yourself (or spawn a worker to fix)
   - Report the result to the user
   - If tests pass: show the diff, recommend merge to main
   - If tests fail after your fix attempt: preserve the branch, explain

7. **Clean up**:
   - Remove all worktrees
   - Shut down workers
   - Delete the team

## Guidelines
- You are a LEAD, not a micromanager. Set direction, then let workers work.
- Only intervene when workers ask for help or when something goes wrong.
- Your value is in the PLAN and the REVIEW, not in controlling execution.
- If the task is simple (1 subtask), do it yourself instead of spawning workers.
```

### Worker 的 Prompt

```markdown
# Role: Developer on a Team

You are a developer on a small team working on a larger task.

## Your Assignment
- Worktree: {worktree_path}
- Task: (read from the shared task board)

## The Team's Plan
{full plan — all tasks, all dependencies, integration notes}

## How to Work

1. **Claim your task**: Use TaskUpdate to mark it as in_progress.

2. **Understand the code**: Explore the codebase in your worktree.
   Read relevant files, understand the patterns.

3. **Implement**: Write the code, run the test command, fix issues.

4. **Merge to staging**:
   When your tests pass:
   ```
   git checkout swarm/{staging}
   git merge --no-ff {your-branch} -m "swarm: {task title}"
   git checkout {your-branch}
   ```

5. **Broadcast what you did**:
   Send a message to the team:
   "Merged task {id}: {what you changed}. Key interfaces: {signatures}.
    Changed files: {list}."

   This helps other workers design compatible code.

6. **Check for more work**:
   Look at the task board. If there are unclaimed tasks you can do, claim one.
   If all tasks are done or blocked, message the team lead.

## Communication Guidelines
- Message teammates when you discover something that affects their work
- Message teammates when you change an interface they might depend on
- Message the team lead if you're stuck or find a fundamental issue
- Keep messages SHORT — one paragraph max
- Don't message just to report status. The task board handles that.
```

### 消息协议

不是结构化协议——是自然语言，和 Slack 一样。

**Worker 完成 merge 后的广播**（最重要的消息类型）：
```
"Merged task 1: Added token expiry check.
 New function: checkTokenExpiry(token) → {valid: boolean, reason: string}
 in src/auth/middleware.ts.
 If you're building the refresh endpoint, use this to validate tokens."
```

**发现分享**（有用但不强制）：
```
"FYI: This codebase uses a custom AuthError class in src/errors.ts
 for all auth-related errors. Use it instead of generic Error."
```

**接口协调**（需要时发）：
```
"Worker C: I'm about to add a TokenPayload type to src/auth/types.ts.
 It'll have {userId, exp, iat, scope}. Let me know if you need
 different fields for the refresh endpoint."
```

**求助**（偶尔）：
```
"Team Lead: The test command `pytest tests/test_auth.py` doesn't exist yet.
 Should I create the test file, or is there a different test to run?"
```

### 持续集成的 merge 流程

```
时间线：

T0: Team Lead 创建 staging branch (= main)
    创建 worktree-1, worktree-2, worktree-3

T1: Worker 1 和 Worker 2 并行启动
    Worker 3 等待（depends_on 1, 2）

T2: Worker 1 完成
    → git checkout staging && git merge worker-1-branch
    → 广播："Merged task 1: ..."
    → Worker 2 收到消息（可选：调整方案）

T3: Worker 2 完成
    → git checkout staging && git merge worker-2-branch
    → staging 现在包含 task 1 + task 2 的工作
    → 广播："Merged task 2: ..."

T4: Worker 3 启动
    → worktree 从 staging checkout（天然包含 task 1+2 的修改）
    → 不需要读 handoff 文件——代码本身就是最好的 handoff
    → 广播消息提供了额外的高层描述

T5: Worker 3 完成
    → merge 到 staging
    → staging 包含所有 3 个 task

T6: Team Lead review staging
    → 跑全量测试
    → 修任何集成问题
    → 报告给用户
```

**关键洞见：代码即 handoff。** Worker 3 从 staging checkout 时，已经在代码级别看到 Worker 1 和 2 的全部修改。不需要 `.swarm/handoff.md`。广播消息只是补充高层理解。

### Cascade 路径

如果 Team Lead 分析后发现任务只需 1 个 subtask：

```
Team Lead:
  "这个任务不需要拆分。我自己来做。"
  → 直接在 staging branch 上工作
  → 不派出 worker
  → 跑测试
  → 报告结果

0 个消息，0 个 worker，0 行 orchestrator 代码。
就是一个 agent 做一件事。
```

---

## Part IV: 为什么这是新范式

### 对比

| 维度 | v1.0 (状态机) | v2 draft (轻量调度) | v2 final (自组织团队) |
|------|--------------|--------------------|--------------------|
| Orchestrator 是什么 | 3000 行 Python | 600 行 Python | **1 个 agent prompt** |
| Worker 是什么 | 被管控的执行器 | 自主但隔离的 agent | **团队成员** |
| 通信 | 无 | 无（Handoff 文件） | **peer-to-peer 消息** |
| 集成 | 顺序 merge + 检查 | Integration Agent | **持续 merge + TL review** |
| Plan 质量 | 1 次 LLM 调用 | 1 次 LLM 调用 | **Agent 探索代码后规划** |
| 适应性 | 无（静态流水线） | 无（静态流水线） | **TL 可以动态调整** |
| 核心代码量 | ~3000 行 | ~600 行 | **~0 行（两个 prompt）** |
| 容错 | 预设的重试逻辑 | verify→fix→交给人 | **谁有空谁修（自组织）** |

### 为什么"两个 prompt"就够了

因为所有基础设施已经存在：

| 需要的能力 | 已有的工具 |
|-----------|-----------|
| 任务板 | TaskCreate / TaskList / TaskUpdate |
| 团队管理 | TeamCreate / TeamDelete |
| 派出队友 | Task tool with team_name |
| 消息传递 | SendMessage（peer-to-peer + broadcast） |
| 代码操作 | Bash (git), Read, Edit, Write |
| 代码探索 | Grep, Glob, Read |
| 文件隔离 | git worktree（via Bash） |

Swarm 不是一个需要编写的系统——它是一个 **使用已有工具的协作模式**。

就像人类团队不需要"团队协作软件框架"——他们需要 git + Slack + JIRA。工具已经存在，团队精神在人身上。

同理，agent 团队不需要 orchestrator 框架——他们需要 git + 消息 + 任务板。工具已经存在，协作能力在 agent 身上。

---

## Part V: 研究验证

### 去中心化通信 ✅

**Multi-Agent Collaboration Mechanisms 综述** (arXiv 2501.06322)：
> "Decentralized structure: continued functioning if agents fail, high scalability and autonomy."
> "Optimal communication structures vary with tasks and compositions of agents."

我们的混合结构（中心化愿景 + 去中心化通信）结合了两者优点。

### Stigmergy（通过环境间接通信）✅

**CodeCRDT** (arXiv 2510.18893)：
> "Observation-driven coordination pattern where agents coordinate by monitoring a shared state with observable updates."

我们的 staging branch 正是这个模式——agents 通过观察共享代码状态来协调。

### 共享心智模型 ✅

**Theory of Mind in Multi-Agent LLM Collaboration** (NLPer 2025)：
> "Effective coordination requires the capacity to model, predict, and reason about the mental states of other agents."

完整 plan 在每个 worker 的 prompt 中 + merge 后的广播消息 = 轻量级 Theory of Mind。每个 worker 知道其他人在做什么，能预测接口需求。

### Cascade 模式 ✅

**"Single-agent or Multi-agent? Why Not Both?"** (arXiv 2505.18286)：
> "Agent Cascade: requests first attempt SAS; only failures escalate to MAS."
> "Cost reduction up to 88.1%."

Team Lead 判断简单任务 → 自己做，不派 worker = 自然的 cascade。

### 角色专业化 ✅

**MapCoder** (ACL 2024)：
> "Replacing even one specialized agent with a generalist degrades performance."

Team Lead 和 Worker 是不同角色、不同 prompt、不同职责。这是真实的角色分化，不是同质 worker。

### MAS 三类缺陷规避 ✅

| 缺陷 | 规避方式 |
|------|---------|
| Node-Level (瓶颈) | Worker 独立并行，无瓶颈节点 |
| Edge-Level (上游淹没下游) | 消息简短自然语言，不是完整输出 |
| Path-Level (长链路上下文丢失) | 最长链路 = 2 跳（TL→Worker→staging），代码是主要 handoff |

---

## Part VI: 完整工作流程

```
用户："给 auth 模块加 token 过期检查" --auto

┌─────────────┐
│  Team Lead  │  启动为一个完整的 agent session
│  starts     │
└──────┬──────┘
       │
       ▼
  探索代码库 (~30s)
  ├── grep "auth" "token" "expiry" → 找到相关文件
  ├── 读 src/auth/middleware.ts → 理解现有认证逻辑
  ├── 读 tests/test_auth.ts → 理解测试模式
  └── 读 package.json → 理解依赖
       │
       ▼
  创建 plan → 写到任务板
  ├── Task 1: "Add token expiry check to middleware" (无依赖)
  ├── Task 2: "Update login to set token expiry" (无依赖)
  └── Task 3: "Add refresh endpoint" (依赖 1, 2)
       │
       ▼
  设置工作区
  ├── git checkout -b swarm/token-expiry main
  ├── git worktree add .swarm/w1 main
  ├── git worktree add .swarm/w2 main
  └── git worktree add .swarm/w3 swarm/token-expiry  (后续从 staging)
       │
       ▼
  派出 Worker 1 和 Worker 2（并行）
  Worker 3 等待 Task 1 和 2 完成
       │
       │  ┌─────────────────────────┐  ┌─────────────────────────┐
       │  │ Worker 1                │  │ Worker 2                │
       │  │ 读任务板，认领 Task 1    │  │ 读任务板，认领 Task 2    │
       │  │ cd .swarm/w1            │  │ cd .swarm/w2            │
       │  │ 探索 auth 代码          │  │ 探索 login 代码          │
       │  │ 实现 checkTokenExpiry   │  │ 修改 login 加 exp claim  │
       │  │ 跑测试，修问题          │  │ 跑测试，修问题           │
       │  │ commit                  │  │ commit                  │
       │  │ merge 到 staging        │  │ merge 到 staging        │
       │  │ 广播：                  │  │ 广播：                   │
       │  │  "Merged task 1:       │  │  "Merged task 2:        │
       │  │   checkTokenExpiry()   │  │   JWT now has exp claim  │
       │  │   → {valid, reason}"   │  │   set to 1h default"    │
       │  │ 查任务板：没有更多任务   │  │ 查任务板：没有更多任务   │
       │  │ → idle                 │  │ → idle                  │
       │  └─────────────────────────┘  └─────────────────────────┘
       │
       │  Team Lead 收到两个完成消息
       │  更新任务板：Task 1 ✅, Task 2 ✅
       │  Task 3 的依赖已满足 → 派出 Worker 3
       │
       │  ┌──────────────────────────────────┐
       │  │ Worker 3                         │
       │  │ 读任务板，认领 Task 3             │
       │  │ cd .swarm/w3                     │
       │  │ (worktree 基于 staging           │
       │  │  → 天然包含 Task 1+2 的代码)     │
       │  │ 探索代码 → 看到 checkTokenExpiry  │
       │  │ 实现 refresh endpoint            │
       │  │ 跑测试，修问题                    │
       │  │ commit → merge 到 staging         │
       │  │ 广播："Merged task 3: POST /refresh"│
       │  │ → idle                           │
       │  └──────────────────────────────────┘
       │
       ▼
  Team Lead 收到 Task 3 完成消息
  所有任务完成！
       │
       ▼
  Review staging branch
  ├── git diff main...swarm/token-expiry
  ├── 检查接口一致性、命名一致性
  ├── npm test（全量测试）
  │   ├── 通过 → 报告给用户："✅ All done. Review the diff."
  │   └── 失败 → 自己修 / 派一个 worker 修 → 再测
  │
  ▼
  清理
  ├── 删 worktree
  ├── shutdown workers
  └── 删 team
```

---

## Part VII: Token 与时间分析

### 正常路径

| 角色 | Token | 时间 | 说明 |
|------|-------|------|------|
| Team Lead 规划 | ~8,000 | ~30s | 探索代码 + 创建 plan（比 v2 draft 多，因为是 agent 不是单调用） |
| Worker 1 | ~14,000 | ~45s | 标准 agent session |
| Worker 2 | ~14,000 | ~45s | 并行 |
| Worker 3 | ~14,000 | ~30s | 串行（但有前序代码，可能更快） |
| Team Lead review | ~4,000 | ~15s | review diff + 跑测试 |
| 消息开销 | ~1,500 | ~0s | ~3 条广播 × ~500 tok/条 |
| **Total** | **~55,500** | **~2.5 min** | |

### 对比

| 方案 | Token | 代码行数 | 配置项 | 灵活性 |
|------|-------|---------|--------|--------|
| v1.0 | ~47K | ~3000 | 30+ | 静态流水线 |
| v2 draft | ~45K | ~600 | 5 | 静态流水线 |
| **v2 final** | **~55K** | **~0** (两个 prompt) | **5** | **动态自组织** |

v2 final 多 ~10K token（Team Lead 的代码探索 + 消息开销）。这 10K 买到了：
- Plan 质量大幅提升（基于代码探索，不是猜测）
- 运行时适应性（Team Lead 可以动态调整）
- 去中心化通信（Worker 之间直接协调）
- 持续集成（每次 merge 都是小增量）
- 零 orchestrator 代码（两个 prompt 定义一切）

---

## Part VIII: 方案"不做"什么

| 刻意不做 | 理由 |
|---------|------|
| **强制通信协议** | 消息是自然语言，agent 自己决定何时说什么。不需要结构化 JSON 消息格式。 |
| **实时共享编辑** | 每个 worker 有自己的 worktree。CodeCRDT 的实验显示共享编辑增加 semantic conflict。 |
| **Worker 互助** | Worker A 帮 Worker B 写代码需要共享 context，成本太高。不如让 Team Lead 重新分配任务。 |
| **自动 re-plan** | Team Lead 是 agent，它可以根据情况调整。但不需要显式的 re-plan 机制。 |
| **Prompt budget** | Agent 自己管 context（compaction）。Team Lead 的 review prompt 自然很短。 |
| **文件隔离检查** | Git worktree = 物理隔离。持续 merge 到 staging = 及时发现冲突。 |
| **RECON** | Team Lead 自己探索代码库。Worker 自己按需发现。不需要单独的 RECON 阶段。 |

---

## Part IX: 这是"团队精神"吗？

### 诚实回答

人类团队精神的本质是 **我知道你在做什么、我关心你做得怎么样、我愿意配合你**。

在我们的系统中：
- **"我知道你在做什么"** ✅ — 共享 plan + merge 后广播
- **"我关心你做得怎么样"** ⚠️ — Agent 不会主动关心，但 Team Lead 会监控
- **"我愿意配合你"** ✅ — Worker 读到广播后会调整自己的接口设计

这不是完美的团队精神。但它是 **LLM agent 能做到的最自然的团队精神**——通过共享信息和环境感知来实现协调，而不是通过情感连接。

### 与 stigmergy 的关系

蚁群的协作不靠直接通信——靠 **信息素**（改变环境来间接通信）。

我们的 staging branch 就是信息素。Worker merge 代码到 staging = 留下信息素。下一个 Worker 从 staging checkout = 读取信息素。

广播消息是信息素的补充——提供代码本身不表达的高层意图。

```
stigmergy（代码）：看到 checkTokenExpiry 函数存在
消息（意图）：  "这个函数返回 {valid, reason}，给 refresh 用的"

两者结合 = 完整的信息传递
```

这是一个自然的、符合工程直觉的去中心化协作模型。它不模仿人类团队——它用 agent 和 git 的原生能力构建了一种新的协作范式。

---

## Part X: 最终验证与修正

### 在线研究发现（2026-02）

#### 1. Claude Code Agent Teams — 验证范式

Claude Code 的实验性 Agent Teams 功能（TeamCreate, SendMessage, TaskList）与本方案架构几乎相同：层级式 Lead + Teammates、共享任务板、peer-to-peer 消息、worktree 隔离。

**这验证了我们的方向是对的。** 但官方文档列出的已知限制也揭示了现实：
- Task status 有延迟（并发更新）
- Lead 有时自己实现代码而不是委派（角色越界）
- 无法恢复中断的 session

→ **启示**：这些问题不是 prompt 能解决的，需要基础设施层保障。

#### 2. Anthropic 内部多 Agent 研究系统

Anthropic 用 orchestrator-worker 模式做研究自动化，取得 90.2% 的改进。关键：他们在 agent 智能之上加了确定性保障——retry logic、checkpoints、结构化输出验证。

> "Frameworks for collaboration, not strict rules."

→ **启示**：纯 prompt 驱动不够。Agent 做决策，确定性代码做基础设施。

#### 3. Cursor 的层级结构优于平等结构

Mike Mason 对 Cursor 的分析发现 Planner/Worker/Judge 层级结构表现最好：

> "Coherence through orchestration, not autonomy."

纯去中心化的 equal-status agents 不如有明确层级的团队。67.3% 的 AI-generated PRs 被拒绝——说明 Review 角色至关重要。

→ **启示**：我们的 Team Lead 层级设计 + Review 阶段是对的。但 Review 需要认真对待。

#### 4. 生产环境可靠性

90% 的 AI agents 在生产环境 30 天内失败。主因：非确定性行为导致的不可靠。

→ **启示**：基础设施操作（git、文件系统）必须确定性执行，不能交给 LLM "试试看"。

### 最终修正：Hybrid Architecture

```
原始声明："零代码，两个 prompt"
修正声明："两个 prompt + ~100 行确定性 harness"
```

**Agent 负责的（需要智能的决策）：**
- 代码探索和理解
- 任务分解和分配
- 代码实现
- 接口协调（peer 消息）
- Review 和集成问题修复

**Harness 负责的（需要确定性的基础设施）：**

```typescript
// ~100 行，5 个函数
async function setupSwarm(taskName: string): Promise<SwarmContext> {
  // 创建 staging branch（确定性命名，冲突检测）
  // 创建 worktrees（失败则回滚已创建的）
  // 返回 context（路径、branch 名等）
}

async function mergeToStaging(workerBranch: string, staging: string): Promise<MergeResult> {
  // git merge --no-ff（捕获冲突，返回结构化结果）
  // 不是 agent 自己跑 git merge 然后"希望没问题"
}

async function cleanupSwarm(ctx: SwarmContext): Promise<void> {
  // 删除 worktrees（即使部分失败也继续清理）
  // 只在用户确认后删除 staging branch
}

async function withTimeout<T>(agent: Promise<T>, ms: number): Promise<T | 'timeout'> {
  // 单个 worker 超时不卡住整个团队
}

function formatWorkerPrompt(task: Task, plan: Plan, ctx: SwarmContext): string {
  // 组装 worker prompt（注入 worktree 路径、staging branch 名等确定性信息）
}
```

**为什么这 100 行不是过度工程**：
- 每个函数解决一个真实的非确定性风险
- Git 操作失败是常态（merge conflict、worktree 锁等），必须结构化处理
- 清理必须可靠（否则磁盘泄漏 worktrees）
- 超时是生产环境必需品

**为什么不需要更多**：
- 不需要状态机（Team Lead 是 stateful agent）
- 不需要消息路由（SendMessage 已提供）
- 不需要任务调度（TaskBoard 已提供）
- 不需要文件隔离检查（worktree 是物理隔离）
- 不需要 RECON（agent 自己探索）

### 最终架构图

```
┌─────────────────────────────────────────────────────┐
│                  Thin Harness (~100 LOC)             │
│  setupSwarm() → mergeToStaging() → cleanupSwarm()   │
│  withTimeout() → formatWorkerPrompt()               │
└────────────┬───────────────────────┬────────────────┘
             │ 创建环境               │ 清理环境
             ▼                       ▼
┌─────────────────────────────────────────────────────┐
│              Agent Layer (两个 prompt)               │
│                                                     │
│  Team Lead: 探索→规划→派出→监控→review→报告          │
│  Workers:   认领→实现→merge→广播→认领下一个          │
│                                                     │
│  通信：peer-to-peer 消息 + staging branch stigmergy │
└─────────────────────────────────────────────────────┘
             │                       │
             ▼                       ▼
┌─────────────────────────────────────────────────────┐
│              已有基础设施                             │
│  TeamCreate / TaskBoard / SendMessage / git / Bash  │
└─────────────────────────────────────────────────────┘
```

### 一句话总结

> **Agent 做决策，Git 做隔离，Harness 做保障。**
> 范式是对的（自组织 agent 团队），只是"零代码"需要修正为"~100 行确定性胶水代码"。
> 这正是 Anthropic 自己内部系统的做法——也是整个行业收敛的方向。

---

## Part XI: 深度研究 — 行业全景（2026-02）

### 三大生产级多 Agent 编码系统

2026 年初，三个多 agent 编码系统在真实生产中得到验证，形成了完整的对照实验：

| 系统 | 作者 | 架构 | 规模 | 隔离 | 合并策略 | 成本 |
|------|------|------|------|------|---------|------|
| **Gas Town** | Steve Yegge | Mayor + Polecats + Witness + Refinery | 20-30 agents, 189K LOC Go | worktree | Refinery 角色专管 | $100/hr peak |
| **Multiclaude** | Dan Lorenc (Chainguard) | Brownian Ratchet + CI gate | 5-10 agents | worktree | CI 通过即 auto-merge | 中等 |
| **Claude Code Agent Teams** | Anthropic 官方 | Lead + Teammates + TaskBoard | 2-8 agents | worktree（推荐） | Agent 自行 merge | 低-中 |

#### Gas Town — 工业级的混乱与雄心

Steve Yegge 的 Gas Town 是最激进的实现。~189K 行 Go 代码，编排 20-30 个并行 Claude Code 实例。

**MEOW 工作流栈**：
- **Beads**: 原子工作单元（JSONL + Git 跟踪）
- **Molecules**: 实例化工作流（支持依赖图、条件分支、并行派发）
- **GUPP 原则**: "Git Up, Pull, Push" — 确定性 handoff

**代理角色分化**（非 SDLC 模拟，而是运营角色）：
- Mayor = 调度器（≈ 我们的 Team Lead）
- Polecats = 临时 worker（≈ 我们的 Workers）
- Refinery = 专职 merge 管理（我们没有，但值得注意）
- Witness = 监控解锁阻塞的任务
- Deacon = 健康守护 daemon

**真实战果**：12 天 merge 44K+ 行代码。Yegge 声称去年写了"接近一百万行代码"。

**但也有真实混乱**：
- Deacon 曾"杀意大发"删除整个 worktree 的代码
- Auto-merge 把失败测试合入 main
- 5 次 force push 到 main 才恢复正常状态
- 两周内烧光 3 个 $200/月 Claude Pro Max 帐号

**关键教训**：Gas Town 证明了范式的正确性，但也暴露了 **"未驯化的 agent 是危险的"**。

#### Multiclaude — Brownian Ratchet 哲学

Dan Lorenc 的 Multiclaude 提出了一个优雅的物理学隐喻：

> **Brownian Ratchet（布朗棘轮）**：随机分子运动通过单向机制转化为定向进步。混乱进 → 进步出。

**CI 就是棘轮**。每个 PR 通过测试就 merge。失败不向后传播。只有绿色 CI 才向前推进。

```
Agent 的随机尝试 → CI gate → 只有通过的才 merge
                              ↓
                        进步是永久的
                        失败被丢弃
```

**这正是我们的 staging branch 做的事！** Worker merge 到 staging = 向前推进。Merge conflict = 被棘轮拦住。

Lorenc 的定位："Gas Town 把 agent 当单人游戏的 NPC。Multiclaude 把软件工程当 MMORPG。"

#### Claude Code Agent Teams — 官方验证

Anthropic 官方在 2026-02-06 正式发布 Agent Teams（实验性）。

**13 个 TeammateTool 操作**：spawnTeam, write, broadcast, requestShutdown, approvePlan, rejectPlan...

**5 种涌现的编排模式**：
1. **Leader Pattern**: 层级任务指挥（= 我们的方案）
2. **Swarm Pattern**: 并行任务处理
3. **Pipeline Pattern**: 顺序多阶段工作流
4. **Council Pattern**: 多视角决策
5. **Watchdog Pattern**: 质量监控

**实测数据**（Perrotta.dev 博客分析任务）：
- 4 agents 完成分析用时 ~5 分 17 秒
- Token 消耗差异大：34.3K ~ 95.9K / agent
- 工具调用 19 ~ 73 次 / agent

### "两类多 Agent" 的关键区分

paddo.dev 的分析揭示了一个根本性区分：

| | **SDLC 模拟**（BMAD/SpecKit） | **运营协调**（Gas Town / 我们的方案） |
|---|---|---|
| 核心理念 | 模拟人类组织架构（分析师→PM→架构师→开发→QA） | 协调运营角色（调度→执行→监控→合并） |
| 执行模式 | 顺序交接，phase gate | 并行执行，持续集成 |
| 状态管理 | Context window 膨胀 | 外部状态（TaskBoard / Beads） |
| 隔离 | 共享上下文 | Git worktree 物理隔离 |
| 质量控制 | LLM 评判 phase gate | 版本控制 + 测试 |

**SDLC 模拟是陷阱**：
> "它优化的是可解释性，而不是有效性。它重新创造了 AI 本应消除的人类组织瓶颈。"

**我们的方案属于"运营协调"范畴** ✅ — Team Lead 不是"产品经理"，而是调度器。Worker 不是"初级开发者"，而是并行执行器。

### Context Engineering — 新的核心纪律

Spotify 工程团队的发现对我们的 Worker prompt 设计至关重要：

| 有效 | 无效 |
|------|------|
| 静态、全面的 prompt（可版本控制） | 过于泛化的 prompt（"让代码更好"） |
| 终态定义（通过测试验证） | 过于具体的 prompt（覆盖每个边界情况） |
| 前置条件声明（何时 *不* 行动） | 合并多个修改到一个任务 |
| 具体代码示例 | 过多工具访问 |

**关键发现**：
> "每增加一个工具，就增加一个不可预测的维度。" — Spotify 将 agent 限制为 verify、git、bash 三类工具。

→ **启示**：Worker prompt 应该明确限制工具范围。不给 Worker 不必要的能力。

### Anthropic 官方 2026 趋势报告

Anthropic 发布的 8 个趋势中，与本方案最相关的：

1. **工程师从写代码转向协调写代码的 agent** — 这正是 Team Lead 的角色
2. **开发者在 ~60% 的工作中使用 AI，但只能完全委派 0-20%** — 说明 Review 不可省略
3. **2026 四大优先领域**：多 agent 协调、AI 自动化 review、安全架构、超越工程团队

**Boris Cherny（Anthropic）的 vanilla 方法**：
- ~90% 的 Claude Code 由 Claude Code 自己编写
- 方法：Plan Mode + 并行 git checkout + CLAUDE.md 积累学习 + 严格验证
- 同时管理 5+ 个工作流
- **不需要 Gas Town 级别的复杂性——纪律性的 vanilla 就够了**

### 生产可靠性的残酷数据

| 指标 | 数据 | 来源 |
|------|------|------|
| AI-generated PR 拒绝率 | 67.3% vs 人工 15.6% | LinearB |
| AI 采用增加 90% 后 bug 率 | +9% | Google DORA 2025 |
| Code review 时间增加 | +91% | Google DORA 2025 |
| PR 大小增加 | +154% | Google DORA 2025 |
| 代码搅动（churn）倍增 | 2x（2021→2023） | GitClear 211M 行分析 |
| 重构比例下降 | 25% → <10% | GitClear |
| 复制粘贴代码增加 | 8x | GitClear |
| 资深开发者用 AI 后实际速度 | -19%（自以为 +20%） | METR 研究 |
| 生产 Agent 30 天失败率 | 90% | 行业报告 |
| Agentic AI 项目预计取消率（2027 前） | 40% | Forrester |

**这些数据的含义**：
- Review 不是可选的——是生死攸关的。67.3% 拒绝率意味着未经 review 的 agent 代码大概率有问题。
- **我们的 Team Lead review 阶段** 是方案中最关键的环节之一。
- **测试是唯一可靠的棘轮** — staging branch 的 CI gate 是质量的最后防线。

### 实用缩放数据

| Agent 数量 | 实际表现 |
|-----------|---------|
| 1 | 可靠，context 利用率 80-90%（需 compaction） |
| 2-5 | **甜蜜区**。可靠运行，冲突可控 |
| 5-10 | 可行但需要纪律。每个 merge 改变基线 |
| 10-20 | 需要专职 merge 管理（Gas Town 的 Refinery 角色）|
| 20+ | "每次 merge 都移动靶子"。Overhead 主导。仅适合 Gas Town 级别基础设施 |

→ **我们的 2-5 worker 限制是对的** ✅

### 三种通信模式对比

| 模式 | 实现 | 优点 | 缺点 | 我们的方案 |
|------|------|------|------|-----------|
| **文件通信** | Multiclaude（daemon 轮询文件） | 简单可靠 | 延迟高 | — |
| **Mail MCP** | Gas Town（每 agent 专属信箱） | Context 隔离干净 | 需要 MCP | — |
| **原生消息** | Claude Code Teams（SendMessage） | 零额外代码 | 依赖实验性功能 | ✅ 我们用这个 |

### 对我们方案的最终验证

| 设计决策 | 行业验证状态 |
|---------|------------|
| Team Lead 是 agent，不是 LLM 调用 | ✅ Gas Town Mayor, Claude Code Teams Lead |
| Worktree 物理隔离 | ✅ 行业标准（Gas Town, Multiclaude, Claude Code, VS Code, Dagger Container Use） |
| Staging branch 持续集成 | ✅ Brownian Ratchet（Multiclaude）= 同一概念 |
| Peer-to-peer 消息 | ✅ Claude Code Teams SendMessage |
| 共享任务板（外部状态） | ✅ Gas Town Beads, Claude Code TaskBoard |
| 2-5 worker 限制 | ✅ CodeCRDT 最优 3-5, 实测 5-10 上限 |
| Thin harness (~100 LOC) | ✅ Anthropic 内部做法, Boris Cherny vanilla 方法 |
| Cascade 路径（简单任务不派 worker） | ✅ "Why Not Both?" 论文, 成本降 88% |
| Team Lead 做 review | ✅ 67.3% PR 拒绝率证明 review 必不可少 |

**未覆盖但值得关注**：

| 特性 | 系统 | 是否需要 |
|------|------|---------|
| 专职 Merge 角色（Refinery） | Gas Town | 2-5 worker 不需要；10+ 才需要 |
| 崩溃恢复（GUPP） | Gas Town | 目前简单清理即可；未来考虑 |
| Watchdog 模式 | Claude Code Teams | 可选增强，非核心 |
| Worker 工具限制 | Spotify 经验 | **应该做** — Worker prompt 应限制工具范围 |

### 最终修正（基于深度研究）

**修正 1：Worker 工具限制**

Spotify 证明"每多一个工具 = 多一个不可预测维度"。Worker prompt 应明确限制：
```
## 你可以使用的工具
- Read, Edit, Write, Grep, Glob（代码操作）
- Bash（git 操作、测试命令）

## 你不应该使用的工具
- WebSearch, WebFetch（不需要上网）
- Task（不嵌套 sub-agent）
- TeamCreate（不创建子团队）
```

**修正 2：staging merge 即 Brownian Ratchet**

将 staging branch 明确定位为**单向棘轮**：
- 只有通过测试的代码才能 merge 到 staging
- Worker 在 merge 前必须跑本地测试
- Merge 失败 = 被棘轮拦住 → Worker 修复后重试

**修正 3：Review 是方案中最关键的环节**

67.3% AI PR 拒绝率 + Google DORA 数据 = **未经 review 的 agent 代码大概率有问题**。

Team Lead 的 Review 不是走过场——它是整个方案的质量底线。如果 Review 不认真，整个方案就失去了价值。

---

## Part XII: 参考文献

### Anthropic 官方
1. [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) (2024-12)
2. [Building Agents with the Claude Agent SDK](https://claude.com/blog/building-agents-with-the-claude-agent-sdk) (2025-09)
3. [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) (2025-11)
4. [Equipping Agents for the Real World with Agent Skills](https://claude.com/blog/equipping-agents-for-the-real-world-with-agent-skills) (2025-10)
5. [New Capabilities for Building Agents on the Anthropic API](https://claude.com/blog/agent-capabilities-api) (2025-05)
6. [Agent Patterns Cookbook](https://github.com/anthropics/anthropic-cookbook/tree/main/patterns/agents)

### 学术论文
7. [Multi-Agent Collaboration Mechanisms: A Survey of LLMs](https://arxiv.org/html/2501.06322v1) (2025-01)
8. [CodeCRDT: Parallel Multi-Agent Code Generation](https://arxiv.org/html/2510.18893) (2025-10)
9. [Single-agent or Multi-agent? Why Not Both?](https://arxiv.org/html/2505.18286v1) (2025-05)
10. [Code in Harmony: Evaluating Multi-Agent Frameworks](https://openreview.net/forum?id=URUMBfrHFy) (2025)
11. [MapCoder: Multi-Agent Code Generation](https://aclanthology.org/2024.acl-long.269/) (ACL 2024)
12. [MapCoder-Lite](https://arxiv.org/html/2509.17489) (2025-09)
13. [Theory of Mind in Multi-Agent LLM Collaboration](https://nlper.com/2025/07/24/theory-of-mind-multiagent-llm-collaboration/) (2025-07)
14. [LLM-Based Multi-Agent Systems for Software Engineering](https://dl.acm.org/doi/10.1145/3712003) (ACM TOSEM 2025)
15. [Emergent Coordination in Multi-Agent Language Models](https://pages.cs.wisc.edu/~thodima/blog/2025/emergent-coordination-in-multiagent-language-models/) (2025)

### 行业实践（2026 补充）
16. [Claude Code Agent Teams 官方文档](https://code.claude.com/docs/en/agent-teams) — 官方实验性功能，13 个 TeammateTool 操作
17. [Anthropic Multi-Agent Research System](https://www.anthropic.com/engineering/built-multi-agent-research-system) — 内部 orchestrator-worker 模式，90.2% 改进
18. [Anthropic 2026 Agentic Coding Trends Report](https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf) — 8 趋势，0-20% 可完全委派
19. [Anthropic: Eight Trends Defining How Software Gets Built in 2026](https://claude.com/blog/eight-trends-defining-how-software-gets-built-in-2026)
20. [Mike Mason: AI Coding Agents in 2026 — Coherence Through Orchestration](https://mikemason.ca/writing/ai-coding-agents-jan-2026/) — Gas Town/Cursor/DORA 全景分析
21. [Addy Osmani: Claude Code Swarms](https://addyosmani.com/blog/claude-code-agent-teams/) — Agent Teams 实战
22. [Steve Yegge: Gas Town](https://github.com/steveyegge/gastown) — 20-30 agent, 189K LOC Go, MEOW 工作流栈
23. [Dan Lorenc: Multiclaude](https://github.com/dlorenc/multiclaude) — Brownian Ratchet 哲学，CI-as-gate
24. [Chainguard: Gastown and Where Software is Going](https://www.chainguard.dev/unchained/gastown-and-where-software-is-going) — Brownian Ratchet 深度分析
25. [paddo.dev: Two Kinds of Multi-Agent](https://paddo.dev/blog/gastown-two-kinds-of-multi-agent/) — SDLC 模拟 vs 运营协调
26. [paddo.dev: Claude Code's Hidden Multi-Agent System](https://paddo.dev/blog/claude-code-hidden-swarm/) — TeammateTool 逆向分析
27. [Spotify: Context Engineering for Background Coding Agents](https://engineering.atspotify.com/2025/11/context-engineering-background-coding-agents-part-2) — 工具限制 + prompt 设计
28. [Shipyard: Multi-agent Orchestration for Claude Code](https://shipyard.build/blog/claude-code-multi-agent/) — Gas Town vs Multiclaude 对比
29. [Julien Hurault: On the Road to Agent Swarms](https://juhache.substack.com/p/on-the-road-to-agent-swarms) — 三种通信模式 + 缩放限制
30. [HireNinja: Coding Agents in Production — 14-Day Runbook](https://blog.hireninja.com/2025/12/08/coding-agents-in-production-a-14-day-incident-safe-runbook-for-2026/) — 生产环境部署手册
31. [Claude Code Swarm Orchestration Skill (Gist)](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea) — 完整 TeammateTool 操作参考
32. [Agentic Context Engineering (arXiv 2510.04618)](https://arxiv.org/abs/2510.04618) — ACE: 上下文作为演化的 playbook
33. [nwiizo/ccswarm](https://github.com/nwiizo/ccswarm) — Rust 实现的 Claude Code 多 agent 系统（有已知限制）
