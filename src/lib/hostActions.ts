function isMacOS(): boolean {
  // Best-effort: Tauri webview exposes navigator.userAgent; this avoids pulling extra plugins.
  return typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent)
}

export async function revealInFinder(targetPath: string): Promise<void> {
  const { open } = await import('@tauri-apps/plugin-shell')
  await open(targetPath)
}

export async function openInTerminal(targetPath: string): Promise<void> {
  if (!isMacOS()) {
    throw new Error('Open in Terminal is supported on macOS only')
  }
  const { Command } = await import('@tauri-apps/plugin-shell')
  await Command.create('open', ['-a', 'Terminal', targetPath]).execute()
}

export async function openInVSCode(targetPath: string): Promise<void> {
  const { Command } = await import('@tauri-apps/plugin-shell')
  await Command.create('code', [targetPath]).execute()
}

