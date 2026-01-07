const SANDBOX_MODES = new Set(['read-only', 'workspace-write', 'danger-full-access'])
const APPROVAL_POLICIES = new Set(['on-request', 'on-failure', 'never', 'untrusted'])
const REASONING_EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])
const REASONING_SUMMARIES = new Set(['none', 'concise', 'detailed'])

function normalizeToken(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed
    .replace(/_/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
}

function normalizeEnum(value: string | null | undefined, allowed: Set<string>): string | undefined {
  if (!value) return undefined
  const normalized = normalizeToken(value)
  return allowed.has(normalized) ? normalized : undefined
}

export function normalizeSandboxMode(value: string | null | undefined): string | undefined {
  return normalizeEnum(value, SANDBOX_MODES)
}

export function normalizeApprovalPolicy(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const normalized = normalizeToken(value)
  const mapped = normalized === 'unless-trusted' ? 'untrusted' : normalized
  return APPROVAL_POLICIES.has(mapped) ? mapped : undefined
}

export function normalizeReasoningEffort(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const normalized = normalizeToken(value)
  const mapped = normalized === 'x-high' ? 'xhigh' : normalized
  return REASONING_EFFORTS.has(mapped) ? mapped : undefined
}

export function normalizeReasoningSummary(value: string | null | undefined): string | undefined {
  return normalizeEnum(value, REASONING_SUMMARIES)
}
