import { memo } from 'react'
import { MessageSquare, Cloud, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ChatEmptyStateProps {
  isFiltered?: boolean
  message?: string
  className?: string
  projectName?: string
  onProjectSelect?: () => void
}

const SUGGESTION_CARDS = [
  {
    emoji: '🎮',
    text: 'Build a classic Snake game in this repo.',
  },
  {
    emoji: '📜',
    text: 'Create a one-page PDF that summarizes this app.',
  },
  {
    emoji: '📰',
    text: "Summarize last week's PRs by teammate and theme.",
  },
]

export const ChatEmptyState = memo(function ChatEmptyState({
  isFiltered = false,
  message,
  className,
  projectName = 'codex-GUI',
  onProjectSelect,
}: ChatEmptyStateProps) {
  if (isFiltered) {
    return (
      <div
        className={cn(
          'h-full flex flex-col items-center justify-center text-text-3 gap-4',
          className
        )}
      >
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-solid border border-stroke/10">
            <MessageSquare size={22} className="text-text-2" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-text-1">No matching messages</p>
          <p className="text-xs text-text-3 mt-1">
            Try adjusting your search or filter
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'h-full flex flex-col items-center justify-center text-text-3 -mt-20',
        className
      )}
    >
      <div className="mb-8">
        <div className="w-16 h-16 rounded-2xl bg-surface-solid border border-stroke/10 flex items-center justify-center mb-6 mx-auto">
          <Cloud size={32} className="text-text-3" />
        </div>
        <h2 className="text-3xl font-bold text-center mb-2 text-text-1">
          {message || "Let's build"}
        </h2>
        <button
          onClick={onProjectSelect}
          className="flex items-center justify-center gap-1 text-text-3 cursor-pointer hover:text-text-2 transition-colors mx-auto"
        >
          <span className="text-lg">{projectName}</span>
          <ChevronDown size={20} />
        </button>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 px-6">
        {SUGGESTION_CARDS.map((card, index) => (
          <div
            key={index}
            className="bg-surface-solid border border-stroke/10 p-5 rounded-2xl hover:border-ring/50 cursor-pointer transition-all"
          >
            <div className="text-2xl mb-4">{card.emoji}</div>
            <p className="text-sm font-medium leading-relaxed text-text-2">
              {card.text}
            </p>
          </div>
        ))}
      </div>

      <button className="text-xs font-medium text-text-3 hover:text-text-2 uppercase tracking-widest mb-12">
        Explore more
      </button>
    </div>
  )
})
