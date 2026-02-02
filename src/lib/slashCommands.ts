export interface SlashCommand {
  name: string
  description: string
  aliases?: string[]
  icon: string
  category: 'general' | 'tools' | 'settings' | 'workflow' | 'experimental'
  experimental?: boolean
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'model',
    description: 'Choose what model and reasoning effort to use',
    category: 'settings',
    icon: 'cpu',
  },
  {
    name: 'approvals',
    description: 'Choose what Codex can do without approval',
    category: 'settings',
    icon: 'shield-check',
  },
  {
    name: 'permissions',
    description: 'Choose what Codex is allowed to do',
    category: 'settings',
    icon: 'lock',
  },
  {
    name: 'setup-elevated-sandbox',
    description: 'Set up elevated agent sandbox',
    aliases: ['elevate-sandbox'],
    category: 'settings',
    icon: 'shield-alert',
  },
  {
    name: 'experimental',
    description: 'Toggle experimental features',
    category: 'settings',
    icon: 'flask-conical',
  },
  {
    name: 'personality',
    description: 'Choose a communication style for Codex',
    category: 'settings',
    icon: 'smile',
  },
  {
    name: 'skills',
    description: 'Use skills to improve how Codex performs specific tasks',
    category: 'tools',
    icon: 'wrench',
  },
  {
    name: 'diff',
    description: 'Show git diff (including untracked files)',
    category: 'tools',
    icon: 'git-compare',
  },
  {
    name: 'mention',
    description: 'Mention a file',
    category: 'tools',
    icon: 'at-sign',
  },
  {
    name: 'mcp',
    description: 'List configured MCP tools',
    category: 'tools',
    icon: 'plug',
  },
  {
    name: 'apps',
    description: 'Manage apps',
    category: 'tools',
    icon: 'layout-grid',
  },
  {
    name: 'ps',
    description: 'List background terminals',
    category: 'tools',
    icon: 'terminal',
  },
  {
    name: 'review',
    description: 'Review my current changes and find issues',
    category: 'workflow',
    icon: 'eye',
  },
  {
    name: 'init',
    description: 'Create an AGENTS.md file with instructions for Codex',
    category: 'workflow',
    icon: 'compass',
  },
  {
    name: 'plan',
    description: 'Switch to Plan mode',
    category: 'workflow',
    icon: 'list-todo',
    experimental: true,
  },
  {
    name: 'collab',
    description: 'Change collaboration mode',
    category: 'workflow',
    icon: 'users',
    experimental: true,
  },
  {
    name: 'agent',
    description: 'Switch the active agent thread',
    category: 'workflow',
    icon: 'bot',
    experimental: true,
  },
  {
    name: 'new',
    description: 'Start a new chat during a conversation',
    category: 'general',
    icon: 'plus-circle',
  },
  {
    name: 'resume',
    description: 'Resume a saved chat',
    category: 'general',
    icon: 'history',
  },
  {
    name: 'fork',
    description: 'Fork the current chat',
    category: 'general',
    icon: 'git-fork',
  },
  {
    name: 'rename',
    description: 'Rename the current thread',
    category: 'general',
    icon: 'pencil',
  },
  {
    name: 'compact',
    description: 'Summarize conversation to prevent hitting the context limit',
    category: 'general',
    icon: 'package',
  },
  {
    name: 'status',
    description: 'Show current session configuration and token usage',
    category: 'general',
    icon: 'activity',
  },
  {
    name: 'sessions',
    description: 'Open the sessions panel',
    category: 'general',
    icon: 'folder-open',
  },
  {
    name: 'bug',
    description: 'Report a bug on GitHub',
    category: 'general',
    icon: 'bug',
  },
  {
    name: 'feedback',
    description: 'Send logs to maintainers',
    category: 'general',
    icon: 'message-circle',
  },
  {
    name: 'logout',
    description: 'Log out of Codex',
    category: 'general',
    icon: 'log-out',
  },
  {
    name: 'quit',
    description: 'Exit Codex Desktop',
    aliases: ['exit'],
    category: 'general',
    icon: 'power',
  },
  {
    name: 'help',
    description: 'Show available commands',
    category: 'general',
    icon: 'help-circle',
  },
  {
    name: 'clear',
    description: 'Clear the conversation display',
    category: 'general',
    icon: 'trash-2',
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
 * Get command categories with icons
 */
export const COMMAND_CATEGORIES: Record<SlashCommand['category'], { label: string; icon: string }> = {
  settings: { label: 'Settings', icon: 'settings' },
  tools: { label: 'Tools', icon: 'wrench' },
  workflow: { label: 'Workflow', icon: 'git-branch' },
  general: { label: 'General', icon: 'layout-grid' },
  experimental: { label: 'Experimental', icon: 'flask-conical' },
}
