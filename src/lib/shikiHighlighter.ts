import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki'

let highlighterInstance: Highlighter | null = null
let highlighterPromise: Promise<Highlighter> | null = null

const PRELOADED_LANGS: BundledLanguage[] = [
  'javascript', 'typescript', 'jsx', 'tsx',
  'python', 'rust', 'go', 'bash',
  'json', 'yaml', 'toml', 'markdown',
  'html', 'css', 'sql', 'diff',
  'c', 'cpp', 'java', 'ruby',
  'swift', 'kotlin', 'shell',
]

export async function getHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) return highlighterInstance
  if (highlighterPromise) return highlighterPromise

  highlighterPromise = createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: PRELOADED_LANGS,
  })

  highlighterInstance = await highlighterPromise
  return highlighterInstance
}

export async function highlightCode(
  code: string,
  lang: string,
  theme: 'dark' | 'light' = 'dark'
): Promise<string> {
  const highlighter = await getHighlighter()

  const loadedLangs = highlighter.getLoadedLanguages()
  let resolvedLang = lang.toLowerCase()

  const ALIASES: Record<string, string> = {
    sh: 'bash', zsh: 'bash', shell: 'bash',
    js: 'javascript', ts: 'typescript',
    py: 'python', rs: 'rust',
    yml: 'yaml', md: 'markdown',
    jsonc: 'json', dockerfile: 'docker',
  }

  if (ALIASES[resolvedLang]) {
    resolvedLang = ALIASES[resolvedLang]
  }

  if (!loadedLangs.includes(resolvedLang as BundledLanguage)) {
    try {
      await highlighter.loadLanguage(resolvedLang as BundledLanguage)
    } catch {
      resolvedLang = 'text'
    }
  }

  return highlighter.codeToHtml(code, {
    lang: resolvedLang,
    theme: theme === 'dark' ? 'github-dark' : 'github-light',
  })
}
