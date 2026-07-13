import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  getUserMock,
  userRoleMock,
  leadMaybeSingleMock,
  insertMock,
  insertSingleMock,
  runAuditMock,
  flipStaleAuditsMock,
  getLeadAuditsMock,
  getLatestLeadAuditMock,
  afterCbs,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  userRoleMock: vi.fn(),
  leadMaybeSingleMock: vi.fn(),
  insertMock: vi.fn(),
  insertSingleMock: vi.fn(),
  runAuditMock: vi.fn(),
  flipStaleAuditsMock: vi.fn(),
  getLeadAuditsMock: vi.fn(),
  getLatestLeadAuditMock: vi.fn(),
  afterCbs: [] as Array<() => unknown>,
}));

// Keep NextResponse/NextRequest real; replace after() with a recorder so the 202
// path is asserted without running the real background job.
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: (cb: () => unknown) => afterCbs.push(cb) };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ single: userRoleMock }) }) };
      }
      throw new Error(`Unexpected user-client table: ${table}`);
    },
  }),
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'leads') {
        return { select: () => ({ eq: () => ({ maybeSingle: leadMaybeSingleMock }) }) };
      }
      if (table === 'lead_audits') {
        return { insert: insertMock };
      }
      throw new Error(`Unexpected admin table: ${table}`);
    },
  }),
}));

vi.mock('@/lib/studio/audit/run', () => ({
  runAudit: runAuditMock,
  flipStaleAudits: flipStaleAuditsMock,
}));

vi.mock('@/lib/admin/queries', () => ({
  getLeadAudits: getLeadAuditsMock,
  getLatestLeadAudit: getLatestLeadAuditMock,
}));

import { GET, POST } from '@/app/api/admin/studio-leads/[id]/audit/route';

const UUID = '11111111-1111-1111-1111-111111111111';

function postReq(id: string) {
  return {
    req: new NextRequest(`http://localhost/api/admin/studio-leads/${id}/audit`, { method: 'POST' }),
    ctx: { params: Promise.resolve({ id }) },
  };
}
function getReq(id: string, poll = false) {
  const url = `http://localhost/api/admin/studio-leads/${id}/audit${poll ? '?poll=1' : ''}`;
  return { req: new NextRequest(url), ctx: { params: Promise.resolve({ id }) } };
}

beforeEach(() => {
  vi.clearAllMocks();
  afterCbs.length = 0;
  // Authenticated admin by default.
  getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
  userRoleMock.mockResolvedValue({ data: { role: 'admin' } });
  flipStaleAuditsMock.mockResolvedValue(undefined);
  // insert().select('id').single() chain.
  insertMock.mockReturnValue({ select: () => ({ single: insertSingleMock }) });
  insertSingleMock.mockResolvedValue({ data: { id: 'audit-1' }, error: null });
  leadMaybeSingleMock.mockResolvedValue({
    data: { id: UUID, business_name: 'Acme', industry: 'cafe', existing_url: 'example.com' },
  });
});

describe('POST /audit', () => {
  it('401s a signed-out request', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { req, ctx } = postReq(UUID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it('403s a non-admin', async () => {
    userRoleMock.mockResolvedValue({ data: { role: 'student' } });
    const { req, ctx } = postReq(UUID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it('400s a bad UUID', async () => {
    const { req, ctx } = postReq('not-a-uuid');
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it('404s a missing lead', async () => {
    leadMaybeSingleMock.mockResolvedValue({ data: null });
    const { req, ctx } = postReq(UUID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it('400s a lead with no website', async () => {
    leadMaybeSingleMock.mockResolvedValue({
      data: { id: UUID, business_name: 'Acme', industry: null, existing_url: null },
    });
    const { req, ctx } = postReq(UUID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it('normalizes a scheme-less URL before persisting, returns 202, schedules runAudit', async () => {
    const { req, ctx } = postReq(UUID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ auditId: 'audit-1' });

    // zombies cleared before the guarded insert
    expect(flipStaleAuditsMock).toHaveBeenCalledWith(expect.anything(), UUID);
    // scheme-less existing_url normalized to https://…/
    expect(insertMock).toHaveBeenCalledWith({
      lead_id: UUID,
      audited_url: 'https://example.com/',
      status: 'generating',
    });
    // background job scheduled but not yet run
    expect(runAuditMock).not.toHaveBeenCalled();
    expect(afterCbs).toHaveLength(1);
    afterCbs[0]();
    expect(runAuditMock).toHaveBeenCalledWith(expect.anything(), 'audit-1', {
      leadId: UUID,
      company: 'Acme',
      industry: 'cafe',
      url: 'https://example.com/',
    });
  });

  it('409s a concurrent run (unique-index 23505)', async () => {
    insertSingleMock.mockResolvedValue({ data: null, error: { code: '23505' } });
    const { req, ctx } = postReq(UUID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
    expect(afterCbs).toHaveLength(0);
  });

  it('500s an unexpected insert error', async () => {
    insertSingleMock.mockResolvedValue({ data: null, error: { code: '23xxx', message: 'boom' } });
    const { req, ctx } = postReq(UUID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
  });
});

describe('GET /audit', () => {
  it('401s a signed-out request', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { req, ctx } = getReq(UUID);
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  it('404s an unknown lead', async () => {
    leadMaybeSingleMock.mockResolvedValue({ data: null });
    const { req, ctx } = getReq(UUID);
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it('flips stale audits before reading, then returns { latest, history } (full)', async () => {
    getLeadAuditsMock.mockResolvedValue([
      { id: 'a2', created_at: '2026-07-13T00:00:00Z', status: 'completed', scores: { overall: 72 } },
      { id: 'a1', created_at: '2026-07-12T00:00:00Z', status: 'failed', scores: null },
    ]);
    const { req, ctx } = getReq(UUID);
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    expect(flipStaleAuditsMock).toHaveBeenCalledWith(expect.anything(), UUID);
    const body = (await res.json()) as { latest: { id: string }; history: unknown[] };
    expect(body.latest.id).toBe('a2');
    expect(body.history).toEqual([
      { id: 'a2', created_at: '2026-07-13T00:00:00Z', status: 'completed', overall: 72 },
      { id: 'a1', created_at: '2026-07-12T00:00:00Z', status: 'failed', overall: null },
    ]);
    expect(getLatestLeadAuditMock).not.toHaveBeenCalled();
  });

  it('?poll=1 returns { latest } only', async () => {
    getLatestLeadAuditMock.mockResolvedValue({ id: 'a2', status: 'generating' });
    const { req, ctx } = getReq(UUID, true);
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { latest: { id: string }; history?: unknown };
    expect(body.latest.id).toBe('a2');
    expect(body.history).toBeUndefined();
    expect(getLeadAuditsMock).not.toHaveBeenCalled();
  });

  it('surfaces a zombie flip: a >7-min generating row reads back as failed', async () => {
    // flipStaleAudits (real one, DB-level) demotes it; here the post-flip read returns failed.
    getLatestLeadAuditMock.mockResolvedValue({ id: 'a1', status: 'failed', generation_error: 'timeout' });
    const { req, ctx } = getReq(UUID, true);
    const res = await GET(req, ctx);
    expect(flipStaleAuditsMock).toHaveBeenCalled();
    const body = (await res.json()) as { latest: { status: string } };
    expect(body.latest.status).toBe('failed');
  });

  it('500s (never []) on a query error', async () => {
    getLeadAuditsMock.mockRejectedValue(new Error('rls denied'));
    const { req, ctx } = getReq(UUID);
    const res = await GET(req, ctx);
    expect(res.status).toBe(500);
  });
});
