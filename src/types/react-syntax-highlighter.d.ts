declare module 'react-syntax-highlighter/dist/esm/prism-light' {
  import type { ComponentType } from 'react'

  const Highlighter: ComponentType<any> & {
    registerLanguage?: (languageName: string, language: unknown) => void
    alias?: (languageName: string, aliases: string[]) => void
  }

  export default Highlighter
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/*' {
  const language: unknown
  export default language
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism/*' {
  const theme: Record<string, unknown>
  export default theme
}

