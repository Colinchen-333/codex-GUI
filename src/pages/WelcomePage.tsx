import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function WelcomePage() {
  const navigate = useNavigate()

  const handleContinue = () => {
    void navigate('/select-workspace')
  }

  return (
    <div className="fixed inset-0 overflow-hidden select-none">
      <div className="absolute inset-0 bg-background" />
      
      <div className="h-toolbar-sm draggable text-text-3 fixed inset-x-0 top-0 z-10 flex items-center justify-center font-medium text-sm select-none">
        Codex
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
        <div className="flex w-full max-w-[360px] flex-col items-center gap-6 px-6 pt-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles size={32} className="text-primary" />
          </div>

          <div className="flex w-full flex-col items-center gap-3 text-center">
            <h1 className="text-[24px] font-semibold text-text-1">
              Welcome to Codex
            </h1>
            <p className="max-w-[290px] text-[15px] leading-6 text-text-3">
              Your AI-powered coding assistant. Let's get you set up with your workspace.
            </p>
          </div>

          <Button
            variant="primary"
            className="w-[168px] justify-center px-4 py-2 text-[13px] font-medium leading-6"
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
