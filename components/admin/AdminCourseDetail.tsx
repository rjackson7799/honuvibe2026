'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabNavigation } from '@/components/learn/TabNavigation';
import { StatusBadge } from './StatusBadge';
import { SessionEditor } from './SessionEditor';
import { ManualEnrollForm } from './ManualEnrollForm';
import { publishCourse, unpublishCourse, archiveCourse, updateCourse } from '@/lib/courses/actions';
import { CourseImageUploader } from './course-image-uploader';
import type { CourseWithCurriculum } from '@/lib/courses/types';

type AdminCourseDetailProps = {
  course: CourseWithCurriculum;
};

export function AdminCourseDetail({ course }: AdminCourseDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'curriculum', label: 'Curriculum' },
    { key: 'students', label: 'Students' },
  ];

  async function handlePublish() {
    setActionLoading(true);
    try {
      if (course.is_published) {
        await unpublishCourse(course.id);
      } else {
        await publishCourse(course.id);
      }
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleArchive() {
    setActionLoading(true);
    try {
      await archiveCourse(course.id);
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/admin/courses')}
        className="flex items-center gap-1 text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Courses
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-serif text-fg-primary">{course.title_en}</h1>
            <StatusBadge status={course.status} />
          </div>
          {course.title_jp && (
            <p className="text-sm text-fg-tertiary">{course.title_jp}</p>
          )}
          <p className="text-xs text-fg-tertiary mt-1">
            {course.course_id_code} · {course.current_enrollment}/{course.max_enrollment ?? '∞'} enrolled
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant={course.is_published ? 'ghost' : 'primary'}
            size="sm"
            onClick={handlePublish}
            disabled={actionLoading}
          >
            {course.is_published ? 'Unpublish' : 'Publish'}
          </Button>
          {course.status !== 'archived' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              disabled={actionLoading}
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Course Images */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-fg-primary">Course Images</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-fg-tertiary mb-2">
                  Thumbnail (16:9, max 2MB)
                </label>
                <CourseImageUploader
                  courseId={course.id}
                  imageType="thumbnail"
                  currentUrl={course.thumbnail_url}
                  onUploadComplete={() => router.refresh()}
                  onRemove={async () => {
                    await updateCourse(course.id, { thumbnail_url: null });
                    router.refresh();
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-fg-tertiary mb-2">
                  Hero Image (21:9, max 5MB)
                </label>
                <CourseImageUploader
                  courseId={course.id}
                  imageType="hero"
                  currentUrl={course.hero_image_url}
                  onUploadComplete={() => router.refresh()}
                  onRemove={async () => {
                    await updateCourse(course.id, { hero_image_url: null });
                    router.refresh();
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoField label="Level" value={course.level ?? '—'} />
            <InfoField label="Language" value={course.language} />
            <InfoField label="Format" value={course.format ?? '—'} />
            <InfoField label="Total Weeks" value={course.total_weeks?.toString() ?? '—'} />
            <InfoField label="Live Sessions" value={course.live_sessions_count?.toString() ?? '—'} />
            <InfoField label="Recorded Lessons" value={course.recorded_lessons_count?.toString() ?? '—'} />
            <InfoField label="Price (USD)" value={course.price_usd ? `$${(course.price_usd / 100).toFixed(2)}` : '—'} />
            <InfoField label="Price (JPY)" value={course.price_jpy ? `¥${course.price_jpy.toLocaleString()}` : '—'} />
            <InfoField
              label="Start Date"
              value={course.start_date
                ? new Date(course.start_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—'}
            />
            <InfoField label="Instructor" value={course.instructor_name ?? '—'} />
            <InfoField label="Community" value={course.community_platform ?? '—'} />
            <InfoField label="Max Enrollment" value={course.max_enrollment?.toString() ?? 'Unlimited'} />
          </div>

          {course.description_en && (
            <div>
              <h3 className="text-sm font-medium text-fg-primary mb-2">Description (EN)</h3>
              <p className="text-sm text-fg-secondary">{course.description_en}</p>
            </div>
          )}
          {course.description_jp && (
            <div>
              <h3 className="text-sm font-medium text-fg-primary mb-2">Description (JP)</h3>
              <p className="text-sm text-fg-secondary">{course.description_jp}</p>
            </div>
          )}

          {course.tools_covered && course.tools_covered.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-fg-primary mb-2">Tools Covered</h3>
              <div className="flex flex-wrap gap-2">
                {course.tools_covered.map((tool) => (
                  <span key={tool} className="text-xs px-2 py-1 bg-bg-tertiary rounded font-mono text-fg-secondary">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Curriculum */}
      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          {course.weeks.length === 0 ? (
            <p className="text-fg-tertiary text-center py-8">No weeks configured.</p>
          ) : (
            course.weeks.map((week) => (
              <div key={week.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-fg-primary">
                    Week {week.week_number}: {week.title_en}
                  </h3>
                  {week.phase && (
                    <span className="text-xs text-fg-tertiary">({week.phase})</span>
                  )}
                </div>

                {/* Sessions with inline editor */}
                {week.sessions.map((session) => (
                  <SessionEditor key={session.id} session={session} />
                ))}

                {/* Assignments summary */}
                {week.assignments.length > 0 && (
                  <div className="text-xs text-fg-tertiary px-4">
                    {week.assignments.length} assignment(s): {week.assignments.map((a) => a.title_en).join(', ')}
                  </div>
                )}

                {/* Vocabulary count */}
                {week.vocabulary.length > 0 && (
                  <div className="text-xs text-fg-tertiary px-4">
                    {week.vocabulary.length} vocabulary term(s)
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Students */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <ManualEnrollForm courseId={course.id} />
          <div className="border-t border-border-default pt-4">
            <p className="text-sm text-fg-tertiary">
              {course.current_enrollment} student(s) currently enrolled.
              View full student list in the{' '}
              <button
                type="button"
                onClick={() => router.push('/admin/students')}
                className="text-accent-teal hover:underline"
              >
                Students
              </button>{' '}
              section.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-3">
      <span className="text-xs text-fg-tertiary block mb-0.5">{label}</span>
      <span className="text-sm text-fg-primary capitalize">{value}</span>
    </div>
  );
}
