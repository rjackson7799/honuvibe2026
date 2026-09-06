import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EngagementDeliverablesPanel } from './EngagementDeliverablesPanel';
import type { EngagementDeliverable } from '@/lib/admin/types';

// The seed is REVIEW-FIRST: candidates arrive as an editable checklist and
// nothing is written until Ryan confirms. That is the property worth pinning —
// a seeder that wrote straight through would be much harder to walk back.

const { previewDeliverablesFromScope, addDeliverables, updateDeliverable, deleteDeliverable, refresh } = vi.hoisted(
  () => ({
    previewDeliverablesFromScope: vi.fn(),
    addDeliverables: vi.fn(async () => ({ added: 0 })),
    updateDeliverable: vi.fn(async () => {}),
    deleteDeliverable: vi.fn(async () => {}),
    refresh: vi.fn(),
  }),
);
vi.mock('@/lib/studio/engagement/deliverable-actions', () => ({
  previewDeliverablesFromScope,
  addDeliverables,
  updateDeliverable,
  deleteDeliverable,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const EID = 'e1';

function row(overrides: Partial<EngagementDeliverable> = {}): EngagementDeliverable {
  return {
    id: 'd1',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    engagement_id: EID,
    proposal_id: 'p1',
    title: 'Homepage redesign',
    phase: 'build',
    status: 'planned',
    due_on: null,
    delivered_at: null,
    notes_md: null,
    sort_order: 0,
    ...overrides,
  };
}

beforeEach(() => {
  previewDeliverablesFromScope.mockReset();
  addDeliverables.mockReset();
  addDeliverables.mockResolvedValue({ added: 0 });
  updateDeliverable.mockReset();
  deleteDeliverable.mockReset();
  refresh.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EngagementDeliverablesPanel — seeding', () => {
  it('offers the seed only while empty and with an accepted proposal', () => {
    const { unmount } = render(
      <EngagementDeliverablesPanel engagementId={EID} deliverables={[]} hasAcceptedProposal />,
    );
    expect(screen.getByRole('button', { name: /Seed from proposal scope/ })).toBeTruthy();
    unmount();

    // Already curated — seeding again would duplicate the same bullets.
    const withRows = render(
      <EngagementDeliverablesPanel engagementId={EID} deliverables={[row()]} hasAcceptedProposal />,
    );
    expect(screen.queryByRole('button', { name: /Seed from proposal scope/ })).toBeNull();
    withRows.unmount();

    // Nothing to read a scope from.
    render(<EngagementDeliverablesPanel engagementId={EID} deliverables={[]} hasAcceptedProposal={false} />);
    expect(screen.queryByRole('button', { name: /Seed from proposal scope/ })).toBeNull();
  });

  it('shows the candidates as an editable checklist and writes NOTHING until confirmed', async () => {
    previewDeliverablesFromScope.mockResolvedValue({
      proposalId: 'p1',
      version: 2,
      candidates: [{ title: 'Homepage redesign' }, { title: 'Booking flow' }, { title: 'Analytics setup' }],
    });
    render(<EngagementDeliverablesPanel engagementId={EID} deliverables={[]} hasAcceptedProposal />);
    fireEvent.click(screen.getByRole('button', { name: /Seed from proposal scope/ }));

    await waitFor(() => expect(screen.getByText(/Nothing is saved until you do/)).toBeTruthy());
    expect(addDeliverables).not.toHaveBeenCalled();
    expect((screen.getByDisplayValue('Homepage redesign') as HTMLInputElement).value).toBe('Homepage redesign');
    expect(screen.getByRole('button', { name: 'Add 3 deliverables' })).toBeTruthy();
  });

  it('unchecking drops a row, editing rewrites it, and only the confirmed rows are sent', async () => {
    previewDeliverablesFromScope.mockResolvedValue({
      proposalId: 'p1',
      version: 2,
      candidates: [{ title: 'Homepage redesign' }, { title: 'Booking flow' }, { title: 'Analytics setup' }],
    });
    addDeliverables.mockResolvedValue({ added: 2 });
    render(<EngagementDeliverablesPanel engagementId={EID} deliverables={[]} hasAcceptedProposal />);
    fireEvent.click(screen.getByRole('button', { name: /Seed from proposal scope/ }));
    await waitFor(() => screen.getByText(/Nothing is saved until you do/));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Include Booking flow' }));
    fireEvent.change(screen.getByDisplayValue('Analytics setup'), { target: { value: 'Analytics + dashboards' } });

    expect(screen.getByRole('button', { name: 'Add 2 deliverables' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 deliverables' }));

    await waitFor(() => expect(addDeliverables).toHaveBeenCalledTimes(1));
    expect(addDeliverables).toHaveBeenCalledWith(
      EID,
      [
        { title: 'Homepage redesign', phase: 'build' },
        { title: 'Analytics + dashboards', phase: 'build' },
      ],
      'p1',
    );
  });

  it('a scope with no bullets explains itself instead of seeding nothing', async () => {
    previewDeliverablesFromScope.mockResolvedValue({ proposalId: 'p1', version: 1, candidates: [] });
    render(<EngagementDeliverablesPanel engagementId={EID} deliverables={[]} hasAcceptedProposal />);
    fireEvent.click(screen.getByRole('button', { name: /Seed from proposal scope/ }));

    await waitFor(() => expect(screen.getByText(/no bullet list to read/)).toBeTruthy());
    expect(addDeliverables).not.toHaveBeenCalled();
  });

  it('cancel abandons the review without writing', async () => {
    previewDeliverablesFromScope.mockResolvedValue({
      proposalId: 'p1',
      version: 1,
      candidates: [{ title: 'Homepage redesign' }],
    });
    render(<EngagementDeliverablesPanel engagementId={EID} deliverables={[]} hasAcceptedProposal />);
    fireEvent.click(screen.getByRole('button', { name: /Seed from proposal scope/ }));
    await waitFor(() => screen.getByText(/Nothing is saved until you do/));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText(/Nothing is saved until you do/)).toBeNull());
    expect(addDeliverables).not.toHaveBeenCalled();
  });
});

describe('EngagementDeliverablesPanel — rows', () => {
  it('groups by phase and shows a delivered date', () => {
    render(
      <EngagementDeliverablesPanel
        engagementId={EID}
        hasAcceptedProposal
        deliverables={[
          row(),
          row({ id: 'd2', title: 'Booking flow', status: 'delivered', delivered_at: '2026-09-05T20:00:00Z' }),
          row({ id: 'd3', title: 'Launch checks', phase: 'launch' }),
        ]}
      />,
    );
    expect(screen.getByText('Build')).toBeTruthy();
    expect(screen.getByText('Launch')).toBeTruthy();
    expect(screen.getByText(/Delivered Sep 5/)).toBeTruthy();
  });

  it('the status select moves in both directions', async () => {
    render(<EngagementDeliverablesPanel engagementId={EID} deliverables={[row()]} hasAcceptedProposal />);
    fireEvent.change(screen.getByLabelText('Status of Homepage redesign'), { target: { value: 'delivered' } });
    await waitFor(() => expect(updateDeliverable).toHaveBeenCalledWith('d1', { status: 'delivered' }));

    updateDeliverable.mockClear();
    const back = render(
      <EngagementDeliverablesPanel
        engagementId={EID}
        hasAcceptedProposal
        deliverables={[row({ id: 'd9', title: 'Back', status: 'delivered', delivered_at: '2026-09-05T20:00:00Z' })]}
      />,
    );
    fireEvent.change(screen.getByLabelText('Status of Back'), { target: { value: 'planned' } });
    await waitFor(() => expect(updateDeliverable).toHaveBeenCalledWith('d9', { status: 'planned' }));
    back.unmount();
  });

  it('delete asks first, and cancelling does not call the action', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<EngagementDeliverablesPanel engagementId={EID} deliverables={[row()]} hasAcceptedProposal />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Homepage redesign' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteDeliverable).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Homepage redesign' }));
    await waitFor(() => expect(deleteDeliverable).toHaveBeenCalledWith('d1'));
  });

  it('an empty panel says so, and adapts its hint to whether seeding is possible', () => {
    const { unmount } = render(
      <EngagementDeliverablesPanel engagementId={EID} deliverables={[]} hasAcceptedProposal />,
    );
    expect(screen.getByText(/Seed from the accepted proposal/)).toBeTruthy();
    unmount();

    render(<EngagementDeliverablesPanel engagementId={EID} deliverables={[]} hasAcceptedProposal={false} />);
    expect(screen.getByText(/so the launch gate can warn you/)).toBeTruthy();
  });
});
