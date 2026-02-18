import { describe, it, expect } from 'vitest'

/**
 * Test the parseTaskList helper from swarmOrchestrator.
 *
 * Since parseTaskList is not exported, we re-implement its parsing logic here
 * to validate the contract: given an LLM response string, extract a structured
 * task array. This is the most critical parsing boundary in the swarm pipeline.
 */

// Inline the same parsing logic used in swarmOrchestrator.ts
function parseTaskList(response: string): Array<{
  title: string
  description: string
  testCommand: string
  dependsOn: string[]
  files: string[]
}> {
  const jsonMatch = response.match(/```json[c]?\s*\n([\s\S]*?)\n?\s*```/i)

  let parsed: unknown

  if (jsonMatch) {
    parsed = JSON.parse(jsonMatch[1])
  } else {
    const arrayMatch = response.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try {
        parsed = JSON.parse(arrayMatch[0])
      } catch {
        // Fall through to the error below
      }
    }
  }

  if (!parsed) {
    throw new Error('Team Lead response did not contain a JSON task list')
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Task list is empty or not an array')
  }

  return parsed.map((t: Record<string, unknown>) => ({
    title: String(t.title || ''),
    description: String(t.description || ''),
    testCommand: String(t.testCommand || 'echo "no test"'),
    dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.map(String) : [],
    files: Array.isArray(t.files) ? t.files.map(String) : [],
  }))
}

describe('parseTaskList', () => {
  it('parses a standard JSON code block', () => {
    const response = `I've analyzed the codebase. Here's my plan:

\`\`\`json
[
  {
    "title": "Add auth middleware",
    "description": "Create JWT validation middleware",
    "testCommand": "npm test -- --filter auth",
    "dependsOn": [],
    "files": ["src/auth/middleware.ts"]
  },
  {
    "title": "Add refresh endpoint",
    "description": "POST /api/refresh for token renewal",
    "testCommand": "npm test -- --filter refresh",
    "dependsOn": ["Add auth middleware"],
    "files": ["src/api/refresh.ts"]
  }
]
\`\`\`

This plan covers the full auth flow.`

    const result = parseTaskList(response)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Add auth middleware')
    expect(result[0].testCommand).toBe('npm test -- --filter auth')
    expect(result[0].dependsOn).toEqual([])
    expect(result[0].files).toEqual(['src/auth/middleware.ts'])
    expect(result[1].dependsOn).toEqual(['Add auth middleware'])
  })

  it('parses a jsonc code block', () => {
    const response = `\`\`\`jsonc
[
  {
    "title": "Fix bug",
    "description": "Fix the bug",
    "testCommand": "npm test",
    "dependsOn": [],
    "files": ["src/bug.ts"]
  }
]
\`\`\``

    const result = parseTaskList(response)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Fix bug')
  })

  it('falls back to raw JSON array when no code block', () => {
    const response = `Here are the tasks: [{"title": "Task 1", "description": "Do it", "testCommand": "npm test", "dependsOn": [], "files": []}]`

    const result = parseTaskList(response)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Task 1')
  })

  it('provides defaults for missing fields', () => {
    const response = `\`\`\`json
[{"title": "Minimal task"}]
\`\`\``

    const result = parseTaskList(response)
    expect(result[0].title).toBe('Minimal task')
    expect(result[0].description).toBe('')
    expect(result[0].testCommand).toBe('echo "no test"')
    expect(result[0].dependsOn).toEqual([])
    expect(result[0].files).toEqual([])
  })

  it('throws on response without JSON', () => {
    expect(() => parseTaskList('I analyzed the code and found nothing to do.')).toThrow(
      'Team Lead response did not contain a JSON task list'
    )
  })

  it('throws on empty array', () => {
    expect(() => parseTaskList('```json\n[]\n```')).toThrow(
      'Task list is empty or not an array'
    )
  })

  it('throws on non-array JSON', () => {
    expect(() => parseTaskList('```json\n{"task": "not an array"}\n```')).toThrow(
      'Task list is empty or not an array'
    )
  })

  it('handles dependsOn as non-array gracefully', () => {
    const response = `\`\`\`json
[{"title": "Task", "dependsOn": "not-an-array"}]
\`\`\``

    const result = parseTaskList(response)
    expect(result[0].dependsOn).toEqual([])
  })

  it('handles files as non-array gracefully', () => {
    const response = `\`\`\`json
[{"title": "Task", "files": "single-file.ts"}]
\`\`\``

    const result = parseTaskList(response)
    expect(result[0].files).toEqual([])
  })

  it('handles multiple tasks with complex dependencies', () => {
    const response = `\`\`\`json
[
  {"title": "A", "description": "First", "testCommand": "test a", "dependsOn": [], "files": ["a.ts"]},
  {"title": "B", "description": "Second", "testCommand": "test b", "dependsOn": ["A"], "files": ["b.ts"]},
  {"title": "C", "description": "Third", "testCommand": "test c", "dependsOn": ["A", "B"], "files": ["c.ts"]}
]
\`\`\``

    const result = parseTaskList(response)
    expect(result).toHaveLength(3)
    expect(result[2].dependsOn).toEqual(['A', 'B'])
  })
})
