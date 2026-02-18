// ==================== Swarm Prompt Templates ====================
//
// Prompt templates for Team Lead and Worker agents in Self-Driving (Swarm) mode.
// Prompts are kept concise and trust the agent to figure out implementation details.

/**
 * Build the exploration prompt for the Team Lead to analyze the codebase
 * and decompose the user's request into subtasks.
 */
export function buildTeamLeadExplorationPrompt(
  userRequest: string,
  projectPath: string
): string {
  return `You are a Team Lead coordinating a multi-agent swarm to implement a feature.

PROJECT: ${projectPath}

USER REQUEST:
${userRequest}

YOUR TASK:
1. Explore the codebase to understand the project structure, tech stack, and conventions.
2. Break the user's request into 2-5 independent, parallelizable subtasks.
3. Each subtask should be self-contained enough for a single worker to implement in isolation.
4. Avoid tasks that heavily depend on each other's file changes -- prefer tasks that touch different files or modules.

OUTPUT FORMAT:
After your analysis, output EXACTLY one JSON code block with the task list:

\`\`\`json
[
  {
    "title": "Short task title",
    "description": "Clear description of what to implement, which files to modify, and acceptance criteria.",
    "testCommand": "npm test",
    "dependsOn": [],
    "files": ["src/path/to/file1.ts", "src/path/to/file2.ts"]
  }
]
\`\`\`

RULES:
- Each task needs a concrete testCommand that verifies the work (use the project's existing test setup).
- If tasks have ordering dependencies, use the dependsOn array with task titles.
- For each task, list the specific files that will be modified under the "files" key in the JSON output.
- Keep descriptions specific: mention file paths, function names, or components when possible.
- If the request is small enough for one person, output a single task.`
}

/**
 * Build the review prompt for the Team Lead to evaluate the combined
 * staging diff and test results after all workers finish.
 */
export function buildTeamLeadReviewPrompt(
  diff: string,
  testOutput: string
): string {
  return `You are reviewing the combined work of a swarm of workers. Assess whether the implementation is correct and complete.

COMBINED DIFF:
\`\`\`diff
${diff}
\`\`\`

TEST OUTPUT:
\`\`\`
${testOutput}
\`\`\`

REVIEW CHECKLIST:
1. Does the diff correctly implement all planned tasks?
2. Are there any bugs, regressions, or missing edge cases?
3. Do the tests pass? If not, what failed and why?
4. Are there any merge artifacts or conflicting changes?
5. Does the code follow the project's existing patterns and conventions?

YOUR VERDICT (required -- use one of these exact strings):
- VERDICT: APPROVE — if the implementation is correct and tests pass
- VERDICT: REQUEST_CHANGES — if there are issues that need fixing

After the verdict line, provide a brief explanation. If requesting changes, list specific issues.`
}

/**
 * Build the prompt for a Worker agent assigned to implement a specific subtask.
 */
export function buildWorkerPrompt(
  task: { title: string; description: string; testCommand: string },
  allTasks: { title: string; description: string }[],
  worktreePath: string,
  stagingBranch: string,
  workerIndex: number
): string {
  const taskList = allTasks
    .map((t, i) => `  ${i + 1}. ${t.title}: ${t.description}`)
    .join('\n')

  return `You are Worker ${workerIndex} in a multi-agent swarm. You have your own worktree and branch.

WORKTREE: ${worktreePath}
STAGING BRANCH: ${stagingBranch}

FULL PLAN (for context -- other workers handle the other tasks):
${taskList}

YOUR ASSIGNED TASK:
Title: ${task.title}
Description: ${task.description}
Test command: ${task.testCommand}

INSTRUCTIONS:
1. Work ONLY in your worktree at ${worktreePath}. Do not modify files outside it.
2. Implement the task described above. Keep changes minimal and focused.
3. Run the test command to verify your work: ${task.testCommand}
4. Commit all changes with a descriptive message prefixed with "[swarm] ".
5. Do not merge or push -- the orchestrator handles that.

TOOLS YOU SHOULD USE:
- Read, Edit, Write, Grep, Glob (code exploration and modification)
- Bash (git operations and running test commands only)

DO NOT:
- Use WebSearch or WebFetch (you have all the code locally)
- Spawn sub-agents or create teams
- Modify files outside your worktree
- Run destructive git commands (push, reset --hard, clean -f)
- Install new dependencies without it being part of the task description

Focus on correctness and simplicity. If something is unclear, make a reasonable assumption and note it in your commit message.`
}

/**
 * Build a prompt for the cascade path where the Team Lead handles
 * a single task directly without spawning workers.
 */
export function buildCascadePrompt(
  userRequest: string,
  task: { title: string; description: string; testCommand: string }
): string {
  return `You are implementing a task directly (single-agent mode, no workers needed).

USER REQUEST:
${userRequest}

TASK:
Title: ${task.title}
Description: ${task.description}
Test command: ${task.testCommand}

INSTRUCTIONS:
1. Implement the task as described.
2. Run the test command to verify: ${task.testCommand}
3. Commit your changes with a descriptive message.
4. Keep the implementation minimal and focused on the request.`
}
