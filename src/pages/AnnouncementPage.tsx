import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function AnnouncementPage() {
  const navigate = useNavigate()

  const handleTryNew = () => {
    void navigate('/')
  }

  const handleDismiss = () => {
    void navigate('/')
  }

  return (
    <div className="bg-background pointer-events-auto fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-hidden px-8 py-10 text-center">
      <div className="relative m-auto flex h-full max-w-lg flex-col justify-between gap-10 overflow-auto">
        <div className="flex-1" />
        
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles size={40} className="text-primary" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold text-text-1">
              New Features Available
            </h1>
            <p className="text-text-3 pb-8 text-lg leading-7 max-[500px]:text-base max-[500px]:leading-5">
              We've made Codex smarter and faster. Experience improved code suggestions, 
              better context understanding, and enhanced performance across all your projects.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-[280px]">
            <Button
              variant="primary"
              className="justify-center gap-2 text-base w-full"
              onClick={handleTryNew}
            >
              Try New Features
              <ArrowRight size={16} />
            </Button>
            <Button
              variant="ghost"
              className="justify-center text-base text-text-3 w-full"
              onClick={handleDismiss}
            >
              Maybe Later
            </Button>
          </div>
        </div>

        <div className="flex-1" />
      </div>
    </div>
  )
}
