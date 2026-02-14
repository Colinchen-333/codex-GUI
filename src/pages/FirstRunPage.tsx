import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ChevronRight, ExternalLink } from 'lucide-react'
import { Button } from '../components/ui/Button'

type Step = 'intro' | 'autonomy' | 'cloud'

export function FirstRunPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('intro')

  const handleAccept = () => {
    void navigate('/')
  }

  const handleBack = () => {
    if (step === 'autonomy') setStep('intro')
    else if (step === 'cloud') setStep('autonomy')
  }

  const handleNext = () => {
    if (step === 'intro') setStep('autonomy')
    else if (step === 'autonomy') setStep('cloud')
    else handleAccept()
  }

  return (
    <div className="bg-surface relative flex h-full w-full items-center justify-center overflow-hidden px-4">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col items-center gap-6">
        <div className="flex w-full flex-col gap-6 rounded-2xl border border-stroke/20 bg-surface-solid/80 p-4 shadow-2xl backdrop-blur-lg">
        {step === 'intro' && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Shield size={32} className="text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-[24px] font-semibold text-text-1">
                Before You Begin
              </h1>
              <p className="mt-3 text-[15px] leading-6 text-text-3">
                Please review our terms and understand how Codex works to ensure the best experience.
              </p>
            </div>
            <Button
              variant="primary"
              className="w-full justify-center gap-2"
              onClick={handleNext}
            >
              Continue
              <ChevronRight size={16} />
            </Button>
          </>
        )}

        {step === 'autonomy' && (
          <>
            <div className="text-center">
              <h1 className="text-[20px] font-semibold text-text-1">
                Agent Autonomy
              </h1>
              <p className="mt-3 text-[15px] leading-6 text-text-3">
                Codex can perform actions autonomously on your behalf, including reading and writing files, 
                running commands, and making network requests within your workspace.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-stroke/20 bg-surface-solid p-4">
              <ul className="space-y-3 text-sm text-text-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Review suggested changes before applying</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>You can pause or stop any operation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Worktrees provide safe sandboxed environments</span>
                </li>
              </ul>
            </div>
            <a
              href="https://openai.com/policies"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
            >
              Learn more about our policies
              <ExternalLink size={12} />
            </a>
            <div className="flex w-full items-center justify-between gap-3">
              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
              <Button variant="primary" onClick={handleNext} className="gap-2">
                I Understand
                <ChevronRight size={16} />
              </Button>
            </div>
          </>
        )}

        {step === 'cloud' && (
          <>
            <div className="text-center">
              <h1 className="text-[20px] font-semibold text-text-1">
                Cloud Tasks
              </h1>
              <p className="mt-3 text-[15px] leading-6 text-text-3">
                Codex can run tasks in the cloud for longer operations. Your code is processed 
                securely and deleted after task completion.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-stroke/20 bg-surface-solid p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-2">Data retention</span>
                  <span className="text-text-1 font-medium">Deleted after task</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-2">Encryption</span>
                  <span className="text-text-1 font-medium">End-to-end</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-2">Training</span>
                  <span className="text-text-1 font-medium">Not used</span>
                </div>
              </div>
            </div>
            <div className="flex w-full items-center justify-between gap-3">
              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
              <Button variant="primary" onClick={handleAccept}>
                Get Started
              </Button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
