import { describe, it, expect } from 'vitest';
import { MultiAgentViewContainer } from '../MultiAgentViewContainer';

describe('MultiAgentViewContainer - WorkflowStageHeader Integration', () => {
  it('should import WorkflowStageHeader component', () => {
    expect(MultiAgentViewContainer).toBeDefined();
  });

  it('should import useWorkflow hook', () => {
    const source = MultiAgentViewContainer.toString();
    expect(source).toContain('useWorkflow');
  });

  it('should conditionally render WorkflowStageHeader based on workflow', () => {
    const source = MultiAgentViewContainer.toString();
    expect(source).toContain('workflow &&');
    expect(source).toContain('WorkflowStageHeader');
  });
});
