import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './dev/exposeStores'
import App from './App.tsx'
import { ThemeProvider } from './lib/theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
