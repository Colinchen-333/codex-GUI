import { useState, useEffect, useRef } from 'react'
import { useAgents, useWorkflow } from '@/hooks/useMultiAgent'
import { useMultiAgentStore } from '@/stores/multi-agent-v2'
import { useSettingsStore } from '@/stores/settings'
import { useProjectsStore } from '@/stores/projects'
import { useModelsStore } from '@/stores/models'
import { createPlanModeWorkflow } from '@/lib/workflows/plan-mode'
import { parseError } from '@/lib/errorUtils'
import { useToast } from '@/components/ui/useToast'
import { WorkflowStageHeader } from './WorkflowStageHeader'
import {
  WorkbenchLayout,
  AgentOutputPanel,
  MainConversation,
  WorkbenchStatusBar,
} from './workbench'

function resolveProjectId(
  dir: string,
  projects: Array<{ id: string; path: string }>,
  selectedProjectId: string
): { projectId: string; needsCreate: boolean; path: string } {
  const normalizedDir = dir.replace(/\\/g, '/').replace(/\/+$/, '')
  const candidates = projects.filter((project) => {
    const normalizedPath = project.path.replace(/\\/g, '/').replace(/\/+$/, '')
    return normalizedDir === normalizedPath || normalizedDir.startsWith(`${normalizedPath}/`)
  })
  if (candidates.length === 0) {
    if (selectedProjectId) {
      return { projectId: selectedProjectId, needsCreate: false, path: normalizedDir }
    }
    return { projectId: '', needsCreate: true, path: normalizedDir }
  }
  candidates.sort((a, b) => b.path.length - a.path.length)
  return { projectId: candidates[0].id, needsCreate: false, path: normalizedDir }
}

export function MultiAgentViewContainer() {
  const agents = useAgents()
  const workflow = useWorkflow()
  const workingDirectory = useMultiAgentStore((s) => s.workingDirectory)
  const setWorkingDirectory = useMultiAgentStore((s) => s.setWorkingDirectory)
  const setConfig = useMultiAgentStore((s) => s.setConfig)
  const clearWorkflow = useMultiAgentStore((s) => s.clearWorkflow)
  const clearAgents = useMultiAgentStore((s) => s.clearAgents)
  const startWorkflow = useMultiAgentStore((s) => s.startWorkflow)
  const { toast } = useToast()

  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const prevRunningIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const currentRunningIds = new Set(
      agents.filter((a) => a.status === 'running').map((a) => a.id)
    )

    for (const agentId of currentRunningIds) {
      if (!prevRunningIdsRef.current.has(agentId)) {
        setActiveAgentId(agentId)
        break
      }
    }

    prevRunningIdsRef.current = currentRunningIds

    if (!activeAgentId && agents.length > 0) {
      setActiveAgentId(agents[0].id)
    }
  }, [agents, activeAgentId])

  const handleSendTask = async (task: string) => {
    const settingsStore = useSettingsStore.getState()
    const projectsStore = useProjectsStore.getState()
    const modelsStore = useModelsStore.getState()

    if (!workingDirectory) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog')
        const selected = await open({
          directory: true,
          multiple: false,
          title: '选择工作目录',
        })
        if (!selected || typeof selected !== 'string') {
          toast.error('请先选择工作目录')
          return
        }
        const { exists } = await import('@tauri-apps/plugin-fs')
        if (!(await exists(selected))) {
          toast.error('目录不存在')
          return
        }
        setWorkingDirectory(selected)
        await executeWorkflow(task, selected, settingsStore, projectsStore, modelsStore)
      } catch (err) {
        toast.error(`选择目录失败: ${parseError(err)}`)
      }
      return
    }

    await executeWorkflow(task, workingDirectory, settingsStore, projectsStore, modelsStore)
  }

  const executeWorkflow = async (
    task: string,
    cwd: string,
    settingsStore: ReturnType<typeof useSettingsStore.getState>,
    projectsStore: ReturnType<typeof useProjectsStore.getState>,
    modelsStore: ReturnType<typeof useModelsStore.getState>
  ) => {
    const model =
      settingsStore.settings.model ||
      modelsStore.getDefaultModel()?.model ||
      'codex-mini-latest'

    const resolved = resolveProjectId(
      cwd,
      projectsStore.projects,
      projectsStore.selectedProjectId ?? ''
    )
    let projectId = resolved.projectId

    if (resolved.needsCreate) {
      try {
        const newProject = await projectsStore.addProject(resolved.path)
        projectId = newProject.id
      } catch (err) {
        toast.error(`创建项目失败: ${parseError(err)}`)
        return
      }
    }

    setConfig({
      model,
      approvalPolicy: settingsStore.settings.approvalPolicy || 'on-request',
      timeout: 300,
      projectId,
      cwd,
    })

    clearWorkflow()
    await clearAgents()

    const newWorkflow = createPlanModeWorkflow(task, {
      workingDirectory: cwd,
      userTask: task,
      globalConfig: { model, approvalPolicy: settingsStore.settings.approvalPolicy },
    })

    await startWorkflow(newWorkflow)
  }

  return (
    <div className="flex flex-col h-screen">
      {workflow && (
        <WorkflowStageHeader 
          workflow={workflow}
          onRecoverTimeout={(phaseId) => {
            useMultiAgentStore.getState().recoverApprovalTimeout(phaseId)
          }}
        />
      )}
      
      <div className="flex-1 overflow-hidden">
        <WorkbenchLayout>
          <AgentOutputPanel
            activeAgentId={activeAgentId}
            onAgentSelect={setActiveAgentId}
          />
          <MainConversation
            activeAgentId={activeAgentId}
            onSendTask={handleSendTask}
          />
          <WorkbenchStatusBar />
        </WorkbenchLayout>
      </div>
    </div>
  )
}
