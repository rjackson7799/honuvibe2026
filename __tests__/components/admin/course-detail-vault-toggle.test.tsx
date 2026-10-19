import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CourseWithCurriculum } from '@/lib/courses/types';

const { updateCourseMock } = vi.hoisted(() => ({ updateCourseMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin/courses/c1',
}));
vi.mock('@/lib/courses/actions', () => ({
  publishCourse: vi.fn(),
  unpublishCourse: vi.fn(),
  archiveCourse: vi.fn(),
  deleteCourse: vi.fn(),
  updateCourse: updateCourseMock,
  createBonusSession: vi.fn(),
}));
// Heavy children that fetch or need their own providers; the toggle is all we test.
vi.mock('@/components/admin/SessionEditor', () => ({ SessionEditor: () => null }));
vi.mock('@/components/admin/BonusSessionEditor', () => ({ BonusSessionEditor: () => null }));
vi.mock('@/components/admin/ManualEnrollForm', () => ({ ManualEnrollForm: () => null }));
vi.mock('@/components/admin/ai-image-uploader', () => ({ AiImageUploader: () => null }));
vi.mock('@/components/admin/InstructorAssignControl', () => ({ InstructorAssignControl: () => null }));
vi.mock('@/components/admin/ESLAdminDashboard', () => ({ ESLAdminDashboard: () => null }));
vi.mock('@/components/admin/CourseRevenueSplitEditor', () => ({ CourseRevenueSplitEditor: () => null }));

import { AdminCourseDetail } from '@/components/admin/AdminCourseDetail';

const HINT = 'Only self-study courses can be included in the Vault';

function course(over: Partial<CourseWithCurriculum>): CourseWithCurriculum {
  return {
    id: 'c1',
    slug: 'c1',
    title_en: 'Course',
    title_jp: null,
    description_en: '',
    description_jp: null,
    course_type: 'cohort',
    is_published: false,
    is_private: false,
    status: 'draft',
    vault_included: false,
    esl_enabled: false,
    esl_included: false,
    free_preview_count: 0,
    current_enrollment: 0,
    tools_covered: [],
    weeks: [],
    bonusSessions: [],
    instructors: [],
    ...over,
  } as unknown as CourseWithCurriculum;
}

const toggle = () =>
  screen.getByRole('button', { name: 'Toggle whether this course is included in the Vault' });

beforeEach(() => {
  updateCourseMock.mockReset();
});

describe('AdminCourseDetail — Included in the Vault toggle (B3 D3.4)', () => {
  it('vault toggle is disabled for a cohort course', () => {
    render(<AdminCourseDetail course={course({ course_type: 'cohort' })} />);
    expect(toggle()).toBeDisabled();
    expect(screen.getByText(HINT)).toBeInTheDocument();
  });

  it('is disabled for a 1v1 course', () => {
    render(<AdminCourseDetail course={course({ course_type: '1v1' })} />);
    expect(toggle()).toBeDisabled();
  });

  it('is enabled for a self-study course, without the hint', () => {
    render(<AdminCourseDetail course={course({ course_type: 'self-study' })} />);
    expect(toggle()).toBeEnabled();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it('shows the error when the save is refused', async () => {
    updateCourseMock.mockRejectedValueOnce(new Error('violates check constraint'));
    render(<AdminCourseDetail course={course({ course_type: 'self-study' })} />);
    fireEvent.click(toggle());
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('violates check constraint'),
    );
  });
});
