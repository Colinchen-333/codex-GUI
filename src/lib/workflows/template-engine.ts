import type {
  Workflow,
  WorkflowPhase,
  WorkflowTemplate,
  PhaseTemplate,
  WorkflowExecutionContext,
  AgentType,
} from './types'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function interpolateTask(template: string, userTask: string): string {
  return template.replace(/\{\{userTask\}\}/g, userTask)
}

export function createWorkflowFromTemplate(
  template: WorkflowTemplate,
  userTask: string,
  _context: WorkflowExecutionContext
): Workflow {
  const workflowId = `workflow-${Date.now()}-${generateId()}`

  const phases: WorkflowPhase[] = template.phases.map((phaseTemplate: PhaseTemplate) => {
    const agentTypes: AgentType[] = []
    const tasks: string[] = []

    for (const group of phaseTemplate.agentGroups) {
      for (let i = 0; i < group.count; i++) {
        agentTypes.push(group.type)
        tasks.push(interpolateTask(group.taskTemplate, userTask))
      }
    }

    return {
      id: `${workflowId}-${phaseTemplate.id}`,
      kind: phaseTemplate.kind,
      name: phaseTemplate.name,
      description: phaseTemplate.description,
      agentIds: [],
      status: 'pending',
      requiresApproval: phaseTemplate.requiresApproval,
      approvalTimeoutMs: phaseTemplate.approvalTimeoutMs,
      createdAt: new Date(),
      metadata: {
        agentCount: agentTypes.length,
        agentTypes,
        tasks,
        templatePhaseId: phaseTemplate.id,
      },
    } satisfies WorkflowPhase
  })

  return {
    id: workflowId,
    name: template.name,
    description: `${template.description}: ${userTask}`,
    phases,
    currentPhaseIndex: 0,
    status: 'pending',
    createdAt: new Date(),
  }
}

export function validateTemplate(template: WorkflowTemplate): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!template.id || template.id.trim() === '') {
    errors.push('Template must have an id')
  }

  if (!template.name || template.name.trim() === '') {
    errors.push('Template must have a name')
  }

  if (!template.phases || template.phases.length === 0) {
    errors.push('Template must have at least one phase')
  }

  for (const phase of template.phases) {
    if (!phase.id || phase.id.trim() === '') {
      errors.push(`Phase must have an id`)
    }

    if (!phase.name || phase.name.trim() === '') {
      errors.push(`Phase "${phase.id}" must have a name`)
    }

    if (!phase.agentGroups || phase.agentGroups.length === 0) {
      errors.push(`Phase "${phase.name}" must have at least one agent group`)
    }

    for (const group of phase.agentGroups) {
      if (group.count < 1) {
        errors.push(`Agent group in phase "${phase.name}" must have count >= 1`)
      }

      if (!group.taskTemplate || group.taskTemplate.trim() === '') {
        errors.push(`Agent group in phase "${phase.name}" must have a taskTemplate`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

export function cloneTemplate(
  template: WorkflowTemplate,
  newId: string,
  newName: string
): WorkflowTemplate {
  const now = new Date()
  return {
    ...structuredClone(template),
    id: newId,
    name: newName,
    source: 'user',
    createdAt: now,
    updatedAt: now,
  }
}
