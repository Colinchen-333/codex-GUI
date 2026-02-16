import { Component, type ReactNode } from 'react'
import { AlertTriangle, Copy } from 'lucide-react'
import { logError } from '../../lib/errorUtils'
import { copyTextToClipboard } from '../../lib/clipboard'
import { Button } from './Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }))
    logError(error, {
      context: 'ErrorBoundary',
      source: 'ui',
      details: errorInfo.componentStack
    })
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const message = this.state.error?.message || 'Unknown error'
      const copyError = async () => {
        try {
          const text = this.state.error?.stack || message
          await copyTextToClipboard(text)
        } catch {
          // Ignore clipboard failures in crash UI.
        }
      }

      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background p-8">
          <div className="max-w-md text-center">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-status-error/30 bg-status-error-muted">
              <AlertTriangle size={24} className="text-status-error" />
            </div>
            <h1 className="mb-3 text-2xl font-bold text-text-1">Something went wrong</h1>
            <p className="mb-6 text-sm text-text-3">
              The application encountered an unexpected error.
            </p>
            <div className="mb-6 rounded-lg border border-status-error/30 bg-status-error-muted p-4 text-left">
              <p className="font-mono text-xs text-status-error whitespace-pre-wrap break-words">
                {message}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={() => void copyError()} className="gap-2">
                <Copy size={14} />
                Copy Error
              </Button>
              {this.state.errorCount < 3 && (
                <Button variant="secondary" onClick={this.resetErrorBoundary}>
                  Try Again
                </Button>
              )}
              <Button variant="primary" onClick={() => window.location.reload()}>
                Reload Application
              </Button>
            </div>
            {this.state.errorCount >= 3 && (
              <p className="mt-4 text-center text-xs text-status-warning">
                Multiple errors detected. Please reload the application.
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
