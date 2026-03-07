import { memo } from 'react'
import { KeyRound } from 'lucide-react'
import { cn } from '../../lib/utils'

export type ConnectorProvider = 'chatgpt' | 'github' | 'copilot' | 'api-key'
type LogoSize = 'sm' | 'md' | 'lg'

interface ConnectorLogoProps {
  provider: ConnectorProvider
  size?: LogoSize
  className?: string
}

const sizeMap: Record<LogoSize, { outer: string; inner: number }> = {
  sm: { outer: 'h-6 w-6',  inner: 14 },
  md: { outer: 'h-8 w-8',  inner: 18 },
  lg: { outer: 'h-12 w-12', inner: 28 },
}

// ---------------------------------------------------------------------------
// SVG sub-components (pure, no deps)
// ---------------------------------------------------------------------------

/** OpenAI / ChatGPT "chat bubble in circle" logo */
const ChatGPTIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    {/* Rounded chat bubble */}
    <path
      d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338A9.945 9.945 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Z"
      fill="white"
      fillOpacity={0.9}
    />
  </svg>
)

/** GitHub octocat silhouette (simplified path) */
const GitHubIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="white"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.867 8.166 6.839 9.489.5.092.682-.217.682-.483
         0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.155-1.11-1.463-1.11-1.463
         -.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832
         .092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943
         0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647
         0 0 .84-.269 2.75 1.026A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337
         c1.909-1.295 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647
         .641.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935
         .359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743
         0 .267.18.579.688.481C19.135 20.163 22 16.418 22 12
         c0-5.523-4.477-10-10-10Z"
    />
  </svg>
)

/**
 * GitHub Copilot icon — simplified "goggles" silhouette.
 * Based on the official Copilot brand icon shape.
 */
const CopilotIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    {/* Head outline */}
    <path
      d="M12 3C8.5 3 6 5.5 6 9v2.5C6 14 7.5 16 9 17v2l3-1.5L15 19v-2c1.5-1 3-3 3-5.5V9C18 5.5 15.5 3 12 3Z"
      fill="white"
      fillOpacity={0.9}
    />
    {/* Left goggle lens */}
    <circle cx="9.5" cy="10" r="1.5" fill="#1a1a2e" />
    {/* Right goggle lens */}
    <circle cx="14.5" cy="10" r="1.5" fill="#1a1a2e" />
    {/* Goggle bridge */}
    <path d="M11 10h2" stroke="#1a1a2e" strokeWidth="1" />
  </svg>
)

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

interface ProviderConfig {
  label: string
  bg: string
  /** Render the logo SVG at a given pixel size */
  icon: (size: number) => React.ReactNode
}

const PROVIDER_CONFIG: Record<ConnectorProvider, ProviderConfig> = {
  chatgpt: {
    label: 'ChatGPT',
    bg: 'bg-[#10a37f]',
    icon: (size) => <ChatGPTIcon size={size} />,
  },
  github: {
    label: 'GitHub',
    bg: 'bg-[#24292f]',
    icon: (size) => <GitHubIcon size={size} />,
  },
  copilot: {
    label: 'Copilot',
    bg: 'bg-[#6e40c9]',
    icon: (size) => <CopilotIcon size={size} />,
  },
  'api-key': {
    label: 'API Key',
    // Neutral surface so the icon color carries the identity
    bg: 'bg-surface-solid border border-stroke/30',
    icon: (size) => (
      <KeyRound
        style={{ width: size, height: size }}
        className="text-text-2"
        strokeWidth={1.75}
      />
    ),
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ConnectorLogo = memo<ConnectorLogoProps>(
  ({ provider, size = 'md', className }) => {
    const config = PROVIDER_CONFIG[provider]
    const { outer, inner } = sizeMap[size]

    return (
      <span
        role="img"
        aria-label={config.label}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-lg',
          config.bg,
          outer,
          className,
        )}
      >
        {config.icon(inner)}
      </span>
    )
  }
)

ConnectorLogo.displayName = 'ConnectorLogo'
