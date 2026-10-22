import { beforeEach, describe, expect, it, vi } from 'vitest';

const { state, revalidatePathMock } = vi.hoisted(() => ({
  state: {
    role: 'admin' as string | null,
    updates: [] as { table: string; payload: Record<string, unknown>; calls: [string, unknown[]][] }[],
    // Rows the update's `.select(...)` returns, per table.
    returned: {} as Record<string, unknown[] | null>,
    updateError: null as unknown,
    // Row a plain `select(...).eq(...).maybeSingle()` lookup returns, per table.
    lookup: {} as Record<string, unknown>,
    lookups: [] as { table: string; calls: [string, unknown[]][] }[],
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: vi.fn(),
}));

function sessionClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: state.role === null ? null : { id: 'user-1' } } }),
    },
    from() {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({ data: { role: state.role }, error: null });
      return chain;
    },
  };
}

function adminClient() {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      chain.update = (payload: Record<string, unknown>) => {
        const entry = { table, payload, calls: [] as [string, unknown[]][] };
        state.updates.push(entry);
        const inner: Record<string, unknown> = {};
        for (const m of ['eq', 'select']) {
          inner[m] = (...args: unknown[]) => {
            entry.calls.push([m, args]);
            return inner;
          };
        }
        inner.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve({ data: state.returned[table] ?? [], error: state.updateError }).then(
            resolve,
            reject,
          );
        return inner;
      };
      chain.select = (...selectArgs: unknown[]) => {
        const entry = { table, calls: [['select', selectArgs]] as [string, unknown[]][] };
        state.lookups.push(entry);
        const inner: Record<string, unknown> = {};
        inner.eq = (...args: unknown[]) => {
          entry.calls.push(['eq', args]);
          return inner;
        };
        inner.maybeSingle = async () => ({ data: state.lookup[table] ?? null, error: null });
        return inner;
      };
      return chain;
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => sessionClient(),
  createAdminClient: () => adminClient(),
}));

import { setFeedbackStatus, setPreviewFeedbackEnabled } from '@/lib/previews/admin-actions';

const FEEDBACK_ID = '3f2b8c1e-9d4a-4b6e-8f1a-2c3d4e5f6a7b';
const PREVIEW_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

beforeEach(() => {
  state.role = 'admin';
  state.updates.length = 0;
  state.returned = {};
  state.updateError = null;
  state.lookup = {};
  state.lookups.length = 0;
  revalidatePathMock.mockClear();
});

describe('setFeedbackStatus', () => {
  it('a non-admin throws Not authorized', async () => {
    state.role = 'student';
    await expect(setFeedbackStatus(FEEDBACK_ID, 'done')).rejects.toThrow('Not authorized');
    expect(state.updates).toHaveLength(0);
  });

  it('an anonymous caller throws', async () => {
    state.role = null;
    await expect(setFeedbackStatus(FEEDBACK_ID, 'done')).rejects.toThrow();
    expect(state.updates).toHaveLength(0);
  });

  it('a bad status throws before writing', async () => {
    await expect(setFeedbackStatus(FEEDBACK_ID, 'archived' as never)).rejects.toThrow();
    expect(state.updates).toHaveLength(0);
  });

  it('a bad id throws before writing', async () => {
    await expect(setFeedbackStatus('not-a-uuid', 'done')).rejects.toThrow();
    expect(state.updates).toHaveLength(0);
  });

  it('a valid call updates the right row and revalidates', async () => {
    state.returned.preview_feedback = [{ id: FEEDBACK_ID, preview_id: PREVIEW_ID }];

    await setFeedbackStatus(FEEDBACK_ID, 'planned');

    expect(state.updates).toHaveLength(1);
    const [u] = state.updates;
    expect(u.table).toBe('preview_feedback');
    expect(u.payload.status).toBe('planned');
    expect(typeof u.payload.updated_at).toBe('string');
    expect(Number.isNaN(Date.parse(u.payload.updated_at as string))).toBe(false);
    expect(u.calls).toContainEqual(['eq', ['id', FEEDBACK_ID]]);
    expect(u.calls.some(([m]) => m === 'select')).toBe(true);
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/studio/previews');
    expect(revalidatePathMock).toHaveBeenCalledWith(`/admin/studio/previews/${PREVIEW_ID}`);
  });

  it('an update that matches zero rows throws Feedback not found', async () => {
    state.returned.preview_feedback = [];
    await expect(setFeedbackStatus(FEEDBACK_ID, 'done')).rejects.toThrow('Feedback not found');
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('a database error throws', async () => {
    state.updateError = { message: 'boom' };
    await expect(setFeedbackStatus(FEEDBACK_ID, 'done')).rejects.toThrow();
  });
});

describe('setPreviewFeedbackEnabled', () => {
  it('a non-admin throws Not authorized', async () => {
    state.role = 'instructor';
    await expect(setPreviewFeedbackEnabled(PREVIEW_ID, true)).rejects.toThrow('Not authorized');
    expect(state.updates).toHaveLength(0);
  });

  it('a non-boolean throws before writing', async () => {
    await expect(setPreviewFeedbackEnabled(PREVIEW_ID, 'yes' as never)).rejects.toThrow();
    expect(state.updates).toHaveLength(0);
  });

  it('a valid call updates the right row and revalidates', async () => {
    state.returned.client_previews = [{ id: PREVIEW_ID }];

    await setPreviewFeedbackEnabled(PREVIEW_ID, true);

    expect(state.updates).toHaveLength(1);
    const [u] = state.updates;
    expect(u.table).toBe('client_previews');
    expect(u.payload).toEqual({ feedback_enabled: true });
    expect(u.calls).toContainEqual(['eq', ['id', PREVIEW_ID]]);
    expect(u.calls).toContainEqual(['select', ['id']]);
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/studio/previews');
    expect(revalidatePathMock).toHaveBeenCalledWith(`/admin/studio/previews/${PREVIEW_ID}`);
  });

  it('an update that matches zero rows throws Preview not found', async () => {
    state.returned.client_previews = [];
    await expect(setPreviewFeedbackEnabled(PREVIEW_ID, false)).rejects.toThrow('Preview not found');
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('enabling only matches a gated preview; disabling has no mode filter', async () => {
    state.returned.client_previews = [{ id: PREVIEW_ID }];
    await setPreviewFeedbackEnabled(PREVIEW_ID, true);
    await setPreviewFeedbackEnabled(PREVIEW_ID, false);
    expect(state.updates[0].calls).toContainEqual(['eq', ['mode', 'gated']]);
    expect(state.updates[1].calls.some(([m, a]) => m === 'eq' && a[0] === 'mode')).toBe(false);
    expect(state.updates[1].payload).toEqual({ feedback_enabled: false });
  });

  it('enabling a public preview throws and does not revalidate', async () => {
    state.returned.client_previews = [];
    state.lookup.client_previews = { id: PREVIEW_ID };
    await expect(setPreviewFeedbackEnabled(PREVIEW_ID, true)).rejects.toThrow(
      'Feedback needs a password-protected preview',
    );
    expect(state.lookups[0].calls).toContainEqual(['eq', ['id', PREVIEW_ID]]);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('enabling a nonexistent preview still throws Preview not found', async () => {
    state.returned.client_previews = [];
    await expect(setPreviewFeedbackEnabled(PREVIEW_ID, true)).rejects.toThrow('Preview not found');
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
