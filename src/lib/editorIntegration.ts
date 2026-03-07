import { invoke } from '@tauri-apps/api/core'

export type EditorId =
  | 'vscode' | 'vscode-insiders' | 'cursor' | 'zed'
  | 'sublime-text' | 'xcode' | 'intellij' | 'pycharm'
  | 'goland' | 'webstorm' | 'rider' | 'rustrover'
  | 'phpstorm' | 'android-studio' | 'bbedit' | 'textmate'

interface EditorConfig {
  id: EditorId
  name: string
  command: string
  args: (file: string, line?: number) => string[]
  icon: string
}

const EDITORS: EditorConfig[] = [
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    command: 'code',
    args: (file, line) => line ? ['--goto', `${file}:${line}`] : [file],
    icon: 'vscode.png',
  },
  {
    id: 'vscode-insiders',
    name: 'VS Code Insiders',
    command: 'code-insiders',
    args: (file, line) => line ? ['--goto', `${file}:${line}`] : [file],
    icon: 'vscode-insiders.png',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    command: 'cursor',
    args: (file, line) => line ? ['--goto', `${file}:${line}`] : [file],
    icon: 'cursor.png',
  },
  {
    id: 'zed',
    name: 'Zed',
    command: 'zed',
    args: (file, line) => line ? [`${file}:${line}`] : [file],
    icon: 'zed.png',
  },
  {
    id: 'sublime-text',
    name: 'Sublime Text',
    command: 'subl',
    args: (file, line) => line ? [`${file}:${line}`] : [file],
    icon: 'sublime-text.png',
  },
  {
    id: 'xcode',
    name: 'Xcode',
    command: 'xed',
    args: (file) => [file],
    icon: 'xcode.png',
  },
  {
    id: 'intellij',
    name: 'IntelliJ IDEA',
    command: 'idea',
    args: (file, line) => line ? ['--line', String(line), file] : [file],
    icon: 'intellij.png',
  },
  {
    id: 'pycharm',
    name: 'PyCharm',
    command: 'pycharm',
    args: (file, line) => line ? ['--line', String(line), file] : [file],
    icon: 'pycharm.png',
  },
  {
    id: 'goland',
    name: 'GoLand',
    command: 'goland',
    args: (file, line) => line ? ['--line', String(line), file] : [file],
    icon: 'goland.png',
  },
  {
    id: 'webstorm',
    name: 'WebStorm',
    command: 'webstorm',
    args: (file, line) => line ? ['--line', String(line), file] : [file],
    icon: 'webstorm.svg',
  },
]

export function getAvailableEditors(): EditorConfig[] {
  return EDITORS
}

export function getEditorById(id: EditorId): EditorConfig | undefined {
  return EDITORS.find((e) => e.id === id)
}

export async function openInEditor(
  editorId: EditorId,
  filePath: string,
  line?: number,
): Promise<void> {
  const editor = getEditorById(editorId)
  if (!editor) throw new Error(`Unknown editor: ${editorId}`)

  const args = editor.args(filePath, line)

  await invoke('execute_terminal_command', {
    cwd: '/',
    command: `${editor.command} ${args.map((a) => `"${a}"`).join(' ')}`,
  })
}

export async function openDirectoryInEditor(
  editorId: EditorId,
  dirPath: string,
): Promise<void> {
  const editor = getEditorById(editorId)
  if (!editor) throw new Error(`Unknown editor: ${editorId}`)

  await invoke('execute_terminal_command', {
    cwd: dirPath,
    command: `${editor.command} .`,
  })
}

let defaultEditor: EditorId = 'vscode'

export function getDefaultEditor(): EditorId {
  return defaultEditor
}

export function setDefaultEditor(id: EditorId): void {
  defaultEditor = id
}
