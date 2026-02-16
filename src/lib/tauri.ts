export function isTauriAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return typeof (window as { __TAURI__?: { core?: { invoke?: unknown } } }).__TAURI__?.core?.invoke === 'function'
}

