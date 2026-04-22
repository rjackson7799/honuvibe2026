'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Download, EyeOff, Globe, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { CourseRevenueSplitEditor } from './CourseRevenueSplitEditor';
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
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateResult, setTranslateResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);

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

  const [toolsCovered, setToolsCovered] = useState<string[]>(course.tools_covered ?? []);
  const [newTool, setNewTool] = useState('');
  const [savingTools, setSavingTools] = useState(false);

  const [descEn, setDescEn] = useState(course.description_en ?? '');
  const [editingDescEn, setEditingDescEn] = useState(false);
  const [savingDescEn, setSavingDescEn] = useState(false);

  const [descJp, setDescJp] = useState(course.description_jp ?? '');
  const [editingDescJp, setEditingDescJp] = useState(false);
  const [savingDescJp, setSavingDescJp] = useState(false);

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

  // Optimistic Vertice membership state keyed by user_id
  const [verticeMemberMap, setVerticeMemberMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(enrolledStudents.map((s) => [s.user_id, s.is_vertice_member])),
  );
  const [verticeToggling, setVerticeToggling] = useState<string | null>(null);

  // Unenroll state: tracks enrollment IDs being removed and locally removed IDs
  const [unenrolling, setUnenrolling] = useState<string | null>(null);
  const [removedEnrollmentIds, setRemovedEnrollmentIds] = useState<Set<string>>(new Set());

  async function handleUnenroll(enrollmentId: string, studentName: string | null) {
    if (!confirm(`Remove ${studentName ?? 'this student'} from the course?`)) return;
    setUnenrolling(enrollmentId);
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}`, { method: 'DELETE' });
      if (res.ok) {
        setRemovedEnrollmentIds((prev) => new Set([...prev, enrollmentId]));
      } else {
        alert('Failed to remove enrollment. Please try again.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setUnenrolling(null);
    }
  }

  async function handleVerticeToggle(userId: string) {
    setVerticeToggling(userId);
    const prev = verticeMemberMap[userId] ?? false;
    setVerticeMemberMap((m) => ({ ...m, [userId]: !prev })); // optimistic
    try {
      const res = await fetch(`/api/admin/users/${userId}/vertice`, { method: 'PATCH' });
      if (!res.ok) {
        setVerticeMemberMap((m) => ({ ...m, [userId]: prev })); // revert
      }
    } catch {
      setVerticeMemberMap((m) => ({ ...m, [userId]: prev })); // revert
    } finally {
      setVerticeToggling(null);
    }
  }

  const bonusCount = course.bonusSessions?.length ?? 0;
  const [addingBonus, setAddingBonus] = useState(false);
  const localePrefix =
    pathname && /^\/(en|ja)(\/|$)/.test(pathname)
      ? `/${pathname.split('/')[1]}`
      : '';
  const sharePath = `${localePrefix}/learn/${course.slug}`;
  const shareUrl =
    typeof window === 'undefined'
      ? sharePath
      : `${window.location.origin}${sharePath}`;

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

  async function handlePrivacyToggle() {
    setActionLoading(true);
    try {
      await updateCourse(course.id, { is_private: !course.is_private });
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
      <div className="space-y-4">
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
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap gap-2">
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

          <CourseRevenueSplitEditor
            courseId={course.id}
            instructorSharePct={Number(course.instructor_revenue_share_pct ?? 0)}
            instructors={(course.instructors ?? []).map((ci) => ({
              id: ci.id,
              instructor_id: ci.instructor_id,
              revenue_share_pct: Number(ci.revenue_share_pct ?? 0),
              instructor: {
                display_name: ci.instructor.display_name,
              },
            }))}
            priceUsd={course.price_usd}
            priceJpy={course.price_jpy}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableInfoField
              label="Level"
              displayValue={course.level ?? '—'}
              inputType="select"
              options={[
                { label: '—', value: '' },
                { label: 'Beginner', value: 'beginner' },
                { label: 'Intermediate', value: 'intermediate' },
                { label: 'Advanced', value: 'advanced' },
              ]}
              defaultEditValue={course.level ?? ''}
              onSave={async (val) => { await updateCourse(course.id, { level: val || null }); router.refresh(); }}
            />
            <EditableInfoField
              label="Language"
              displayValue={course.language}
              inputType="select"
              options={[
                { label: 'English', value: 'en' },
                { label: 'Japanese', value: 'ja' },
                { label: 'Both', value: 'both' },
              ]}
              defaultEditValue={course.language}
              onSave={async (val) => { await updateCourse(course.id, { language: val }); router.refresh(); }}
            />
            <EditableInfoField
              label="Format"
              displayValue={course.format ?? '—'}
              inputType="select"
              options={[
                { label: '—', value: '' },
                { label: 'Self-Paced Recorded Lessons With Downloadable Guides', value: 'Self-Paced Recorded Lessons With Downloadable Guides' },
                { label: 'Live Cohort', value: 'Live Cohort' },
                { label: 'Hybrid', value: 'Hybrid' },
              ]}
              defaultEditValue={course.format ?? ''}
              onSave={async (val) => { await updateCourse(course.id, { format: val || null }); router.refresh(); }}
            />
            <EditableInfoField
              label="Total Weeks"
              displayValue={course.total_weeks?.toString() ?? '—'}
              inputType="number"
              defaultEditValue={course.total_weeks?.toString() ?? ''}
              onSave={async (val) => { await updateCourse(course.id, { total_weeks: val ? parseInt(val) : null }); router.refresh(); }}
            />
            <EditableInfoField
              label="Live Sessions"
              displayValue={course.live_sessions_count?.toString() ?? '—'}
              inputType="number"
              defaultEditValue={course.live_sessions_count?.toString() ?? ''}
              onSave={async (val) => { await updateCourse(course.id, { live_sessions_count: val ? parseInt(val) : null }); router.refresh(); }}
            />
            <EditableInfoField
              label="Recorded Lessons"
              displayValue={course.recorded_lessons_count?.toString() ?? '—'}
              inputType="number"
              defaultEditValue={course.recorded_lessons_count?.toString() ?? ''}
              onSave={async (val) => { await updateCourse(course.id, { recorded_lessons_count: val ? parseInt(val) : null }); router.refresh(); }}
            />
            <EditableInfoField
              label="Price (USD)"
              displayValue={course.price_usd ? `$${(course.price_usd / 100).toFixed(2)}` : '—'}
              inputType="number"
              defaultEditValue={course.price_usd ? (course.price_usd / 100).toString() : ''}
              onSave={async (val) => { await updateCourse(course.id, { price_usd: val ? Math.round(parseFloat(val) * 100) : null }); router.refresh(); }}
            />
            <EditableInfoField
              label="Price (JPY)"
              displayValue={course.price_jpy ? `¥${course.price_jpy.toLocaleString()}` : '—'}
              inputType="number"
              defaultEditValue={course.price_jpy?.toString() ?? ''}
              onSave={async (val) => { await updateCourse(course.id, { price_jpy: val ? parseInt(val) : null }); router.refresh(); }}
            />
            <EditableInfoField
              label="Start Date"
              displayValue={course.start_date
                ? new Date(course.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : '—'}
              inputType="date"
              defaultEditValue={course.start_date ?? ''}
              onSave={async (val) => { await updateCourse(course.id, { start_date: val || null }); router.refresh(); }}
            />
            <InfoField
              label="Instructor(s)"
              value={
                (course.instructors ?? []).length > 0
                  ? course.instructors.map((ci) => ci.instructor.display_name).join(', ')
                  : course.instructor_name ?? '—'
              }
            />
            <EditableInfoField
              label="Community"
              displayValue={course.community_platform ?? '—'}
              inputType="select"
              options={[
                { label: '—', value: '' },
                { label: 'Discord', value: 'Discord' },
                { label: 'Skool', value: 'Skool' },
                { label: 'LINE', value: 'LINE' },
                { label: 'Circle', value: 'Circle' },
              ]}
              defaultEditValue={course.community_platform ?? ''}
              onSave={async (val) => { await updateCourse(course.id, { community_platform: val || null }); router.refresh(); }}
            />
            <InfoField label="Visibility" value={course.is_private ? 'Private' : 'Public'} />
            <EditableInfoField
              label="Max Enrollment"
              displayValue={course.max_enrollment?.toString() ?? 'Unlimited'}
              inputType="number"
              defaultEditValue={course.max_enrollment?.toString() ?? ''}
              onSave={async (val) => { await updateCourse(course.id, { max_enrollment: val ? parseInt(val) : null }); router.refresh(); }}
            />
          </div>

          <div className="border-t border-border-default pt-4">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <EyeOff size={16} className="text-fg-tertiary" />
                  <h3 className="text-sm font-medium text-fg-primary">Make Private</h3>
                </div>
                <p className="max-w-[560px] text-xs text-fg-tertiary">
                  Private courses stay published and accessible by direct URL, but are hidden from the public Learn catalog and featured course sections.
                </p>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handlePrivacyToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  course.is_private ? 'bg-accent-teal' : 'bg-bg-tertiary'
                } ${actionLoading ? 'opacity-50' : ''}`}
                aria-pressed={course.is_private}
                aria-label="Toggle private course visibility"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    course.is_private ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-xs text-fg-tertiary">Share URL</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-lg border border-border-default bg-bg-secondary px-3 py-2 text-sm text-fg-secondary"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={typeof window === 'undefined'}
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopiedShareUrl(true);
                    window.setTimeout(() => setCopiedShareUrl(false), 2000);
                  }}
                >
                  <Copy size={14} className="mr-1" />
                  {copiedShareUrl ? 'Copied' : 'Copy URL'}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-fg-primary">Description (EN)</h3>
              {!editingDescEn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDescEn(course.description_en ?? '');
                    setEditingDescEn(true);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
            {!editingDescEn ? (
              course.description_en ? (
                <p className="text-sm text-fg-secondary whitespace-pre-wrap">{course.description_en}</p>
              ) : (
                <p className="text-sm text-fg-muted italic">No description yet.</p>
              )
            ) : (
              <div className="flex flex-col gap-2">
                <textarea
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  rows={5}
                  className="w-full text-sm bg-bg-secondary border border-border-default rounded px-3 py-1.5 text-fg-primary placeholder:text-fg-muted"
                  placeholder="Course description (English)"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={savingDescEn}
                    onClick={() => {
                      setDescEn(course.description_en ?? '');
                      setEditingDescEn(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={savingDescEn || descEn === (course.description_en ?? '')}
                    onClick={async () => {
                      setSavingDescEn(true);
                      try {
                        await updateCourse(course.id, { description_en: descEn });
                        router.refresh();
                        setEditingDescEn(false);
                      } finally {
                        setSavingDescEn(false);
                      }
                    }}
                  >
                    {savingDescEn ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-fg-primary">Description (JP)</h3>
              {!editingDescJp && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDescJp(course.description_jp ?? '');
                    setEditingDescJp(true);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
            {!editingDescJp ? (
              course.description_jp ? (
                <p className="text-sm text-fg-secondary whitespace-pre-wrap">{course.description_jp}</p>
              ) : (
                <p className="text-sm text-fg-muted italic">No description yet.</p>
              )
            ) : (
              <div className="flex flex-col gap-2">
                <textarea
                  value={descJp}
                  onChange={(e) => setDescJp(e.target.value)}
                  rows={5}
                  className="w-full text-sm bg-bg-secondary border border-border-default rounded px-3 py-1.5 text-fg-primary placeholder:text-fg-muted"
                  placeholder="Course description (Japanese)"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={savingDescJp}
                    onClick={() => {
                      setDescJp(course.description_jp ?? '');
                      setEditingDescJp(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={savingDescJp || descJp === (course.description_jp ?? '')}
                    onClick={async () => {
                      setSavingDescJp(true);
                      try {
                        await updateCourse(course.id, { description_jp: descJp });
                        router.refresh();
                        setEditingDescJp(false);
                      } finally {
                        setSavingDescJp(false);
                      }
                    }}
                  >
                    {savingDescJp ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-fg-primary mb-2">Tools Covered</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {toolsCovered.map((tool) => (
                <span key={tool} className="flex items-center gap-1 text-xs px-2 py-1 bg-bg-tertiary rounded font-mono text-fg-secondary">
                  {tool}
                  <button
                    type="button"
                    onClick={() => setToolsCovered((prev) => prev.filter((t) => t !== tool))}
                    className="ml-1 text-fg-muted hover:text-red-400 transition-colors leading-none"
                    aria-label={`Remove ${tool}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {toolsCovered.length === 0 && (
                <span className="text-xs text-fg-muted">No tools added yet.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTool}
                onChange={(e) => setNewTool(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const trimmed = newTool.trim();
                    if (trimmed && !toolsCovered.includes(trimmed)) {
                      setToolsCovered((prev) => [...prev, trimmed]);
                    }
                    setNewTool('');
                  }
                }}
                placeholder="Add tool (press Enter)"
                className="flex-1 max-w-[220px] text-sm bg-bg-secondary border border-border-default rounded px-3 py-1.5 text-fg-primary placeholder:text-fg-muted"
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={savingTools || toolsCovered === (course.tools_covered ?? [])}
                onClick={async () => {
                  setSavingTools(true);
                  try {
                    await updateCourse(course.id, { tools_covered: toolsCovered });
                    router.refresh();
                  } finally {
                    setSavingTools(false);
                  }
                }}
              >
                {savingTools ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>

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
                      <th className="text-left py-2 px-3 text-xs font-semibold text-fg-tertiary uppercase tracking-wider">Vertice</th>
                      <th className="py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.filter((s) => !removedEnrollmentIds.has(s.id)).map((student) => {
                      const isVertice = verticeMemberMap[student.user_id] ?? false;
                      return (
                        <tr key={student.id} className="border-b border-border-default/50 hover:bg-bg-secondary/50">
                          <td className="py-2 px-3 text-fg-primary">
                            <span className="flex items-center gap-2">
                              {student.full_name ?? '—'}
                              {isVertice && (
                                <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-accent-gold/15 text-accent-gold tracking-wide">
                                  Vertice
                                </span>
                              )}
                            </span>
                          </td>
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
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => handleVerticeToggle(student.user_id)}
                              disabled={verticeToggling === student.user_id}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isVertice ? 'bg-accent-gold' : 'bg-bg-tertiary'
                              } ${verticeToggling === student.user_id ? 'opacity-50' : ''}`}
                              aria-pressed={isVertice}
                              aria-label={`${isVertice ? 'Remove' : 'Grant'} Vertice Society membership`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isVertice ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => handleUnenroll(student.id, student.full_name)}
                              disabled={unenrolling === student.id}
                              className="text-fg-muted hover:text-red-400 transition-colors disabled:opacity-40"
                              aria-label={`Unenroll ${student.full_name ?? 'student'}`}
                              title="Unenroll"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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

type EditableFieldType = 'number' | 'select' | 'date' | 'text';

function EditableInfoField({
  label,
  displayValue,
  inputType,
  options,
  defaultEditValue,
  onSave,
}: {
  label: string;
  displayValue: string;
  inputType: EditableFieldType;
  options?: { label: string; value: string }[];
  defaultEditValue: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(defaultEditValue);
  const [saving, setSaving] = useState(false);

  function handleEdit() {
    setDraft(defaultEditValue);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-3 group">
      <span className="text-xs text-fg-tertiary block mb-0.5">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2 mt-1">
          {inputType === 'select' ? (
            <select
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="flex-1 min-w-0 text-sm bg-bg-tertiary border border-border-default rounded px-2 py-0.5 text-fg-primary"
            >
              {options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={inputType}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="flex-1 min-w-0 text-sm bg-bg-tertiary border border-border-default rounded px-2 py-0.5 text-fg-primary"
            />
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="shrink-0 text-xs text-accent-teal hover:underline disabled:opacity-50"
          >
            {saving ? '…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="shrink-0 text-xs text-fg-muted hover:text-fg-primary hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-fg-primary capitalize truncate">{displayValue}</span>
          <button
            type="button"
            onClick={handleEdit}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-fg-muted hover:text-fg-primary"
            aria-label={`Edit ${label}`}
          >
            <Pencil size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
