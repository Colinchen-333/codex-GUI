import { memo, useEffect, useState, useCallback } from 'react'
import { RefreshCw, Wrench, Globe, AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { serverApi, type McpServerStatus } from '../../lib/api'
import { logError } from '../../lib/errorUtils'
import {
  SettingsSection,
  SettingsCard,
} from '../../components/settings/SettingsLayout'

/**
 * Collapsible server card showing tools, resources, and auth status
 */
const ServerCard = memo(function ServerCard({
  server,
}: {
  server: McpServerStatus
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toolCount = Object.keys(server.tools).length
  const resourceCount = server.resources.length
  const templateCount = server.resourceTemplates.length

  const isAuthenticated = server.authStatus?.isAuthenticated ?? true
  const authError = server.authStatus?.error

  return (
    <div className="rounded-lg border border-stroke/20 bg-surface-solid/80 overflow-hidden">
      {/* Server header */}
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover/[0.06] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown size={14} className="text-text-3 shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-text-3 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-1 truncate">{server.name}</span>
            {isAuthenticated ? (
              <CheckCircle2 size={12} className="text-status-success shrink-0" />
            ) : (
              <AlertCircle size={12} className="text-status-error shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-text-3 mt-0.5">
            {toolCount > 0 && (
              <span className="flex items-center gap-1">
                <Wrench size={10} />
                {toolCount} tool{toolCount !== 1 ? 's' : ''}
              </span>
            )}
            {resourceCount > 0 && (
              <span className="flex items-center gap-1">
                <Globe size={10} />
                {resourceCount} resource{resourceCount !== 1 ? 's' : ''}
              </span>
            )}
            {templateCount > 0 && (
              <span>{templateCount} template{templateCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-stroke/10 px-4 py-3 space-y-4">
          {/* Auth status */}
          {server.authStatus && !isAuthenticated && (
            <div className="rounded-md bg-status-error-muted px-3 py-2">
              <div className="text-xs font-medium text-status-error">Authentication Failed</div>
              {authError && (
                <div className="text-[10px] text-text-3 mt-0.5">{authError}</div>
              )}
            </div>
          )}

          {/* Tools list */}
          {toolCount > 0 && (
            <div>
              <div className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">
                Tools
              </div>
              <div className="space-y-1.5">
                {Object.entries(server.tools).map(([key, tool]) => (
                  <div
                    key={key}
                    className="rounded-md bg-surface-hover/[0.06] px-3 py-2"
                  >
                    <div className="text-xs font-medium text-text-1 font-mono">{tool.name}</div>
                    {tool.description && (
                      <div className="text-[10px] text-text-3 mt-0.5 line-clamp-2">
                        {tool.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources list */}
          {resourceCount > 0 && (
            <div>
              <div className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">
                Resources
              </div>
              <div className="space-y-1">
                {server.resources.map((resource, i) => (
                  <div
                    key={i}
                    className="rounded-md bg-surface-hover/[0.06] px-3 py-2"
                  >
                    <div className="text-xs font-mono text-text-2 truncate">{resource.uri}</div>
                    {resource.name && (
                      <div className="text-[10px] text-text-3">{resource.name}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resource templates */}
          {templateCount > 0 && (
            <div>
              <div className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">
                Resource Templates
              </div>
              <div className="space-y-1">
                {server.resourceTemplates.map((template, i) => (
                  <div
                    key={i}
                    className="rounded-md bg-surface-hover/[0.06] px-3 py-2"
                  >
                    <div className="text-xs font-mono text-text-2 truncate">
                      {template.uriTemplate}
                    </div>
                    {template.name && (
                      <div className="text-[10px] text-text-3">{template.name}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {toolCount === 0 && resourceCount === 0 && templateCount === 0 && (
            <div className="text-xs text-text-3 py-1">
              No tools or resources registered.
            </div>
          )}
        </div>
      )}
    </div>
  )
})

/**
 * MCP Server settings page
 * Lists connected MCP servers, their tools, resources, and auth status
 */
export const McpSettings = memo(function McpSettings() {
  const [servers, setServers] = useState<McpServerStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchServers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await serverApi.listMcpServers()
      setServers(response.data)
    } catch (err) {
      logError(err, {
        context: 'McpSettings',
        source: 'settings',
        details: 'Failed to list MCP servers',
      })
      setError('Failed to load MCP servers.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchServers()
  }, [fetchServers])

  return (
    <div className="space-y-8">
      <SettingsSection
        title="MCP Servers"
        description="Model Context Protocol servers connected to Codex."
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-text-3">
            {servers.length} server{servers.length !== 1 ? 's' : ''} connected
          </div>
          <button
            className={cn(
              'flex items-center gap-1 text-xs text-text-3 hover:text-text-1 transition-colors',
              isLoading && 'pointer-events-none'
            )}
            onClick={() => void fetchServers()}
            disabled={isLoading}
            aria-label="Refresh MCP servers"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {isLoading && servers.length === 0 ? (
          <SettingsCard>
            <div className="flex items-center gap-2 text-sm text-text-3 py-4">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading MCP servers...
            </div>
          </SettingsCard>
        ) : error ? (
          <SettingsCard>
            <div className="text-sm text-destructive py-2">
              {error}
              <button
                className="ml-2 text-primary underline"
                onClick={() => void fetchServers()}
              >
                Retry
              </button>
            </div>
          </SettingsCard>
        ) : servers.length === 0 ? (
          <SettingsCard>
            <div className="text-center py-6">
              <div className="text-sm text-text-3 mb-2">No MCP servers connected.</div>
              <p className="text-xs text-text-3">
                MCP servers are configured in your{' '}
                <code className="rounded bg-surface-hover/[0.12] px-1.5 py-0.5 font-mono">
                  ~/.codex/config.toml
                </code>{' '}
                file.
              </p>
            </div>
          </SettingsCard>
        ) : (
          <div className="space-y-2">
            {servers.map((server) => (
              <ServerCard key={server.name} server={server} />
            ))}
          </div>
        )}

        <div className="text-xs text-text-3 space-y-1">
          <p>
            <strong>Configuration:</strong> MCP servers are defined in{' '}
            <code className="rounded bg-surface-hover/[0.12] px-1 font-mono">
              ~/.codex/config.toml
            </code>{' '}
            under{' '}
            <code className="rounded bg-surface-hover/[0.12] px-1 font-mono">
              [mcp_servers]
            </code>.
          </p>
          <p>
            After editing the config file, click <strong>Refresh</strong> to reload.
          </p>
        </div>
      </SettingsSection>
    </div>
  )
})
