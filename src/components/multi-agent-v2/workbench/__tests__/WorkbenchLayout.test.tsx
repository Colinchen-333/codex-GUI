import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkbenchLayout } from '../WorkbenchLayout';
import * as useDecisionQueueHook from '@/hooks/useDecisionQueue';

// Mock dependencies
vi.mock('@/hooks/useDecisionQueue', () => ({
  useDecisionQueue: vi.fn(),
}));

vi.mock('../../ReviewInbox', () => ({
  ReviewInbox: ({ isOpen, onClose, onSelectAgent, onOpenPhaseApproval }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSelectAgent: (id: string) => void; 
    onOpenPhaseApproval: () => void; 
  }) => (
    <div data-testid="review-inbox" style={{ display: isOpen ? 'block' : 'none' }}>
      <button onClick={onClose}>Close Inbox</button>
      <button onClick={() => onSelectAgent('agent-1')}>Select Agent</button>
      <button onClick={onOpenPhaseApproval}>Open Phase Approval</button>
    </div>
  ),
}));

describe('WorkbenchLayout', () => {
  const mockOnSelectAgent = vi.fn();
  const mockOnOpenPhaseApproval = vi.fn();
  
  const defaultProps = {
    onSelectAgent: mockOnSelectAgent,
    onOpenPhaseApproval: mockOnOpenPhaseApproval,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDecisionQueueHook.useDecisionQueue).mockReturnValue({
      decisions: [],
      primaryDecision: null,
      hasDecisions: false,
      hasCriticalDecisions: false,
      counts: { total: 0, safetyApprovals: 0, phaseApprovals: 0, timeoutRecoveries: 0, errorRecoveries: 0 },
    });
  });

  it('renders children correctly', () => {
    render(
      <WorkbenchLayout {...defaultProps}>
        <div>Left Panel</div>
        <div>Right Panel</div>
        <div>Status Bar</div>
      </WorkbenchLayout>
    );

    expect(screen.getByText('Left Panel')).toBeInTheDocument();
    expect(screen.getByText('Right Panel')).toBeInTheDocument();
    expect(screen.getByText('Status Bar')).toBeInTheDocument();
  });

  it('renders the review inbox toggle button', () => {
    render(
      <WorkbenchLayout {...defaultProps}>
        <div>Left</div>
        <div>Right</div>
        <div>Status</div>
      </WorkbenchLayout>
    );

    expect(screen.getByText('审批队列')).toBeInTheDocument();
  });

  it('shows badge count when there are pending items', () => {
    vi.mocked(useDecisionQueueHook.useDecisionQueue).mockReturnValue({
      decisions: [],
      primaryDecision: null,
      hasDecisions: true,
      hasCriticalDecisions: true,
      counts: { total: 5, safetyApprovals: 3, phaseApprovals: 2, timeoutRecoveries: 0, errorRecoveries: 0 },
    });

    render(
      <WorkbenchLayout {...defaultProps}>
        <div>Left</div>
        <div>Right</div>
        <div>Status</div>
      </WorkbenchLayout>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('opens ReviewInbox when toggle button is clicked', () => {
    render(
      <WorkbenchLayout {...defaultProps}>
        <div>Left</div>
        <div>Right</div>
        <div>Status</div>
      </WorkbenchLayout>
    );

    const inbox = screen.getByTestId('review-inbox');
    expect(inbox).toHaveStyle({ display: 'none' });

    fireEvent.click(screen.getByText('审批队列'));
    expect(inbox).toHaveStyle({ display: 'block' });
  });

  it('closes ReviewInbox when close button is clicked', () => {
    render(
      <WorkbenchLayout {...defaultProps}>
        <div>Left</div>
        <div>Right</div>
        <div>Status</div>
      </WorkbenchLayout>
    );

    fireEvent.click(screen.getByText('审批队列')); // Open it
    fireEvent.click(screen.getByText('Close Inbox')); // Close it

    const inbox = screen.getByTestId('review-inbox');
    expect(inbox).toHaveStyle({ display: 'none' });
  });

  it('calls onSelectAgent and closes inbox when agent is selected', () => {
    render(
      <WorkbenchLayout {...defaultProps}>
        <div>Left</div>
        <div>Right</div>
        <div>Status</div>
      </WorkbenchLayout>
    );

    fireEvent.click(screen.getByText('审批队列')); // Open it
    fireEvent.click(screen.getByText('Select Agent'));

    expect(mockOnSelectAgent).toHaveBeenCalledWith('agent-1');
    const inbox = screen.getByTestId('review-inbox');
    expect(inbox).toHaveStyle({ display: 'none' });
  });

  it('calls onOpenPhaseApproval and closes inbox when phase approval is opened', () => {
    render(
      <WorkbenchLayout {...defaultProps}>
        <div>Left</div>
        <div>Right</div>
        <div>Status</div>
      </WorkbenchLayout>
    );

    fireEvent.click(screen.getByText('审批队列')); // Open it
    fireEvent.click(screen.getByText('Open Phase Approval'));

    expect(mockOnOpenPhaseApproval).toHaveBeenCalled();
    const inbox = screen.getByTestId('review-inbox');
    expect(inbox).toHaveStyle({ display: 'none' });
  });
});
