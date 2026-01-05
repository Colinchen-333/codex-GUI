// Slash Commands Configuration
// Based on Codex CLI slash commands

export interface SlashCommand {
  name: string
  description: string
  aliases?: string[]
  icon?: string
  category: 'general' | 'tools' | 'settings' | 'workflow'
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // Settings commands
  {
    name: 'model',
    description: 'Switch to a different model',
    category: 'settings',
    icon: '🤖',
  },
  {
    name: 'approvals',
    description: 'Change approval policy and safety settings',
    category: 'settings',
    icon: '✅',
  },

  // Tools commands
  {
    name: 'skills',
    description: 'List available skills and usage',
    category: 'tools',
    icon: '🧰',
  },
  {
    name: 'review',
    description: 'Review current changes',
    category: 'workflow',
    icon: '👀',
  },
  {
    name: 'new',
    description: 'Start a new chat session',
    category: 'general',
    icon: '🆕',
  },
  {
    name: 'resume',
    description: 'Resume a saved chat session',
    category: 'general',
    icon: '🕘',
  },
  {
    name: 'init',
    description: 'Create an AGENTS.md guide',
    category: 'workflow',
    icon: '🧭',
  },
  {
    name: 'compact',
    description: 'Summarize and compact conversation context',
    category: 'general',
    icon: '📦',
  },
  {
    name: 'diff',
    description: 'Show git diff (including untracked files)',
    category: 'tools',
    icon: '🧾',
  },
  {
    name: 'mention',
    description: 'Mention a file (insert @)',
    category: 'tools',
    icon: '📌',
  },
  {
    name: 'status',
    description: 'Show current session status',
    category: 'general',
    icon: '📊',
  },
  {
    name: 'mcp',
    description: 'List configured MCP tools',
    category: 'tools',
    icon: '🔌',
  },

  // General commands
  {
    name: 'logout',
    description: 'Log out of Codex',
    category: 'general',
    icon: '🚪',
  },
  {
    name: 'quit',
    description: 'Quit Codex Desktop',
    category: 'general',
    icon: '🛑',
  },
  {
    name: 'exit',
    description: 'Quit Codex Desktop',
    category: 'general',
    icon: '🛑',
  },
  // Workflow commands
  {
    name: 'feedback',
    description: 'Send feedback to maintainers',
    category: 'workflow',
    icon: '💬',
  },
  {
    name: 'rollout',
    description: 'Show rollout file path',
    category: 'workflow',
    icon: '🧪',
  },
  {
    name: 'test-approval',
    description: 'Test approval request',
    category: 'workflow',
    icon: '🧷',
  },
]

/**
 * Filter commands based on input
 */
export function filterCommands(input: string): SlashCommand[] {
  if (!input.startsWith('/')) return []

  const query = input.slice(1).toLowerCase()
  if (!query) return SLASH_COMMANDS

  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(query) ||
      cmd.aliases?.some((alias) => alias.toLowerCase().includes(query)) ||
      cmd.description.toLowerCase().includes(query)
  )
}

/**
 * Check if input is a complete slash command
 */
export function isCompleteCommand(input: string): SlashCommand | null {
  if (!input.startsWith('/')) return null

  const parts = input.slice(1).split(/\s+/)
  const cmdName = parts[0]?.toLowerCase()

  return (
    SLASH_COMMANDS.find(
      (cmd) =>
        cmd.name.toLowerCase() === cmdName ||
        cmd.aliases?.some((alias) => alias.toLowerCase() === cmdName)
    ) || null
  )
}

/**
 * Get command categories
 */
export const COMMAND_CATEGORIES: Record<SlashCommand['category'], string> = {
  general: 'General',
  tools: 'Tools',
  settings: 'Settings',
  workflow: 'Workflow',
}
