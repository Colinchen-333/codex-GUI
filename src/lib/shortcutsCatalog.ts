export interface ShortcutGroup {
  title: string
  shortcuts: Array<{
    keys: string[]
    description: string
  }>
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Cmd', ','], description: 'Open settings' },
      { keys: ['Cmd', 'K'], description: 'Open command palette' },
      { keys: ['Cmd', 'Shift', 'K'], description: 'Focus input' },
      { keys: ['Cmd', 'N'], description: 'New session' },
      { keys: ['Cmd', 'O'], description: 'Open project' },
      { keys: ['Cmd', 'B'], description: 'Toggle sidebar' },
      { keys: ['Cmd', 'J'], description: 'Toggle terminal' },
      { keys: ['Cmd', 'L'], description: 'Clear session' },
      { keys: ['Cmd', '/'], description: 'Toggle review pane' },
      { keys: ['Cmd', 'Z'], description: 'Undo' },
      { keys: ['Cmd', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Esc'], description: 'Stop generation (double-tap) / Close dialogs' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Cmd', '1'], description: 'Switch to Projects tab' },
      { keys: ['Cmd', '2'], description: 'Switch to Sessions tab' },
      { keys: ['Cmd', ']'], description: 'Next session' },
      { keys: ['Cmd', '['], description: 'Previous session' },
      { keys: ['Cmd', 'Shift', '['], description: 'First session' },
      { keys: ['Cmd', 'Shift', ']'], description: 'Last session' },
      { keys: ['Up', 'Down'], description: 'Navigate message history (input)' },
    ],
  },
  {
    title: 'Chat Input',
    shortcuts: [
      { keys: ['Enter'], description: 'Send message (input)' },
      { keys: ['Shift', 'Enter'], description: 'New line (input)' },
      { keys: ['/'], description: 'Show slash commands (input)' },
      { keys: ['@'], description: 'Mention file (input)' },
      { keys: ['Cmd', 'V'], description: 'Paste image (input)' },
    ],
  },
  {
    title: 'Approval Actions',
    shortcuts: [
      { keys: ['Y'], description: 'Accept action (approval prompt)' },
      { keys: ['N'], description: 'Decline action (approval prompt)' },
      { keys: ['A'], description: 'Allow for session (approval prompt)' },
      { keys: ['X'], description: 'Explain (approval prompt)' },
      { keys: ['E'], description: 'Edit/Feedback (approval prompt)' },
      { keys: ['D'], description: 'Toggle diffs (file change approval prompt)' },
      { keys: ['O'], description: 'Toggle output (command approval prompt)' },
      { keys: ['Cmd', 'Shift', 'A'], description: 'Jump to next approval' },
    ],
  },
]
