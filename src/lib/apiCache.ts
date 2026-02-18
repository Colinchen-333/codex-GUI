/**
 * API Request Cache Layer
 *
 * Caches frequently called APIs whose data changes infrequently,
 * reducing unnecessary IPC round-trips to the Tauri backend.
 *
 * Usage:
 * - getModels: model list rarely changes, cached 5 min
 * - listSkills: skills may change, cached 1 min, supports force reload
 * - listMcpServers: MCP server list is stable, cached 2 min
 */

/**
 * Cache entry with error support (errors use shorter TTL).
 */
interface CacheEntry<T> {
  data: T
  expiry: number
  isError?: boolean
}

const cache = new Map<string, CacheEntry<unknown>>()
const inFlight = new Map<string, Promise<unknown>>()
const requestSeq = new Map<string, number>()
const inFlightTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/** Error responses are cached with a shorter TTL to avoid locking in error state */
const ERROR_TTL_MS = 5000
const MAX_CACHE_ENTRIES = 200
const MAX_IN_FLIGHT_MS = 5 * 60 * 1000
const PRUNE_INTERVAL_MS = 30_000  // Only prune every 30 seconds minimum
const PRUNE_SIZE_THRESHOLD = 150  // Or when cache exceeds this size

let lastPruneTime = 0

function clearInFlightTimeout(key: string): void {
  const timeoutId = inFlightTimeouts.get(key)
  if (timeoutId) {
    clearTimeout(timeoutId)
    inFlightTimeouts.delete(key)
  }
}

function deleteCacheEntry(key: string): void {
  cache.delete(key)
  if (!inFlight.has(key)) {
    requestSeq.delete(key)
  }
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string') {
    return new Error(value)
  }
  try {
    return new Error(JSON.stringify(value))
  } catch (error) {
    return new Error(`Cached error: ${String(error)}`)
  }
}

function pruneCache(now: number): void {
  // Skip pruning if we pruned recently and cache isn't too large
  if (now - lastPruneTime < PRUNE_INTERVAL_MS && cache.size < PRUNE_SIZE_THRESHOLD) {
    return
  }
  lastPruneTime = now

  for (const [key, entry] of cache) {
    if (entry.expiry <= now && !inFlight.has(key)) {
      cache.delete(key)
      requestSeq.delete(key)
    }
  }

  if (cache.size <= MAX_CACHE_ENTRIES) return

  let overflow = cache.size - MAX_CACHE_ENTRIES
  for (const key of cache.keys()) {
    deleteCacheEntry(key)
    overflow -= 1
    if (overflow <= 0) break
  }
}

/**
 * Wrap an API call with caching.
 * Returns cached data if valid, otherwise calls the fetcher and updates the cache.
 *
 * @param key - Cache key identifying the API call
 * @param fetcher - The actual API call function
 * @param ttlMs - Cache TTL in milliseconds (default 60s)
 * @param cacheErrors - Whether to cache error responses (default true, with shorter TTL)
 *
 * @example
 * const models = await withCache('models', () => invoke<Model[]>('get_models'), 300000)
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 60000,
  cacheErrors: boolean = true
): Promise<T> {
  const now = Date.now()
  pruneCache(now)
  const cached = cache.get(key) as CacheEntry<T> | undefined

  // Return cached data if valid and not expired
  if (cached && cached.expiry > now) {
    if (cached.isError) {
      if (!cacheErrors) {
        deleteCacheEntry(key)
      } else {
        throw toError(cached.data)
      }
    } else {
      return cached.data
    }
  }

  const existing = inFlight.get(key) as Promise<T> | undefined
  if (existing) {
    return existing
  }

  // Call the actual API
  const requestId = (requestSeq.get(key) ?? 0) + 1
  requestSeq.set(key, requestId)

  const request = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      // Calculate expiry at completion time, not request start time
      if (requestSeq.get(key) === requestId) {
        cache.set(key, { data, expiry: Date.now() + ttlMs, isError: false })
      }
      pruneCache(Date.now())
      inFlight.delete(key)
      clearInFlightTimeout(key)
      return data
    })
    .catch((error) => {
      // Cache error responses with shorter TTL
      if (cacheErrors && requestSeq.get(key) === requestId) {
        cache.set(key, {
          data: error,
          expiry: Date.now() + ERROR_TTL_MS,
          isError: true,
        })
      }
      pruneCache(Date.now())
      inFlight.delete(key)
      clearInFlightTimeout(key)
      throw error
    })

  inFlight.set(key, request)
  clearInFlightTimeout(key)
  inFlightTimeouts.set(
    key,
    setTimeout(() => {
      if (inFlight.get(key) === request) {
        inFlight.delete(key)
        cache.delete(key)
        requestSeq.delete(key)
      }
      inFlightTimeouts.delete(key)
    }, MAX_IN_FLIGHT_MS)
  )

  return request
}

/**
 * Clear a specific cache entry. Used when data must be force-refreshed.
 */
export function clearCache(key: string): void {
  const hadInFlight = inFlight.has(key)
  inFlight.delete(key)
  clearInFlightTimeout(key)
  cache.delete(key)
  if (hadInFlight) {
    requestSeq.set(key, (requestSeq.get(key) ?? 0) + 1)
  } else {
    requestSeq.delete(key)
  }
}

/**
 * Clear all cache entries. Used on logout, project switch, or other
 * scenarios requiring a full state refresh.
 */
export function clearAllCache(): void {
  cache.clear()
  inFlight.clear()
  requestSeq.clear()
  for (const timeoutId of inFlightTimeouts.values()) {
    clearTimeout(timeoutId)
  }
  inFlightTimeouts.clear()
}

/**
 * Get cache statistics for debugging.
 * @returns Cache size and remaining TTL per entry (ms)
 */
export function getCacheStats(): { size: number; entries: Record<string, number> } {
  const entries: Record<string, number> = {}
  const now = Date.now()

  cache.forEach((entry, key) => {
    entries[key] = Math.max(0, entry.expiry - now)
  })

  return {
    size: cache.size,
    entries
  }
}

// Cache key constants
export const CACHE_KEYS = {
  MODELS: 'models',
  SKILLS: 'skills',
  MCP_SERVERS: 'mcpServers',
  ACCOUNT_INFO: 'accountInfo',
  SERVER_STATUS: 'serverStatus',
  RATE_LIMITS: 'rateLimits',
  GIT_INFO: 'gitInfo',
} as const

// Cache TTL constants (milliseconds)
export const CACHE_TTL = {
  MODELS: 5 * 60 * 1000,      // 5 min - model list rarely changes
  SKILLS: 60 * 1000,          // 1 min - skills may change dynamically
  MCP_SERVERS: 2 * 60 * 1000, // 2 min - MCP servers are stable
  ACCOUNT_INFO: 60 * 1000,    // 1 min - account info may change
  SERVER_STATUS: 10 * 1000,   // 10s - server status needs high freshness
  RATE_LIMITS: 30 * 1000,     // 30s - rate limits moderately cached
  GIT_INFO: 30 * 1000,        // 30s - git info moderately cached
} as const
