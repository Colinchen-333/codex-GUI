// Command Executor for Slash Commands
// Handles execution of slash commands with proper context

import { SLASH_COMMANDS, type SlashCommand, isCompleteCommand } from './slashCommands'

export interface CommandContext {
  clearThread: () => void
  sendMessage: (text: string, images?: string[]) => Promise<void>
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

export interface CommandResult {
  executed: boolean
  message?: string
  error?: string
}

// Commands that can be executed immediately without sending to the AI
const IMMEDIATE_COMMANDS = ['clear', 'help']

// Commands that should be sent as messages to the AI for processing
const AI_COMMANDS = [
  'compact', 'undo', 'bash', 'browser', 'search',
  'commit', 'pr', 'review', 'test', 'lint', 'format'
]

// Commands that require settings UI
const SETTINGS_COMMANDS = ['model', 'provider', 'approval', 'sandbox']

/**
 * Parse a slash command from input text
 */
export function parseCommand(input: string): { command: SlashCommand | null; args: string[] } {
  if (!input.startsWith('/')) {
    return { command: null, args: [] }
  }

  const parts = input.slice(1).split(/\s+/)
  const cmdName = parts[0]?.toLowerCase()
  const args = parts.slice(1)

  const command = SLASH_COMMANDS.find(
    (cmd) =>
      cmd.name.toLowerCase() === cmdName ||
      cmd.aliases?.some((alias) => alias.toLowerCase() === cmdName)
  )

  return { command: command || null, args }
}

/**
 * Check if a command can be executed immediately (without AI)
 */
export function canExecuteImmediately(command: SlashCommand): boolean {
  return IMMEDIATE_COMMANDS.includes(command.name)
}

/**
 * Check if a command should be sent to AI
 */
export function shouldSendToAI(command: SlashCommand): boolean {
  return AI_COMMANDS.includes(command.name)
}

/**
 * Check if a command requires settings UI
 */
export function requiresSettingsUI(command: SlashCommand): boolean {
  return SETTINGS_COMMANDS.includes(command.name)
}

/**
 * Execute an immediate command
 */
export async function executeImmediateCommand(
  command: SlashCommand,
  _args: string[],
  context: CommandContext
): Promise<CommandResult> {
  switch (command.name) {
    case 'clear':
      context.clearThread()
      context.showToast?.('Conversation cleared', 'success')
      return { executed: true, message: 'Conversation cleared' }

    case 'help':
      // For help, we'll send it to AI to generate contextual help
      await context.sendMessage('/help - Show available commands and how to use them')
      return { executed: true }

    default:
      return { executed: false, error: `Unknown immediate command: ${command.name}` }
  }
}

/**
 * Format a command for sending to AI
 * Converts slash commands to natural language prompts
 */
export function formatCommandForAI(command: SlashCommand, args: string[]): string {
  const argsStr = args.join(' ')

  switch (command.name) {
    case 'compact':
      return 'Please summarize our conversation so far and compact the context.'

    case 'undo':
      return argsStr
        ? `Please undo the changes related to: ${argsStr}`
        : 'Please undo the last code change you made.'

    case 'bash':
      return argsStr
        ? `Execute this bash command: ${argsStr}`
        : 'What bash command would you like me to run?'

    case 'browser':
      return argsStr
        ? `Open this URL in the browser: ${argsStr}`
        : 'What URL would you like me to open?'

    case 'search':
      return argsStr
        ? `Search for: ${argsStr}`
        : 'What would you like me to search for?'

    case 'commit':
      return argsStr
        ? `Create a git commit with message: ${argsStr}`
        : 'Please create a git commit for the changes made.'

    case 'pr':
      return argsStr
        ? `Create a pull request: ${argsStr}`
        : 'Please create a pull request for the current branch.'

    case 'review':
      return argsStr
        ? `Review the code changes in: ${argsStr}`
        : 'Please review the recent code changes.'

    case 'test':
      return argsStr
        ? `Run tests for: ${argsStr}`
        : 'Please run the test suite.'

    case 'lint':
      return argsStr
        ? `Run linter on: ${argsStr}`
        : 'Please run the linter and fix any issues.'

    case 'format':
      return argsStr
        ? `Format the code in: ${argsStr}`
        : 'Please format the code according to the project style.'

    default:
      return `/${command.name} ${argsStr}`.trim()
  }
}

/**
 * Execute a slash command
 * Returns true if the command was handled (either executed or sent to AI)
 */
export async function executeCommand(
  input: string,
  context: CommandContext
): Promise<{ handled: boolean; requiresUI?: 'model' | 'provider' | 'approval' | 'sandbox' }> {
  const { command, args } = parseCommand(input)

  if (!command) {
    return { handled: false }
  }

  // Handle immediate commands
  if (canExecuteImmediately(command)) {
    await executeImmediateCommand(command, args, context)
    return { handled: true }
  }

  // Handle settings commands that need UI
  if (requiresSettingsUI(command)) {
    return { handled: true, requiresUI: command.name as 'model' | 'provider' | 'approval' | 'sandbox' }
  }

  // Handle AI commands
  if (shouldSendToAI(command)) {
    const prompt = formatCommandForAI(command, args)
    await context.sendMessage(prompt)
    return { handled: true }
  }

  return { handled: false }
}
