import type { WorkflowTemplate } from './types'

const SCHEMA_VERSION = 1
const BUILTIN_DATE = new Date('2025-01-01')

export const PLAN_MODE_TEMPLATE: WorkflowTemplate = {
  id: 'builtin-plan-mode',
  name: 'Plan Mode',
  description: '4阶段结构化工作流：探索→设计→审查→实施',
  source: 'builtin',
  schemaVersion: SCHEMA_VERSION,
  createdAt: BUILTIN_DATE,
  updatedAt: BUILTIN_DATE,
  phases: [
    {
      id: 'explore',
      kind: 'explore',
      name: '探索',
      description: '探索代码库，理解现有结构和相关代码',
      requiresApproval: false,
      agentGroups: [
        {
          id: 'explore-1',
          type: 'explore',
          count: 1,
          taskTemplate: '探索与任务相关的代码结构：{{userTask}}',
        },
        {
          id: 'explore-2',
          type: 'explore',
          count: 1,
          taskTemplate: '查找现有的相似实现和模式，为任务提供参考：{{userTask}}',
        },
      ],
    },
    {
      id: 'design',
      kind: 'design',
      name: '设计',
      description: '基于探索结果，设计详细的实施方案',
      requiresApproval: true,
      approvalTimeoutMs: 5 * 60 * 1000,
      agentGroups: [
        {
          id: 'plan-1',
          type: 'plan',
          count: 1,
          taskTemplate: `基于探索阶段的发现，设计完整的实施方案：{{userTask}}
请包括：
1. 需要修改的文件列表
2. 详细的实施步骤
3. 潜在的风险和注意事项`,
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      name: '审查',
      description: '审查设计方案的可行性和完整性',
      requiresApproval: true,
      approvalTimeoutMs: 5 * 60 * 1000,
      agentGroups: [
        {
          id: 'review-1',
          type: 'reviewer',
          count: 1,
          taskTemplate: `审查设计方案，检查以下方面：
1. 方案是否完整可行
2. 是否遵循了项目的架构和代码规范
3. 是否存在潜在的问题或遗漏
4. 提供改进建议`,
        },
      ],
    },
    {
      id: 'implement',
      kind: 'implement',
      name: '实施',
      description: '执行代码变更和测试',
      requiresApproval: false,
      agentGroups: [
        {
          id: 'coder-1',
          type: 'code-writer',
          count: 1,
          taskTemplate: '根据设计方案实施代码变更：{{userTask}}',
        },
        {
          id: 'tester-1',
          type: 'tester',
          count: 1,
          taskTemplate: '为新实现的功能编写测试用例并执行测试',
        },
      ],
    },
  ],
}

export const QUICK_FIX_TEMPLATE: WorkflowTemplate = {
  id: 'builtin-quick-fix',
  name: 'Quick Fix',
  description: '快速修复：探索→实施，适合小型bug修复',
  source: 'builtin',
  schemaVersion: SCHEMA_VERSION,
  createdAt: BUILTIN_DATE,
  updatedAt: BUILTIN_DATE,
  phases: [
    {
      id: 'explore',
      kind: 'explore',
      name: '探索',
      description: '快速定位问题相关代码',
      requiresApproval: false,
      agentGroups: [
        {
          id: 'explore-1',
          type: 'explore',
          count: 1,
          taskTemplate: '快速定位与问题相关的代码：{{userTask}}',
        },
      ],
    },
    {
      id: 'implement',
      kind: 'implement',
      name: '实施',
      description: '快速实施修复',
      requiresApproval: false,
      agentGroups: [
        {
          id: 'coder-1',
          type: 'code-writer',
          count: 1,
          taskTemplate: '直接修复问题：{{userTask}}',
        },
        {
          id: 'coder-2',
          type: 'code-writer',
          count: 1,
          taskTemplate: '验证修复并确保没有引入新问题',
        },
      ],
    },
  ],
}

export const REFACTOR_TEMPLATE: WorkflowTemplate = {
  id: 'builtin-refactor',
  name: 'Refactor',
  description: '重构工作流：探索→设计→实施→审查',
  source: 'builtin',
  schemaVersion: SCHEMA_VERSION,
  createdAt: BUILTIN_DATE,
  updatedAt: BUILTIN_DATE,
  phases: [
    {
      id: 'explore',
      kind: 'explore',
      name: '探索',
      description: '分析现有代码结构和依赖关系',
      requiresApproval: false,
      agentGroups: [
        {
          id: 'explore-1',
          type: 'explore',
          count: 1,
          taskTemplate: '分析需要重构的代码结构：{{userTask}}',
        },
        {
          id: 'explore-2',
          type: 'explore',
          count: 1,
          taskTemplate: '识别依赖关系和影响范围：{{userTask}}',
        },
      ],
    },
    {
      id: 'design',
      kind: 'design',
      name: '设计',
      description: '设计重构方案',
      requiresApproval: true,
      approvalTimeoutMs: 5 * 60 * 1000,
      agentGroups: [
        {
          id: 'plan-1',
          type: 'plan',
          count: 1,
          taskTemplate: `设计重构方案：{{userTask}}
请确保：
1. 保持向后兼容
2. 分步骤进行，每步可验证
3. 明确测试策略`,
        },
      ],
    },
    {
      id: 'implement',
      kind: 'implement',
      name: '实施',
      description: '执行重构',
      requiresApproval: false,
      agentGroups: [
        {
          id: 'coder-1',
          type: 'code-writer',
          count: 2,
          taskTemplate: '按照设计方案执行重构：{{userTask}}',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      name: '审查',
      description: '审查重构结果',
      requiresApproval: true,
      approvalTimeoutMs: 5 * 60 * 1000,
      agentGroups: [
        {
          id: 'review-1',
          type: 'reviewer',
          count: 1,
          taskTemplate: `审查重构结果：
1. 代码质量是否提升
2. 是否保持了原有功能
3. 是否有遗漏的边界情况`,
        },
      ],
    },
  ],
}

export const DOCUMENTATION_TEMPLATE: WorkflowTemplate = {
  id: 'builtin-documentation',
  name: 'Documentation',
  description: '文档工作流：探索→编写→审查',
  source: 'builtin',
  schemaVersion: SCHEMA_VERSION,
  createdAt: BUILTIN_DATE,
  updatedAt: BUILTIN_DATE,
  phases: [
    {
      id: 'explore',
      kind: 'explore',
      name: '探索',
      description: '理解需要文档化的代码',
      requiresApproval: false,
      agentGroups: [
        {
          id: 'explore-1',
          type: 'explore',
          count: 1,
          taskTemplate: '探索需要文档化的代码和功能：{{userTask}}',
        },
      ],
    },
    {
      id: 'write',
      kind: 'custom',
      name: '编写',
      description: '编写文档',
      requiresApproval: false,
      agentGroups: [
        {
          id: 'doc-1',
          type: 'documenter',
          count: 1,
          taskTemplate: `编写技术文档：{{userTask}}
请包括：
1. 功能概述
2. 使用示例
3. API 参考（如适用）`,
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      name: '审查',
      description: '审查文档质量',
      requiresApproval: true,
      approvalTimeoutMs: 5 * 60 * 1000,
      agentGroups: [
        {
          id: 'review-1',
          type: 'reviewer',
          count: 1,
          taskTemplate: `审查文档：
1. 内容是否准确完整
2. 表述是否清晰
3. 示例是否有效`,
        },
      ],
    },
  ],
}

export const BUILTIN_TEMPLATES: WorkflowTemplate[] = [
  PLAN_MODE_TEMPLATE,
  QUICK_FIX_TEMPLATE,
  REFACTOR_TEMPLATE,
  DOCUMENTATION_TEMPLATE,
]

export function getBuiltinTemplate(id: string): WorkflowTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id)
}

export function getDefaultTemplate(): WorkflowTemplate {
  return PLAN_MODE_TEMPLATE
}
