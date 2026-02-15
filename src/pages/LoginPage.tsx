import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Key, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

type AuthMethod = 'chatgpt' | 'apikey' | null

export function LoginPage() {
  const navigate = useNavigate()
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null)
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChatGptSignIn = () => {
    setIsLoading(true)
    setError(null)
    setTimeout(() => {
      setIsLoading(false)
      void navigate('/welcome')
    }, 1500)
  }

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }
    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format')
      return
    }
    setIsLoading(true)
    setError(null)
    setTimeout(() => {
      setIsLoading(false)
      void navigate('/welcome')
    }, 1000)
  }

  const handleCancel = () => {
    setAuthMethod(null)
    setApiKey('')
    setError(null)
  }

  return (
    <div className="fixed inset-0 overflow-hidden select-none">
      <div className="absolute inset-0 bg-background" />
      
      <div className="h-toolbar-sm draggable text-text-3 fixed inset-x-0 top-0 z-10 flex items-center justify-center font-medium text-sm select-none">
        Sign In
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
        <div className="bg-surface-solid/80 border-stroke/20 mx-auto mb-8 mt-4 w-[min(90vw,640px)] rounded-2xl border px-4 py-4 backdrop-blur-lg">
          {!authMethod && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <h1 className="text-[24px] font-medium text-text-1">
                  Sign in to Codex
                </h1>
                <p className="mt-2 text-sm text-text-3">
                  Choose how you want to authenticate
                </p>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <Button
                  variant="primary"
                  className="w-full justify-center py-2.5"
                  onClick={() => handleChatGptSignIn()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Sign in with ChatGPT'
                  )}
                </Button>

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 border-t border-stroke/30" />
                  <span className="text-xs text-text-3">or</span>
                  <div className="flex-1 border-t border-stroke/30" />
                </div>

                <Button
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => setAuthMethod('apikey')}
                >
                  <Key size={14} />
                  Use API Key
                </Button>
              </div>
            </div>
          )}

          {authMethod === 'apikey' && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <h1 className="text-[24px] font-medium text-text-1">
                  Enter API Key
                </h1>
                <p className="mt-2 text-sm text-text-3">
                  Paste your OpenAI API key to continue
                </p>
              </div>

              <div className="mt-2">
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setError(null)
                  }}
                  error={!!error}
                />
                {error && (
                  <p className="mt-2 text-xs text-status-error">{error}</p>
                )}
              </div>

              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
              >
                Get an API key
                <ExternalLink size={12} />
              </a>

              <div className="flex items-center justify-between gap-2 mt-2">
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApiKeySubmit}
                  disabled={isLoading || !apiKey.trim()}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
