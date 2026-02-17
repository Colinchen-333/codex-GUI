import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  withCache,
  clearCache,
  clearAllCache,
  getCacheStats,
  CACHE_KEYS,
  CACHE_TTL,
} from '../apiCache'

describe('apiCache', () => {
  beforeEach(() => {
    clearAllCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('withCache', () => {
    it('calls fetcher and returns data on cache miss', async () => {
      const fetcher = vi.fn().mockResolvedValue(['model-a', 'model-b'])

      const result = await withCache('test-key', fetcher, 60000)

      expect(fetcher).toHaveBeenCalledOnce()
      expect(result).toEqual(['model-a', 'model-b'])
    })

    it('returns cached data on subsequent calls within TTL', async () => {
      const fetcher = vi.fn().mockResolvedValue('data')

      const first = await withCache('key', fetcher, 60000)
      const second = await withCache('key', fetcher, 60000)

      expect(fetcher).toHaveBeenCalledOnce()
      expect(first).toBe('data')
      expect(second).toBe('data')
    })

    it('re-fetches data after TTL expires', async () => {
      const fetcher = vi.fn()
        .mockResolvedValueOnce('old-data')
        .mockResolvedValueOnce('new-data')

      await withCache('key', fetcher, 1000)

      // Advance time past TTL and past prune interval
      vi.advanceTimersByTime(31000)

      const result = await withCache('key', fetcher, 1000)

      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(result).toBe('new-data')
    })

    it('deduplicates in-flight requests for the same key', async () => {
      let resolvePromise: (value: string) => void
      const fetcher = vi.fn().mockImplementation(
        () => new Promise<string>((resolve) => {
          resolvePromise = resolve
        })
      )

      const p1 = withCache('dedup-key', fetcher, 60000)

      // Wait a microtask so the fetcher gets invoked (withCache wraps it in Promise.resolve().then())
      await vi.advanceTimersByTimeAsync(0)

      const p2 = withCache('dedup-key', fetcher, 60000)

      // Fetcher should only be called once despite two withCache calls
      expect(fetcher).toHaveBeenCalledOnce()

      resolvePromise!('result')

      const [r1, r2] = await Promise.all([p1, p2])
      expect(r1).toBe('result')
      expect(r2).toBe('result')
    })

    it('caches errors with shorter TTL when cacheErrors is true', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('API down'))

      await expect(withCache('key', fetcher, 60000, true)).rejects.toThrow('API down')

      // Second call within error TTL (5s) should throw cached error
      await expect(withCache('key', fetcher, 60000, true)).rejects.toThrow('API down')

      // The fetcher should only be called once
      expect(fetcher).toHaveBeenCalledOnce()
    })

    it('does not cache errors when cacheErrors is false', async () => {
      const fetcher = vi.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce('recovered')

      await expect(withCache('key', fetcher, 60000, false)).rejects.toThrow('transient')

      // Advance past prune interval
      vi.advanceTimersByTime(31000)

      const result = await withCache('key', fetcher, 60000, false)
      expect(result).toBe('recovered')
      expect(fetcher).toHaveBeenCalledTimes(2)
    })

    it('propagates errors from the fetcher', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('Network failure'))

      await expect(withCache('key', fetcher, 60000)).rejects.toThrow('Network failure')
    })
  })

  describe('clearCache', () => {
    it('removes a specific cache entry', async () => {
      const fetcher = vi.fn().mockResolvedValue('data')

      await withCache('key', fetcher, 60000)
      expect(fetcher).toHaveBeenCalledOnce()

      clearCache('key')

      await withCache('key', fetcher, 60000)
      expect(fetcher).toHaveBeenCalledTimes(2)
    })

    it('does not affect other cache entries', async () => {
      const fetcherA = vi.fn().mockResolvedValue('A')
      const fetcherB = vi.fn().mockResolvedValue('B')

      await withCache('a', fetcherA, 60000)
      await withCache('b', fetcherB, 60000)

      clearCache('a')

      // 'b' should still be cached
      await withCache('b', fetcherB, 60000)
      expect(fetcherB).toHaveBeenCalledOnce()
    })
  })

  describe('clearAllCache', () => {
    it('removes all cached entries', async () => {
      const fetcherA = vi.fn().mockResolvedValue('A')
      const fetcherB = vi.fn().mockResolvedValue('B')

      await withCache('a', fetcherA, 60000)
      await withCache('b', fetcherB, 60000)

      clearAllCache()

      await withCache('a', fetcherA, 60000)
      await withCache('b', fetcherB, 60000)

      expect(fetcherA).toHaveBeenCalledTimes(2)
      expect(fetcherB).toHaveBeenCalledTimes(2)
    })
  })

  describe('getCacheStats', () => {
    it('returns empty stats when cache is empty', () => {
      const stats = getCacheStats()
      expect(stats.size).toBe(0)
      expect(stats.entries).toEqual({})
    })

    it('returns correct entry count and remaining TTL', async () => {
      const fetcher = vi.fn().mockResolvedValue('data')
      await withCache('models', fetcher, 60000)

      const stats = getCacheStats()
      expect(stats.size).toBe(1)
      expect(stats.entries['models']).toBeGreaterThan(0)
      expect(stats.entries['models']).toBeLessThanOrEqual(60000)
    })
  })

  describe('CACHE_KEYS', () => {
    it('exports expected cache key constants', () => {
      expect(CACHE_KEYS.MODELS).toBe('models')
      expect(CACHE_KEYS.SKILLS).toBe('skills')
      expect(CACHE_KEYS.MCP_SERVERS).toBe('mcpServers')
      expect(CACHE_KEYS.ACCOUNT_INFO).toBe('accountInfo')
      expect(CACHE_KEYS.SERVER_STATUS).toBe('serverStatus')
      expect(CACHE_KEYS.RATE_LIMITS).toBe('rateLimits')
      expect(CACHE_KEYS.GIT_INFO).toBe('gitInfo')
    })
  })

  describe('CACHE_TTL', () => {
    it('exports expected TTL values', () => {
      expect(CACHE_TTL.MODELS).toBe(5 * 60 * 1000)
      expect(CACHE_TTL.SKILLS).toBe(60 * 1000)
      expect(CACHE_TTL.MCP_SERVERS).toBe(2 * 60 * 1000)
      expect(CACHE_TTL.SERVER_STATUS).toBe(10 * 1000)
    })
  })
})
