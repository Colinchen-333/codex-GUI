export type RiskLevel = 'high' | 'medium' | 'low'

const LOW_RISK_PATTERNS = [/\.md$/, /\.txt$/, /test.*\.tsx?$/, /\.test\./, /\.spec\./]
const HIGH_RISK_PATTERNS = [/package\.json$/, /\.env/, /config/, /src\/stores/, /src\/lib/]

export function classifyRisk(change: { path: string; kind: string; diff?: string }): RiskLevel {
  const isLowRisk = LOW_RISK_PATTERNS.some(p => p.test(change.path))
  const isHighRisk = HIGH_RISK_PATTERNS.some(p => p.test(change.path))
  
  if (isHighRisk) return 'high'
  if (isLowRisk) return 'low'
  return 'medium'
}

export function getRiskBadgeStyles(risk: RiskLevel): string {
  switch (risk) {
    case 'high':
      return 'bg-status-error-muted text-status-error'
    case 'medium':
      return 'bg-status-warning-muted text-status-warning'
    case 'low':
      return 'bg-status-success-muted text-status-success'
  }
}
