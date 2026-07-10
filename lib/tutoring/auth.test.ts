import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getUserMock, userFromMock, adminFromMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  userFromMock: vi.fn(),
  adminFromMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: userFromMock,
  }),
  createAdminClient: () => ({
    from: adminFromMock,
  }),
}));

import {
  getTutoringAccess,
  getTutoringAccessForReport,
  requireTutoringAccess,
  requireTutoringAccessForReport,
} from '@/lib/tutoring/auth';

/** User-scoped client: only ever touches `users` in this module. */
function mockUserRole(role: string | null) {
  userFromMock.mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: role ? { role } : null }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected user-client table: ${table}`);
  });
}

interface AdminTableConfig {
  instructorProfile?: { id: string } | null;
  courseInstructorsLink?: { id: string } | null;
  report?: { course_id: string } | null;
}

/** Service-role client: table-keyed, chainable .eq() ending in .maybeSingle(). */
function mockAdminTables(config: AdminTableConfig) {
  adminFromMock.mockImplementation((table: string) => {
    if (table === 'instructor_profiles') {
      const chain = {
        eq: () => chain,
        maybeSingle: async () => ({ data: config.instructorProfile ?? null }),
      };
      return { select: () => chain };
    }
    if (table === 'course_instructors') {
      const chain = {
        eq: () => chain,
        maybeSingle: async () => ({ data: config.courseInstructorsLink ?? null }),
      };
      return { select: () => chain };
    }
    if (table === 'session_reports') {
      const chain = {
        eq: () => chain,
        maybeSingle: async () => ({ data: config.report ?? null }),
      };
      return { select: () => chain };
    }
    throw new Error(`Unexpected admin-client table: ${table}`);
  });
}

const COURSE_ID = 'course-1';

describe('getTutoringAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await getTutoringAccess(COURSE_ID);
    expect(result).toEqual({ ok: false, status: 401, error: 'Not authenticated' });
  });

  it('returns 403 for a student role', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUserRole('student');
    const result = await getTutoringAccess(COURSE_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('returns ok for an admin with no instructor_profiles lookup', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockUserRole('admin');
    const result = await getTutoringAccess(COURSE_ID);
    expect(result).toEqual({
      ok: true,
      access: {
        role: 'admin',
        userId: 'admin-1',
        instructorProfileId: null,
        courseId: COURSE_ID,
      },
    });
    // Admin path must stay cheap and profile-independent: never touches the
    // service-role client at all.
    expect(adminFromMock).not.toHaveBeenCalled();
  });

  it('returns ok for an assigned instructor with correct instructorProfileId', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'teacher-1' } } });
    mockUserRole('instructor');
    mockAdminTables({
      instructorProfile: { id: 'profile-1' },
      courseInstructorsLink: { id: 'link-1' },
    });
    const result = await getTutoringAccess(COURSE_ID);
    expect(result).toEqual({
      ok: true,
      access: {
        role: 'instructor',
        userId: 'teacher-1',
        instructorProfileId: 'profile-1',
        courseId: COURSE_ID,
      },
    });
  });

  it('returns 403 for an instructor with a profile but no course_instructors row', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'teacher-1' } } });
    mockUserRole('instructor');
    mockAdminTables({
      instructorProfile: { id: 'profile-1' },
      courseInstructorsLink: null,
    });
    const result = await getTutoringAccess(COURSE_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('returns 403 for an instructor with no instructor_profiles row', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'teacher-1' } } });
    mockUserRole('instructor');
    mockAdminTables({ instructorProfile: null });
    const result = await getTutoringAccess(COURSE_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });
});

describe('getTutoringAccessForReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for an unknown reportId', async () => {
    mockAdminTables({ report: null });
    const result = await getTutoringAccessForReport('missing-report');
    expect(result).toEqual({ ok: false, status: 404, error: 'Report not found' });
  });

  it('delegates to getTutoringAccess with the report course_id', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'teacher-1' } } });
    mockUserRole('instructor');
    mockAdminTables({
      report: { course_id: 'course-99' },
      instructorProfile: { id: 'profile-1' },
      courseInstructorsLink: { id: 'link-1' },
    });
    const result = await getTutoringAccessForReport('report-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.access.courseId).toBe('course-99');
      expect(result.access.instructorProfileId).toBe('profile-1');
    }
  });
});

describe('requireTutoringAccess / requireTutoringAccessForReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requireTutoringAccess throws on failure', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    await expect(requireTutoringAccess(COURSE_ID)).rejects.toThrow('Not authenticated');
  });

  it('requireTutoringAccess returns access on success', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockUserRole('admin');
    const access = await requireTutoringAccess(COURSE_ID);
    expect(access).toEqual({
      role: 'admin',
      userId: 'admin-1',
      instructorProfileId: null,
      courseId: COURSE_ID,
    });
  });

  it('requireTutoringAccessForReport throws when the report is missing', async () => {
    mockAdminTables({ report: null });
    await expect(requireTutoringAccessForReport('missing-report')).rejects.toThrow(
      'Report not found',
    );
  });

  it('requireTutoringAccessForReport returns access on success', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockUserRole('admin');
    mockAdminTables({ report: { course_id: 'course-7' } });
    const access = await requireTutoringAccessForReport('report-1');
    expect(access.role).toBe('admin');
    expect(access.courseId).toBe('course-7');
  });
});
