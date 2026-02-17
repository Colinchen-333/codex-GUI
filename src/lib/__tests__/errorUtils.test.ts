import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseError,
  getErrorInfo,
  isErrorType,
  ErrorTypes,
  emitError,
  subscribeToErrors,
  handleAsyncError,
  withTimeout,
  withImportFallback,
} from '../errorUtils'

// Mock the logger
vi.mock('../logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('parseError', () => {
  it('extracts message from Error instances', () => {
    expect(parseError(new Error('Something failed'))).toBe('Something failed')
  })

  it('extracts message from Tauri error objects', () => {
    const tauriError = { message: 'Backend error', errorInfo: { type: 'unauthorized' } }
    expect(parseError(tauriError)).toBe('Backend error')
  })

  it('extracts message from generic objects with message property', () => {
    expect(parseError({ message: 'Generic error' })).toBe('Generic error')
  })

  it('converts plain strings', () => {
    expect(parseError('plain error string')).toBe('plain error string')
  })

  it('stringifies objects without message property', () => {
    const result = parseError({ code: 404, detail: 'not found' })
    expect(result).toContain('404')
    expect(result).toContain('not found')
  })

  it('handles null', () => {
    expect(parseError(null)).toBe('null')
  })

  it('handles undefined', () => {
    expect(parseError(undefined)).toBe('undefined')
  })

  it('handles numbers', () => {
    expect(parseError(42)).toBe('42')
  })

  it('truncates long messages', () => {
    const longMessage = 'x'.repeat(3000)
    const result = parseError(new Error(longMessage))
    expect(result.length).toBeLessThan(3000)
    expect(result).toContain('[truncated]')
  })

  it('handles circular references without throwing', () => {
    const obj: Record<string, unknown> = { name: 'test' }
    obj.self = obj
    const result = parseError(obj)
    expect(result).toContain('Circular')
  })
})

describe('getErrorInfo', () => {
  it('returns errorInfo from Tauri errors', () => {
    const error = {
      message: 'Unauthorized',
      errorInfo: { type: 'unauthorized', httpStatusCode: 401 },
    }
    const info = getErrorInfo(error)
    expect(info).toEqual({ type: 'unauthorized', httpStatusCode: 401 })
  })

  it('returns undefined for plain errors', () => {
    expect(getErrorInfo(new Error('plain'))).toBeUndefined()
  })

  it('returns undefined for non-object errors', () => {
    expect(getErrorInfo('string error')).toBeUndefined()
  })
})

describe('isErrorType', () => {
  it('returns true when error type matches', () => {
    const error = {
      message: 'Auth failed',
      errorInfo: { type: 'unauthorized' },
    }
    expect(isErrorType(error, 'unauthorized')).toBe(true)
  })

  it('returns false when error type does not match', () => {
    const error = {
      message: 'Auth failed',
      errorInfo: { type: 'unauthorized' },
    }
    expect(isErrorType(error, 'not_found')).toBe(false)
  })

  it('returns false for errors without errorInfo', () => {
    expect(isErrorType(new Error('plain'), 'unauthorized')).toBe(false)
  })
})

describe('ErrorTypes', () => {
  it('isUnauthorized checks for unauthorized type', () => {
    const error = { message: 'e', errorInfo: { type: 'unauthorized' } }
    expect(ErrorTypes.isUnauthorized(error)).toBe(true)
    expect(ErrorTypes.isUnauthorized({ message: 'e', errorInfo: { type: 'other' } })).toBe(false)
  })

  it('isContextWindowExceeded checks correctly', () => {
    const error = { message: 'e', errorInfo: { type: 'context_window_exceeded' } }
    expect(ErrorTypes.isContextWindowExceeded(error)).toBe(true)
  })

  it('isConnectionFailed checks correctly', () => {
    const error = { message: 'e', errorInfo: { type: 'http_connection_failed' } }
    expect(ErrorTypes.isConnectionFailed(error)).toBe(true)
  })

  it('isSandboxError checks correctly', () => {
    const error = { message: 'e', errorInfo: { type: 'sandbox_error' } }
    expect(ErrorTypes.isSandboxError(error)).toBe(true)
  })
})

describe('subscribeToErrors / emitError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('notifies subscribers when an error is emitted', () => {
    const listener = vi.fn()
    const unsub = subscribeToErrors(listener)

    emitError('Test error', 'error', 'test-source', 'context')

    expect(listener).toHaveBeenCalledOnce()
    const notification = listener.mock.calls[0][0]
    expect(notification.message).toBe('Test error')
    expect(notification.severity).toBe('error')
    expect(notification.source).toBe('test-source')

    unsub()
  })

  it('unsubscribe stops notifications', () => {
    const listener = vi.fn()
    const unsub = subscribeToErrors(listener)
    unsub()

    emitError('After unsub', 'error')

    expect(listener).not.toHaveBeenCalled()
  })

  it('does not throw when a listener throws', () => {
    const badListener = vi.fn().mockImplementation(() => {
      throw new Error('listener crash')
    })
    const unsub = subscribeToErrors(badListener)

    expect(() => emitError('test', 'error')).not.toThrow()

    unsub()
  })
})

describe('handleAsyncError', () => {
  it('logs the error and emits notification', () => {
    const listener = vi.fn()
    const unsub = subscribeToErrors(listener)

    handleAsyncError(new Error('async fail'), 'TestContext', 'test-source')

    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0][0].message).toBe('async fail')

    unsub()
  })
})

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('resolves if promise completes before timeout', async () => {
    const promise = Promise.resolve('done')
    const result = await withTimeout(promise, 5000, 'test')
    expect(result).toBe('done')
  })

  it('rejects with timeout error if promise takes too long', async () => {
    const promise = new Promise<string>(() => {
      // Never resolves
    })

    const timeoutPromise = withTimeout(promise, 100, 'slow operation')

    vi.advanceTimersByTime(101)

    await expect(timeoutPromise).rejects.toThrow('Operation timed out after 100ms: slow operation')
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})

describe('withImportFallback', () => {
  it('returns import result on success', async () => {
    const importFn = vi.fn().mockResolvedValue({ default: 'module' })
    const result = await withImportFallback(importFn, null, 5000, 'test-import')
    expect(result).toEqual({ default: 'module' })
  })

  it('returns fallback on import failure', async () => {
    const importFn = vi.fn().mockRejectedValue(new Error('Module not found'))
    const result = await withImportFallback(importFn, 'fallback-value', 5000, 'test-import')
    expect(result).toBe('fallback-value')
  })
})
