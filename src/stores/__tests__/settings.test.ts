import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useSettingsStore,
  getThreadSettings,
  mergeProjectSettings,
  getEffectiveWorkingDirectory,
  type Settings,
} from '../settings'

// Mock the normalize module
vi.mock('../../lib/normalize', () => ({
  normalizeSandboxMode: vi.fn((v: string | null | undefined) => {
    const valid = ['read-only', 'workspace-write', 'danger-full-access']
    return v && valid.includes(v) ? v : undefined
  }),
  normalizeApprovalPolicy: vi.fn((v: string | null | undefined) => {
    const valid = ['on-request', 'on-failure', 'never', 'untrusted']
    return v && valid.includes(v) ? v : undefined
  }),
  normalizeReasoningEffort: vi.fn((v: string | null | undefined) => {
    const valid = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh']
    return v && valid.includes(v) ? v : undefined
  }),
  normalizeReasoningSummary: vi.fn((v: string | null | undefined) => {
    const valid = ['none', 'concise', 'detailed']
    return v && valid.includes(v) ? v : undefined
  }),
}))

const defaultSettings: Settings = {
  model: '',
  sandboxMode: 'workspace-write',
  approvalPolicy: 'on-request',
  reasoningEffort: 'medium',
  reasoningSummary: 'concise',
}

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: { ...defaultSettings } })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has correct default settings', () => {
      const { settings } = useSettingsStore.getState()
      expect(settings.model).toBe('')
      expect(settings.sandboxMode).toBe('workspace-write')
      expect(settings.approvalPolicy).toBe('on-request')
      expect(settings.reasoningEffort).toBe('medium')
      expect(settings.reasoningSummary).toBe('concise')
    })
  })

  describe('updateSetting', () => {
    it('updates a single setting', () => {
      useSettingsStore.getState().updateSetting('model', 'o3-mini')
      expect(useSettingsStore.getState().settings.model).toBe('o3-mini')
    })

    it('does not affect other settings', () => {
      useSettingsStore.getState().updateSetting('sandboxMode', 'read-only')
      const { settings } = useSettingsStore.getState()
      expect(settings.sandboxMode).toBe('read-only')
      expect(settings.model).toBe('')
      expect(settings.approvalPolicy).toBe('on-request')
    })

    it('updates approvalPolicy', () => {
      useSettingsStore.getState().updateSetting('approvalPolicy', 'never')
      expect(useSettingsStore.getState().settings.approvalPolicy).toBe('never')
    })

    it('updates reasoningEffort', () => {
      useSettingsStore.getState().updateSetting('reasoningEffort', 'high')
      expect(useSettingsStore.getState().settings.reasoningEffort).toBe('high')
    })
  })

  describe('resetSettings', () => {
    it('resets all settings to defaults', () => {
      useSettingsStore.getState().updateSetting('model', 'custom-model')
      useSettingsStore.getState().updateSetting('sandboxMode', 'danger-full-access')
      useSettingsStore.getState().updateSetting('approvalPolicy', 'never')

      useSettingsStore.getState().resetSettings()

      const { settings } = useSettingsStore.getState()
      expect(settings).toEqual(defaultSettings)
    })
  })
})

describe('getThreadSettings', () => {
  it('maps settings to thread start format', () => {
    const settings: Settings = {
      model: 'o3-mini',
      sandboxMode: 'workspace-write',
      approvalPolicy: 'on-request',
      reasoningEffort: 'medium',
      reasoningSummary: 'concise',
    }

    const result = getThreadSettings(settings)

    expect(result).toEqual({
      model: 'o3-mini',
      sandbox: 'workspace-write',
      approvalPolicy: 'on-request',
      reasoningEffort: 'medium',
      reasoningSummary: 'concise',
    })
  })

  it('uses sandbox as the key name (not sandboxMode)', () => {
    const result = getThreadSettings(defaultSettings)
    expect(result).toHaveProperty('sandbox')
    expect(result).not.toHaveProperty('sandboxMode')
  })
})

describe('mergeProjectSettings', () => {
  it('returns global settings when projectSettingsJson is null', () => {
    const result = mergeProjectSettings(defaultSettings, null)
    expect(result).toEqual(defaultSettings)
  })

  it('returns global settings when projectSettingsJson is invalid JSON', () => {
    const result = mergeProjectSettings(defaultSettings, 'not-json{')
    expect(result).toEqual(defaultSettings)
  })

  it('overrides model from project settings', () => {
    const json = JSON.stringify({ model: 'gpt-4o' })
    const result = mergeProjectSettings(defaultSettings, json)
    expect(result.model).toBe('gpt-4o')
  })

  it('overrides sandboxMode from project settings', () => {
    const json = JSON.stringify({ sandboxMode: 'read-only' })
    const result = mergeProjectSettings(defaultSettings, json)
    expect(result.sandboxMode).toBe('read-only')
  })

  it('overrides approvalPolicy via askForApproval field', () => {
    const json = JSON.stringify({ askForApproval: 'never' })
    const result = mergeProjectSettings(defaultSettings, json)
    expect(result.approvalPolicy).toBe('never')
  })

  it('falls back to global settings for invalid project values', () => {
    const json = JSON.stringify({ sandboxMode: 'invalid-mode' })
    const result = mergeProjectSettings(defaultSettings, json)
    expect(result.sandboxMode).toBe('workspace-write')
  })

  it('keeps global values for unset project fields', () => {
    const json = JSON.stringify({ model: 'gpt-4o' })
    const result = mergeProjectSettings(defaultSettings, json)
    expect(result.sandboxMode).toBe('workspace-write')
    expect(result.approvalPolicy).toBe('on-request')
  })
})

describe('getEffectiveWorkingDirectory', () => {
  it('returns project path when no settingsJson', () => {
    const result = getEffectiveWorkingDirectory('/project/root', null)
    expect(result).toBe('/project/root')
  })

  it('returns project path when settingsJson has no cwd', () => {
    const json = JSON.stringify({ model: 'o3-mini' })
    const result = getEffectiveWorkingDirectory('/project/root', json)
    expect(result).toBe('/project/root')
  })

  it('returns cwd from project settings when present', () => {
    const json = JSON.stringify({ cwd: '/custom/work/dir' })
    const result = getEffectiveWorkingDirectory('/project/root', json)
    expect(result).toBe('/custom/work/dir')
  })

  it('returns project path for invalid JSON', () => {
    const result = getEffectiveWorkingDirectory('/project/root', '{bad}')
    expect(result).toBe('/project/root')
  })
})
