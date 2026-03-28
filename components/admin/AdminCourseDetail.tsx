'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Globe, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabNavigation } from '@/components/learn/TabNavigation';
import { StatusBadge } from './StatusBadge';
import { SessionEditor } from './SessionEditor';
import { BonusSessionEditor } from './BonusSessionEditor';
import { ManualEnrollForm } from './ManualEnrollForm';
import { publishCourse, unpublishCourse, archiveCourse, deleteCourse, updateCourse, createBonusSession } from '@/lib/courses/actions';
import { CourseImageUploader } from './course-image-uploader';
import { InstructorAssignControl } from './InstructorAssignControl';
import { ESLAdminDashboard } from './ESLAdminDashboard';
import type { CourseWithCurriculum, EnrolledStudent } from '@/lib/courses/types';

type InstructorOption = {
  id: string;
  display_name: string;
  photo_url: string | null;
};

type AdminCourseDetailProps = {
  course: CourseWithCurriculum;
  instructors?: InstructorOption[];
  enrolledStudents?: EnrolledStudent[];
};

export function AdminCourseDetail({ course, instructors = [], enrolledStudents = [] }: AdminCourseDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateResult, setTranslateResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const hasJpTranslations = !!course.title_jp;

  async function handleTranslate() {
    setTranslating(true);
    setTranslateResult(null);
    try {
      const res = await fetch('/api/admin/courses/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTranslateResult({ error: data.error || 'Translation failed' });
      } else {
        setTranslateResult({ success: true });
        router.refresh();
      }
    } catch {
      setTranslateResult({ error: 'Network error' });
    } finally {
      setTranslating(false);
    }
  }

  const [freePreviewCount, setFreePreviewCount] = useState(course.free_preview_count ?? 0);
  const [savingPreview, setSavingPreview] = useState(false);

  const [eslEnabled, setEslEnabled] = useState(course.esl_enabled);
  const [eslToggling, setEslToggling] = useState(false);
  const [eslLessons, setEslLessons] = useState<{ id: string; week_id: string; status: string; generation_error: string | null; updated_at: string }[]>([]);

  // Fetch ESL lessons when ESL tab is activated
  useEffect(() => {
    if (activeTab === 'esl' && eslEnabled && eslLessons.length === 0) {
      fetch(`/api/admin/esl/lessons?courseId=${course.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.lessons) setEslLessons(data.lessons);
        })
        .catch(() => {/* silently fail */});
    }
  }, [activeTab, eslEnabled, course.id, eslLessons.length]);

  const bonusCount = course.bonusSessions?.length ?? 0;
  const [addingBonus, setAddingBonus] = useState(false);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'curriculum', label: 'Curriculum' },
    { key: 'bonus', label: bonusCount > 0 ? `Bonus Sessions (${bonusCount})` : 'Bonus Sessions' },
    { key: 'students', label: 'Students' },
    ...(eslEnabled ? [{ key: 'esl', label: 'ESL Content' }] : []),
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

  const canDelete =
    course.current_enrollment === 0 &&
    (!course.start_date || new Date(course.start_date) > new Date());

  async function handleDelete() {
    if (!confirm('Permanently delete this course? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await deleteCourse(course.id);
      router.push('/admin/courses');
    } catch (err) {
      console.error('Failed to delete course:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete course');
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
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/api/courses/${course.id}/syllabus?locale=en&preview=true`, '_blank')}
            >
              <Download size={14} className="mr-1" />
              Preview Syllabus
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/api/courses/${course.id}/syllabus?locale=ja&preview=true`, '_blank')}
            >
              <Globe size={14} className="mr-1" />
              プレビュー JP
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTranslate}
              disabled={translating || actionLoading}
            >
              {translating ? 'Translating…' : hasJpTranslations ? 'Regenerate JP' : 'Generate JP Translations'}
            </Button>
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
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={actionLoading}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
              >
                <Trash2 size={14} className="mr-1" />
                Delete
              </Button>
            )}
          </div>
          {translateResult?.success && (
            <span className="text-xs text-accent-teal">
              Japanese translations generated successfully.
            </span>
          )}
          {translateResult?.error && (
            <span className="text-xs text-red-400">
              Error: {translateResult.error}
            </span>
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

          {/* Instructor Assignment */}
          <InstructorAssignControl
            courseId={course.id}
            courseInstructors={(course.instructors ?? []).map((ci) => ({
              id: ci.id,
              instructor_id: ci.instructor_id,
              role: ci.role,
              sort_order: ci.sort_order,
              instructor: {
                display_name: ci.instructor.display_name,
                photo_url: ci.instructor.photo_url,
              },
            }))}
            allInstructors={instructors}
            legacyInstructorName={course.instructor_name}
          />

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
            <InfoField
              label="Instructor(s)"
              value={
                (course.instructors ?? []).length > 0
                  ? course.instructors.map((ci) => ci.instructor.display_name).join(', ')
                  : course.instructor_name ?? '—'
              }
            />
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

          {/* Free Preview Sessions */}
          <div className="border-t border-border-default pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-fg-primary">Free Preview Sessions</h3>
                <p className="text-xs text-fg-tertiary mt-0.5">
                  Number of sessions from the beginning available for free to logged-in users. Set to 0 for fully paid.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={0}
                  value={freePreviewCount}
                  onChange={(e) => setFreePreviewCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 text-center text-sm bg-bg-tertiary border border-border-default rounded px-2 py-1 text-fg-primary"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={savingPreview || freePreviewCount === (course.free_preview_count ?? 0)}
                  onClick={async () => {
                    setSavingPreview(true);
                    try {
                      await updateCourse(course.id, { free_preview_count: freePreviewCount });
                      router.refresh();
                    } finally {
                      setSavingPreview(false);
                    }
                  }}
                >
                  {savingPreview ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>

          {/* ESL Settings */}
          <div className="border-t border-border-default pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-fg-primary">ESL Lessons</h3>
                <p className="text-xs text-fg-tertiary mt-0.5">
                  Generate English-as-a-Second-Language lesson content from course material
                </p>
              </div>
              <button
                type="button"
                disabled={eslToggling}
                onClick={async () => {
                  setEslToggling(true);
                  try {
                    const next = !eslEnabled;
                    await updateCourse(course.id, { esl_enabled: next });
                    setEslEnabled(next);
                    router.refresh();
                  } finally {
                    setEslToggling(false);
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  eslEnabled ? 'bg-accent-teal' : 'bg-bg-tertiary'
                } ${eslToggling ? 'opacity-50' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    eslEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
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
                  <SessionEditor
                    key={session.id}
                    session={session}
                    courseId={course.id}
                    courseInstructors={(course.instructors ?? []).map((ci) => ({
                      instructor_id: ci.instructor_id,
                      display_name: ci.instructor.display_name,
                    }))}
                  />
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

      {/* Bonus Sessions */}
      {activeTab === 'bonus' && (
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={addingBonus}
            onClick={async () => {
              setAddingBonus(true);
              try {
                await createBonusSession(course.id, {
                  bonus_type: 'office-hours',
                  title_en: 'New Bonus Session',
                });
                router.refresh();
              } catch (err) {
                console.error('Failed to create bonus session:', err);
                alert('Failed to create bonus session. Please try again.');
              } finally {
                setAddingBonus(false);
              }
            }}
          >
            <Plus size={14} className="mr-1" />
            {addingBonus ? 'Adding...' : 'Add Bonus Session'}
          </Button>

          {bonusCount === 0 ? (
            <p className="text-fg-tertiary text-center py-8">No bonus sessions yet.</p>
          ) : (
            course.bonusSessions.map((session) => (
              <BonusSessionEditor
                key={session.id}
                session={session}
                courseInstructors={(course.instructors ?? []).map((ci) => ({
                  instructor_id: ci.instructor_id,
                  display_name: ci.instructor.display_name,
                }))}
              />
            ))
          )}
        </div>
      )}

      {/* Students */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <ManualEnrollForm courseId={course.id} enrolledStudentIds={enrolledStudents.map(s => s.user_id)} />

          {/* Enrolled Students Roster */}
          <div className="border-t border-border-default pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg-primary">
                Enrolled Students ({enrolledStudents.length})
              </h3>
              <button
                type="button"
                onClick={() => router.push('/admin/students')}
                className="text-xs text-accent-teal hover:underline"
              >
                View all students
              </button>
            </div>

            {enrolledStudents.length === 0 ? (
              <p className="text-sm text-fg-tertiary py-4 text-center">
                No students enrolled yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-fg-tertiary uppercase tracking-wider">Name</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-fg-tertiary uppercase tracking-wider">Email</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-fg-tertiary uppercase tracking-wider">Enrolled</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-fg-tertiary uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map((student) => (
                      <tr key={student.id} className="border-b border-border-default/50 hover:bg-bg-secondary/50">
                        <td className="py-2 px-3 text-fg-primary">{student.full_name ?? '—'}</td>
                        <td className="py-2 px-3 text-fg-secondary">{student.email ?? '—'}</td>
                        <td className="py-2 px-3 text-fg-tertiary">
                          {new Date(student.enrolled_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                            student.status === 'active'
                              ? 'bg-accent-teal/10 text-accent-teal'
                              : student.status === 'completed'
                                ? 'bg-accent-gold/10 text-accent-gold'
                                : 'bg-fg-muted/10 text-fg-muted'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ESL Content */}
      {activeTab === 'esl' && eslEnabled && (
        <ESLAdminDashboard
          course={{
            id: course.id,
            title_en: course.title_en,
            title_jp: course.title_jp,
            esl_enabled: course.esl_enabled,
            esl_included: course.esl_included,
            esl_settings_json: course.esl_settings_json,
          }}
          weeks={course.weeks.map((w) => ({
            id: w.id,
            week_number: w.week_number,
            title_en: w.title_en,
            title_jp: w.title_jp,
          }))}
          eslLessons={eslLessons}
          locale="en"
        />
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
