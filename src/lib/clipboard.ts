/**
 * Clipboard utilities
 *
 * Centralizes clipboard behavior (including legacy fallback) so UI components
 * can provide consistent "Copy" actions without duplicating DOM hacks.
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    if (typeof document === 'undefined') return false

    // Legacy fallback for environments where Clipboard API is unavailable.
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', 'true')
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    return true
  } catch {
    return false
  }
}

