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
    title: 'Diff',
    shortcuts: [
      { keys: ['/'], description: 'Focus file filter (Diff page)' },
      { keys: ['r'], description: 'Refresh diff (Diff page)' },
      { keys: ['j'], description: 'Next file (Diff page)' },
      { keys: ['k'], description: 'Previous file (Diff page)' },
      { keys: ['g'], description: 'First file (Diff page)' },
      { keys: ['Shift', 'g'], description: 'Last file (Diff page)' },
      { keys: ['s'], description: 'Stage/unstage selected file (Diff page)' },
      { keys: ['o'], description: 'Open selected file in VS Code (Diff page)' },
      { keys: ['c'], description: 'Copy selected path (Diff page)' },
    ],
  },
  {
    title: 'Git',
    shortcuts: [
      { keys: ['Cmd', 'Enter'], description: 'Run primary action (Commit dialog)' },
      { keys: ['Cmd', 'Enter'], description: 'Create pull request (Create PR dialog)' },
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
      { keys: ['y'], description: 'Accept action (approval prompt focused)' },
      { keys: ['n'], description: 'Decline action (approval prompt focused)' },
      { keys: ['a'], description: 'Allow for session (approval prompt focused)' },
      { keys: ['x'], description: 'Explain (approval prompt focused)' },
      { keys: ['e'], description: 'Edit/Feedback (approval prompt focused)' },
      { keys: ['d'], description: 'Toggle diffs (approval prompt focused)' },
      { keys: ['o'], description: 'Toggle output (approval prompt focused)' },
      { keys: ['Cmd', 'Shift', 'A'], description: 'Jump to next approval' },
    ],
  },
]
