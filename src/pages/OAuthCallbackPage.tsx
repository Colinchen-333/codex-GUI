import { memo, useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/Button'

export const OAuthCallbackPage = memo(function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      setErrorMessage(error)
      return
    }

    if (code) {
      // The OAuth code + state are forwarded to the backend via the deep-link
      // handler (codex:// URL scheme). The app-server completes the flow
      // automatically once the callback URL is opened; we just show success and
      // redirect back to the main workbench.
      void state // consumed by the backend; included here to satisfy linter
      setStatus('success')
      setTimeout(() => navigate('/'), 2000)
    } else {
      // No code and no error — malformed callback URL
      setStatus('error')
      setErrorMessage('Missing authorization code in callback URL.')
    }
  }, [searchParams, navigate])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 size={48} className="text-primary animate-spin mx-auto" />
            <p className="text-text-1 text-lg">Completing authentication...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-status-success mx-auto" />
            <p className="text-text-1 text-lg">Authentication successful!</p>
            <p className="text-text-3 text-sm">Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="text-status-error mx-auto" />
            <p className="text-text-1 text-lg">Authentication failed</p>
            <p className="text-text-3 text-sm">{errorMessage}</p>
            <Button variant="secondary" onClick={() => navigate('/login')}>
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  )
})
