import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkflowTemplate } from '../lib/workflows/types'
import { BUILTIN_TEMPLATES, getDefaultTemplate } from '../lib/workflows/presets'
import { validateTemplate, cloneTemplate } from '../lib/workflows/template-engine'

interface WorkflowTemplatesState {
  userTemplates: WorkflowTemplate[]
  selectedTemplateId: string

  getAllTemplates: () => WorkflowTemplate[]
  getTemplate: (id: string) => WorkflowTemplate | undefined
  getSelectedTemplate: () => WorkflowTemplate

  selectTemplate: (id: string) => void
  saveUserTemplate: (template: WorkflowTemplate) => { success: boolean; errors?: string[] }
  deleteUserTemplate: (id: string) => boolean
  duplicateTemplate: (id: string, newName: string) => WorkflowTemplate | null
}

const STORAGE_KEY = 'codex-workflow-templates'
const STORAGE_VERSION = 1

export const useWorkflowTemplatesStore = create<WorkflowTemplatesState>()(
  persist(
    (set, get) => ({
      userTemplates: [],
      selectedTemplateId: getDefaultTemplate().id,

      getAllTemplates: () => {
        return [...BUILTIN_TEMPLATES, ...get().userTemplates]
      },

      getTemplate: (id: string) => {
        const builtin = BUILTIN_TEMPLATES.find((t) => t.id === id)
        if (builtin) return builtin
        return get().userTemplates.find((t) => t.id === id)
      },

      getSelectedTemplate: () => {
        const template = get().getTemplate(get().selectedTemplateId)
        return template ?? getDefaultTemplate()
      },

      selectTemplate: (id: string) => {
        const template = get().getTemplate(id)
        if (template) {
          set({ selectedTemplateId: id })
        }
      },

      saveUserTemplate: (template: WorkflowTemplate) => {
        const validation = validateTemplate(template)
        if (!validation.valid) {
          return { success: false, errors: validation.errors }
        }

        const isBuiltin = BUILTIN_TEMPLATES.some((t) => t.id === template.id)
        if (isBuiltin) {
          return { success: false, errors: ['Cannot overwrite built-in template'] }
        }

        const updatedTemplate: WorkflowTemplate = {
          ...template,
          source: 'user',
          updatedAt: new Date(),
        }

        set((state) => {
          const existingIndex = state.userTemplates.findIndex((t) => t.id === template.id)
          if (existingIndex >= 0) {
            const updated = [...state.userTemplates]
            updated[existingIndex] = updatedTemplate
            return { userTemplates: updated }
          } else {
            return { userTemplates: [...state.userTemplates, updatedTemplate] }
          }
        })

        return { success: true }
      },

      deleteUserTemplate: (id: string) => {
        const isBuiltin = BUILTIN_TEMPLATES.some((t) => t.id === id)
        if (isBuiltin) return false

        const exists = get().userTemplates.some((t) => t.id === id)
        if (!exists) return false

        set((state) => {
          const newTemplates = state.userTemplates.filter((t) => t.id !== id)
          const newSelectedId =
            state.selectedTemplateId === id ? getDefaultTemplate().id : state.selectedTemplateId
          return {
            userTemplates: newTemplates,
            selectedTemplateId: newSelectedId,
          }
        })

        return true
      },

      duplicateTemplate: (id: string, newName: string) => {
        const original = get().getTemplate(id)
        if (!original) return null

        const newId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const cloned = cloneTemplate(original, newId, newName)

        const result = get().saveUserTemplate(cloned)
        if (!result.success) return null

        return cloned
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      partialize: (state) => ({
        userTemplates: state.userTemplates,
        selectedTemplateId: state.selectedTemplateId,
      }),
      migrate: (persistedState, version) => {
        if (version < STORAGE_VERSION) {
          return {
            userTemplates: [],
            selectedTemplateId: getDefaultTemplate().id,
          }
        }
        return persistedState as { userTemplates: WorkflowTemplate[]; selectedTemplateId: string }
      },
    }
  )
)
