'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabNavigation } from '@/components/learn/TabNavigation';
import { StatusBadge } from './StatusBadge';
import { LibraryThumbnailUploader } from './LibraryThumbnailUploader';
import {
  createLibraryVideo,
  updateLibraryVideo,
  publishLibraryVideo,
  unpublishLibraryVideo,
  deleteLibraryVideo,
} from '@/lib/library/actions';
import type {
  LibraryVideo,
  LibraryVideoCategory,
  LibraryAccessTier,
  LibraryDifficulty,
  LibraryVideoLanguage,
} from '@/lib/library/types';

type AdminLibraryDetailProps = {
  video: LibraryVideo | null;
  courseOptions: { id: string; title: string }[];
};

const CATEGORIES: LibraryVideoCategory[] = [
  'ai-basics',
  'coding-tools',
  'business-automation',
  'image-video',
  'productivity',
  'getting-started',
];

const DIFFICULTIES: LibraryDifficulty[] = ['beginner', 'intermediate', 'advanced'];
const LANGUAGES: LibraryVideoLanguage[] = ['en', 'ja', 'both'];
const ACCESS_TIERS: LibraryAccessTier[] = ['open', 'free_account'];

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parseTags(input: string): string[] | null {
  const tags = input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : null;
}

export function AdminLibraryDetail({ video, courseOptions }: AdminLibraryDetailProps) {
  const router = useRouter();
  const isCreate = video === null;

  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [slug, setSlug] = useState(video?.slug ?? '');
  const [titleEn, setTitleEn] = useState(video?.title_en ?? '');
  const [titleJp, setTitleJp] = useState(video?.title_jp ?? '');
  const [descriptionEn, setDescriptionEn] = useState(video?.description_en ?? '');
  const [descriptionJp, setDescriptionJp] = useState(video?.description_jp ?? '');
  const [videoUrl, setVideoUrl] = useState(video?.video_url ?? '');
  const [durationSeconds, setDurationSeconds] = useState(video?.duration_seconds ?? 0);
  const [category, setCategory] = useState<LibraryVideoCategory>(video?.category ?? 'ai-basics');
  const [difficulty, setDifficulty] = useState<LibraryDifficulty>(video?.difficulty ?? 'beginner');
  const [language, setLanguage] = useState<LibraryVideoLanguage>(video?.language ?? 'en');
  const [accessTier, setAccessTier] = useState<LibraryAccessTier>(video?.access_tier ?? 'free_account');
  const [sortOrder, setSortOrder] = useState(video?.sort_order ?? 0);
  const [isFeatured, setIsFeatured] = useState(video?.is_featured ?? false);
  const [relatedCourseId, setRelatedCourseId] = useState(video?.related_course_id ?? '');
  const [relatedResourceSlug, setRelatedResourceSlug] = useState(video?.related_resource_slug ?? '');
  const [relatedGlossarySlugs, setRelatedGlossarySlugs] = useState(
    video?.related_glossary_slugs?.join(', ') ?? '',
  );
  const [tags, setTags] = useState(video?.tags?.join(', ') ?? '');

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'preview', label: 'Preview' },
  ];

  const canSave = slug.trim() && titleEn.trim() && videoUrl.trim() && durationSeconds > 0;

  function handleTitleBlur() {
    if (!slug && titleEn.trim()) {
      setSlug(slugify(titleEn));
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');
    try {
      const formData = {
        slug: slug.trim(),
        title_en: titleEn.trim(),
        title_jp: titleJp.trim() || null,
        description_en: descriptionEn.trim() || null,
        description_jp: descriptionJp.trim() || null,
        video_url: videoUrl.trim(),
        duration_seconds: durationSeconds,
        category,
        difficulty,
        language,
        access_tier: accessTier,
        sort_order: sortOrder,
        is_featured: isFeatured,
        related_course_id: relatedCourseId || null,
        related_resource_slug: relatedResourceSlug.trim() || null,
        related_glossary_slugs: parseTags(relatedGlossarySlugs),
        tags: parseTags(tags),
      };

      if (isCreate) {
        const { id } = await createLibraryVideo(formData);
        router.push(`/admin/library/${id}`);
      } else {
        await updateLibraryVideo(video.id, formData);
        setSaveMessage('Saved successfully');
        router.refresh();
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle() {
    if (!video) return;
    setActionLoading(true);
    try {
      if (video.is_published) {
        await unpublishLibraryVideo(video.id);
      } else {
        await publishLibraryVideo(video.id);
      }
      router.refresh();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!video) return;
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }
    setActionLoading(true);
    try {
      await deleteLibraryVideo(video.id);
      router.push('/admin/library');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Delete failed');
      setActionLoading(false);
    }
  }

  const ytId = videoUrl ? extractYouTubeId(videoUrl) : null;

  const videoPreview = videoUrl.trim() ? (
    ytId ? (
      <div className="aspect-[16/9] rounded-lg overflow-hidden bg-bg-tertiary">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ytId}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video preview"
        />
      </div>
    ) : (
      <div className="aspect-[16/9] rounded-lg bg-bg-tertiary flex items-center justify-center">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent-teal hover:underline"
        >
          Open video URL in new tab →
        </a>
      </div>
    )
  ) : null;

  return (
    <div className="space-y-6 max-w-[880px]">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/admin/library')}
        className="flex items-center gap-1 text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Library
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-serif text-fg-primary">
            {isCreate ? 'New Video' : video.title_en}
          </h1>
          {!isCreate && (
            <StatusBadge status={video.is_published ? 'published' : 'draft'} />
          )}
        </div>
        {!isCreate && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePublishToggle}
              disabled={actionLoading}
            >
              {video.is_published ? (
                <>
                  <EyeOff size={16} className="mr-1.5" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye size={16} className="mr-1.5" />
                  Publish
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              <Trash2 size={16} className="mr-1.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Tabs (edit mode only) */}
      {!isCreate && (
        <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* Preview tab */}
      {!isCreate && activeTab === 'preview' && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-fg-primary">Video Preview</h2>
          {videoPreview ?? (
            <p className="text-sm text-fg-tertiary">No video URL set.</p>
          )}
        </div>
      )}

      {/* Details tab / Create form */}
      {(isCreate || activeTab === 'details') && (
        <div className="space-y-8">
          {/* Section 1: Core Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
              Core Info
            </h3>

            {/* Slug */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Slug *</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated-from-title"
                className="w-full max-w-md px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
            </div>

            {/* Title EN / JP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">Title (EN) *</label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  onBlur={handleTitleBlur}
                  placeholder="Setting Up Cursor IDE with Claude"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                />
              </div>
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">Title (JP)</label>
                <input
                  type="text"
                  value={titleJp}
                  onChange={(e) => setTitleJp(e.target.value)}
                  placeholder="CursorのセットアップとClaude"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                />
              </div>
            </div>

            {/* Description EN */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Description (EN)</label>
              <textarea
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Brief description for the video card..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
              />
              <p className="text-xs text-fg-tertiary text-right mt-0.5">
                {descriptionEn.length}/500
              </p>
            </div>

            {/* Description JP */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Description (JP)</label>
              <textarea
                value={descriptionJp}
                onChange={(e) => setDescriptionJp(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="動画の簡単な説明..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
              />
              <p className="text-xs text-fg-tertiary text-right mt-0.5">
                {descriptionJp.length}/500
              </p>
            </div>
          </div>

          {/* Section 2: Video Content */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
              Video Content
            </h3>

            {/* Video URL */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Video URL *</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or embed URL"
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
            </div>

            {/* Inline YouTube preview */}
            {videoPreview}

            {/* Duration */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Duration (seconds) *</label>
              <input
                type="number"
                value={durationSeconds || ''}
                onChange={(e) => setDurationSeconds(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full max-w-xs px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
              />
              <p className="text-xs text-fg-tertiary mt-0.5">
                {durationSeconds > 0 ? `${Math.ceil(durationSeconds / 60)} min` : '—'}
              </p>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-2">Thumbnail</label>
              {isCreate ? (
                <p className="text-xs text-fg-tertiary">
                  Save the video first, then upload a thumbnail.
                </p>
              ) : (
                <LibraryThumbnailUploader
                  videoId={video.id}
                  currentUrl={video.thumbnail_url}
                  onUploadComplete={() => router.refresh()}
                  onRemove={async () => {
                    await updateLibraryVideo(video.id, { thumbnail_url: null });
                    router.refresh();
                  }}
                />
              )}
            </div>
          </div>

          {/* Section 3: Classification */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
              Classification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LibraryVideoCategory)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/-/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as LibraryDifficulty)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LibraryVideoLanguage)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Access Tier */}
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">Access Tier</label>
                <select
                  value={accessTier}
                  onChange={(e) => setAccessTier(e.target.value as LibraryAccessTier)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
                >
                  {ACCESS_TIERS.map((a) => (
                    <option key={a} value={a}>
                      {a.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">Sort Order</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
                />
              </div>

              {/* Featured */}
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-border-default bg-bg-tertiary text-accent-teal focus:ring-accent-teal"
                  />
                  <span className="text-sm text-fg-primary">Featured</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Relations */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
              Relations
            </h3>

            {/* Related Course */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Related Course</label>
              <select
                value={relatedCourseId}
                onChange={(e) => setRelatedCourseId(e.target.value)}
                className="w-full max-w-md px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
              >
                <option value="">None</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Related Resource Slug */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">
                Related Resource Slug
              </label>
              <input
                type="text"
                value={relatedResourceSlug}
                onChange={(e) => setRelatedResourceSlug(e.target.value)}
                placeholder="cursor-ai"
                className="w-full max-w-md px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
            </div>

            {/* Related Glossary Slugs */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">
                Related Glossary Slugs
              </label>
              <input
                type="text"
                value={relatedGlossarySlugs}
                onChange={(e) => setRelatedGlossarySlugs(e.target.value)}
                placeholder="mcp, llm, prompt-engineering"
                className="w-full max-w-md px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
              <p className="text-xs text-fg-tertiary mt-0.5">Comma-separated slugs</p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="cursor, claude, setup, beginner"
                className="w-full max-w-md px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
              <p className="text-xs text-fg-tertiary mt-0.5">Comma-separated keywords</p>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving || !canSave}
            >
              <Save size={16} className="mr-1.5" />
              {saving
                ? 'Saving...'
                : isCreate
                  ? 'Create Video'
                  : 'Save Changes'}
            </Button>
            {saveMessage && (
              <span
                className={`text-sm ${
                  saveMessage.includes('fail') || saveMessage.includes('Failed')
                    ? 'text-red-400'
                    : 'text-accent-teal'
                }`}
              >
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
