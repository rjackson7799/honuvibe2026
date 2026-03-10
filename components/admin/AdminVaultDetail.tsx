'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Eye, EyeOff, Plus, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import {
  createVaultItem,
  updateVaultItem,
  publishVaultItem,
  unpublishVaultItem,
  deleteVaultItem,
  createVaultDownload,
  deleteVaultDownload,
} from '@/lib/vault/actions';
import { VaultRelatedPicker } from './VaultRelatedPicker';
import type {
  VaultContentItem,
  VaultTag,
  VaultDownload,
  VaultContentType,
  VaultDifficulty,
  VaultAccessTier,
  VaultLanguage,
  VaultFreshnessStatus,
} from '@/lib/vault/types';

type AdminVaultDetailProps = {
  item: VaultContentItem | null;
  tags: VaultTag[];
  seriesOptions: { id: string; title: string }[];
  courseOptions: { id: string; title: string }[];
  downloads?: VaultDownload[];
  allItems?: { id: string; title_en: string; title_jp: string | null; content_type: string }[];
};

const CONTENT_TYPES: VaultContentType[] = [
  'video_custom',
  'video_youtube',
  'article',
  'tool',
  'template',
  'guide',
  'course_recording',
];

const DIFFICULTIES: VaultDifficulty[] = ['beginner', 'intermediate', 'advanced'];
const LANGUAGES: VaultLanguage[] = ['en', 'ja', 'both'];
const ACCESS_TIERS: VaultAccessTier[] = ['free', 'premium'];
const FRESHNESS_STATUSES: VaultFreshnessStatus[] = ['current', 'review_needed', 'outdated'];

const TAG_CATEGORIES = ['topic', 'tool', 'skill', 'industry', 'format'] as const;

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

const FILE_TYPES = ['pdf', 'zip', 'xlsx', 'docx', 'csv', 'json', 'md', 'other'] as const;

export function AdminVaultDetail({
  item,
  tags,
  seriesOptions,
  courseOptions,
  downloads = [],
  allItems = [],
}: AdminVaultDetailProps) {
  const router = useRouter();
  const isCreate = item === null;

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [slug, setSlug] = useState(item?.slug ?? '');
  const [titleEn, setTitleEn] = useState(item?.title_en ?? '');
  const [titleJp, setTitleJp] = useState(item?.title_jp ?? '');
  const [descriptionEn, setDescriptionEn] = useState(item?.description_en ?? '');
  const [descriptionJp, setDescriptionJp] = useState(item?.description_jp ?? '');
  const [contentUrl, setContentUrl] = useState(item?.url ?? '');
  const [embedUrl, setEmbedUrl] = useState(item?.embed_url ?? '');
  const [durationMinutes, setDurationMinutes] = useState(item?.duration_minutes ?? 0);
  const [authorName, setAuthorName] = useState(item?.author_name ?? '');
  const [publishDate, setPublishDate] = useState(item?.publish_date ?? '');
  const [contentType, setContentType] = useState<VaultContentType>(
    item?.content_type ?? 'video_youtube',
  );
  const [difficulty, setDifficulty] = useState<VaultDifficulty>(
    item?.difficulty_level ?? 'beginner',
  );
  const [language, setLanguage] = useState<VaultLanguage>(item?.language ?? 'en');
  const [accessTier, setAccessTier] = useState<VaultAccessTier>(item?.access_tier ?? 'free');
  const [isFeatured, setIsFeatured] = useState(item?.is_featured ?? false);
  const [selectedTags, setSelectedTags] = useState<string[]>(item?.tags ?? []);
  const [seriesId, setSeriesId] = useState(item?.series_id ?? '');
  const [seriesOrder, setSeriesOrder] = useState(item?.series_order ?? 0);
  const [relatedCourseId, setRelatedCourseId] = useState(item?.source_course_id ?? '');
  const [relatedItemIds, setRelatedItemIds] = useState<string[]>(item?.related_item_ids ?? []);
  const [adminNotes, setAdminNotes] = useState(item?.admin_notes ?? '');
  const [freshnessStatus, setFreshnessStatus] = useState<VaultFreshnessStatus>(
    item?.freshness_status ?? 'current',
  );

  // Download form state
  const [showDownloadForm, setShowDownloadForm] = useState(false);
  const [dlFileName, setDlFileName] = useState('');
  const [dlFileUrl, setDlFileUrl] = useState('');
  const [dlFileType, setDlFileType] = useState('pdf');
  const [dlFileSizeBytes, setDlFileSizeBytes] = useState(0);
  const [dlDescriptionEn, setDlDescriptionEn] = useState('');
  const [dlDescriptionJp, setDlDescriptionJp] = useState('');
  const [dlAccessTier, setDlAccessTier] = useState<VaultAccessTier>('free');
  const [dlDisplayOrder, setDlDisplayOrder] = useState(0);
  const [dlSaving, setDlSaving] = useState(false);

  const canSave = titleEn.trim() && contentUrl.trim();

  function handleTitleBlur() {
    if (!slug && titleEn.trim()) {
      setSlug(slugify(titleEn));
    }
  }

  function handleTagToggle(tagSlug: string) {
    setSelectedTags((prev) =>
      prev.includes(tagSlug) ? prev.filter((t) => t !== tagSlug) : [...prev, tagSlug],
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');
    try {
      const formData = {
        title_en: titleEn.trim(),
        title_jp: titleJp.trim() || undefined,
        slug: slug.trim() || undefined,
        description_en: descriptionEn.trim() || undefined,
        description_jp: descriptionJp.trim() || undefined,
        content_type: contentType,
        url: contentUrl.trim(),
        embed_url: embedUrl.trim() || undefined,
        duration_minutes: durationMinutes || undefined,
        author_name: authorName.trim() || undefined,
        publish_date: publishDate || undefined,
        difficulty_level: difficulty,
        language,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        access_tier: accessTier,
        source_course_id: relatedCourseId || undefined,
        related_item_ids: relatedItemIds.length > 0 ? relatedItemIds : undefined,
        admin_notes: adminNotes.trim() || undefined,
        series_id: seriesId || undefined,
        series_order: seriesOrder || undefined,
        is_featured: isFeatured,
        ...(!isCreate ? { freshness_status: freshnessStatus } : {}),
      };

      if (isCreate) {
        const { id } = await createVaultItem(formData);
        router.push(`/admin/vault/${id}`);
      } else {
        await updateVaultItem(item.id, formData);
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
    if (!item) return;
    setActionLoading(true);
    try {
      if (item.is_published) {
        await unpublishVaultItem(item.id);
      } else {
        await publishVaultItem(item.id);
      }
      router.refresh();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }
    setActionLoading(true);
    try {
      await deleteVaultItem(item.id);
      router.push('/admin/vault');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Delete failed');
      setActionLoading(false);
    }
  }

  async function handleAddDownload() {
    if (!item || !dlFileName.trim() || !dlFileUrl.trim()) return;
    setDlSaving(true);
    try {
      await createVaultDownload({
        content_item_id: item.id,
        file_name: dlFileName.trim(),
        file_url: dlFileUrl.trim(),
        file_type: dlFileType,
        file_size_bytes: dlFileSizeBytes || undefined,
        description_en: dlDescriptionEn.trim() || undefined,
        description_jp: dlDescriptionJp.trim() || undefined,
        access_tier: dlAccessTier,
        display_order: dlDisplayOrder,
      });
      // Reset form
      setDlFileName('');
      setDlFileUrl('');
      setDlFileType('pdf');
      setDlFileSizeBytes(0);
      setDlDescriptionEn('');
      setDlDescriptionJp('');
      setDlAccessTier('free');
      setDlDisplayOrder(0);
      setShowDownloadForm(false);
      router.refresh();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to add download');
    } finally {
      setDlSaving(false);
    }
  }

  async function handleDeleteDownload(downloadId: string) {
    if (!confirm('Delete this download?')) return;
    try {
      await deleteVaultDownload(downloadId);
      router.refresh();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to delete download');
    }
  }

  const ytId = contentUrl ? extractYouTubeId(contentUrl) : null;

  // Group tags by category
  const tagsByCategory = TAG_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = tags.filter((t) => t.category === cat);
      return acc;
    },
    {} as Record<string, VaultTag[]>,
  );

  return (
    <div className="space-y-6 max-w-[880px]">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/admin/vault')}
        className="flex items-center gap-1 text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Vault
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-serif text-fg-primary">
            {isCreate ? 'New Content' : item.title_en}
          </h1>
          {!isCreate && (
            <StatusBadge status={item.is_published ? 'published' : 'draft'} />
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
              {item.is_published ? (
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

      {/* Form */}
      <div className="space-y-8">
        {/* Section 1: Core Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
            Core Info
          </h3>

          {/* Slug */}
          <div>
            <label className="block text-xs text-fg-tertiary mb-1">Slug</label>
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
                placeholder="Getting Started with Cursor IDE"
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Title (JP)</label>
              <input
                type="text"
                value={titleJp}
                onChange={(e) => setTitleJp(e.target.value)}
                placeholder="Cursor IDEの始め方"
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
              placeholder="Brief description for the content card..."
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
              placeholder="コンテンツカードの簡単な説明..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
            />
            <p className="text-xs text-fg-tertiary text-right mt-0.5">
              {descriptionJp.length}/500
            </p>
          </div>
        </div>

        {/* Section 2: Content */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
            Content
          </h3>

          {/* Content URL */}
          <div>
            <label className="block text-xs text-fg-tertiary mb-1">Content URL *</label>
            <input
              type="url"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or article URL"
              className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
            />
          </div>

          {/* Embed URL */}
          <div>
            <label className="block text-xs text-fg-tertiary mb-1">Embed URL</label>
            <input
              type="url"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://youtube.com/embed/..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
            />
          </div>

          {/* YouTube preview */}
          {ytId && (
            <div className="aspect-[16/9] rounded-lg overflow-hidden bg-bg-tertiary">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video preview"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Duration */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={durationMinutes || ''}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
              />
            </div>

            {/* Author Name */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Author Name</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Ryan Jackson"
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
            </div>

            {/* Publish Date */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Publish Date</label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
              />
            </div>
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-xs text-fg-tertiary mb-1">Thumbnail</label>
            {isCreate ? (
              <p className="text-xs text-fg-tertiary">
                Save the content first, then manage the thumbnail.
              </p>
            ) : (
              <p className="text-sm text-fg-secondary">
                {item.thumbnail_url ? item.thumbnail_url : 'No thumbnail'}
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Classification */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
            Classification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Content Type */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as VaultContentType)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as VaultDifficulty)}
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
                onChange={(e) => setLanguage(e.target.value as VaultLanguage)}
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
                onChange={(e) => setAccessTier(e.target.value as VaultAccessTier)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
              >
                {ACCESS_TIERS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
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

        {/* Section 4: Tags */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
            Tags
          </h3>

          {TAG_CATEGORIES.map((category) => {
            const categoryTags = tagsByCategory[category];
            if (!categoryTags || categoryTags.length === 0) return null;
            return (
              <div key={category}>
                <h4 className="text-xs font-medium text-fg-secondary mb-2 capitalize">
                  {category}
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {categoryTags.map((tag) => (
                    <label key={tag.slug} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag.slug)}
                        onChange={() => handleTagToggle(tag.slug)}
                        className="w-3.5 h-3.5 rounded border-border-default bg-bg-tertiary text-accent-teal focus:ring-accent-teal"
                      />
                      <span className="text-sm text-fg-primary">
                        {tag.name_en}
                        {tag.name_jp ? ` (${tag.name_jp})` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {tags.length === 0 && (
            <p className="text-xs text-fg-tertiary">No tags available. Create tags first.</p>
          )}
        </div>

        {/* Section 5: Relations */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
            Relations
          </h3>

          {/* Series */}
          <div>
            <label className="block text-xs text-fg-tertiary mb-1">Series</label>
            <select
              value={seriesId}
              onChange={(e) => setSeriesId(e.target.value)}
              className="w-full max-w-md px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
            >
              <option value="">None</option>
              {seriesOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Series Order (visible only when series selected) */}
          {seriesId && (
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Series Order</label>
              <input
                type="number"
                value={seriesOrder || ''}
                onChange={(e) => setSeriesOrder(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full max-w-xs px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
              />
            </div>
          )}

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

          {/* Related Items Picker */}
          <VaultRelatedPicker
            selectedIds={relatedItemIds}
            onChange={setRelatedItemIds}
            allItems={allItems}
            currentItemId={item?.id}
          />

          {/* Admin Notes */}
          <div>
            <label className="block text-xs text-fg-tertiary mb-1">Admin Notes</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes about this content..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
            />
          </div>
        </div>

        {/* Section 6: Freshness (edit mode only) */}
        {!isCreate && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
              Freshness
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Freshness Status */}
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">Freshness Status</label>
                <select
                  value={freshnessStatus}
                  onChange={(e) => setFreshnessStatus(e.target.value as VaultFreshnessStatus)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
                >
                  {FRESHNESS_STATUSES.map((fs) => (
                    <option key={fs} value={fs}>
                      {fs.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Last Reviewed */}
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">Last Reviewed</label>
                <p className="px-3 py-2 text-sm text-fg-secondary">
                  {item.freshness_reviewed_at
                    ? new Date(item.freshness_reviewed_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Never'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 7: Downloads (edit mode only) */}
        {!isCreate && item && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
              Downloads
            </h3>

            {/* Existing downloads */}
            {downloads.length > 0 ? (
              <div className="space-y-2">
                {downloads.map((dl) => (
                  <div
                    key={dl.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary border border-border-default"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-8 h-8 rounded bg-bg-secondary flex items-center justify-center">
                        <Download size={14} className="text-fg-tertiary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-fg-primary truncate">{dl.file_name}</p>
                        <p className="text-xs text-fg-tertiary">
                          {dl.file_type.toUpperCase()}
                          {dl.file_size_bytes
                            ? ` · ${dl.file_size_bytes < 1024 * 1024
                                ? `${(dl.file_size_bytes / 1024).toFixed(0)} KB`
                                : `${(dl.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                              }`
                            : ''}
                          {' · '}{dl.access_tier}
                          {' · Order: '}{dl.display_order}
                          {dl.download_count > 0 && ` · ${dl.download_count} downloads`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDownload(dl.id)}
                      className="shrink-0 p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-fg-tertiary">No downloads attached.</p>
            )}

            {/* Add download toggle */}
            {!showDownloadForm ? (
              <button
                type="button"
                onClick={() => setShowDownloadForm(true)}
                className="flex items-center gap-1.5 text-sm text-accent-teal hover:text-accent-teal/80 transition-colors"
              >
                <Plus size={14} />
                Add Download
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-lg bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-fg-primary">New Download</h4>
                  <button
                    type="button"
                    onClick={() => setShowDownloadForm(false)}
                    className="text-fg-tertiary hover:text-fg-primary transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-fg-tertiary mb-1">File Name *</label>
                    <input
                      type="text"
                      value={dlFileName}
                      onChange={(e) => setDlFileName(e.target.value)}
                      placeholder="cheatsheet.pdf"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-fg-tertiary mb-1">File URL *</label>
                    <input
                      type="url"
                      value={dlFileUrl}
                      onChange={(e) => setDlFileUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-fg-tertiary mb-1">File Type</label>
                    <select
                      value={dlFileType}
                      onChange={(e) => setDlFileType(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
                    >
                      {FILE_TYPES.map((ft) => (
                        <option key={ft} value={ft}>
                          {ft.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-fg-tertiary mb-1">Size (bytes)</label>
                    <input
                      type="number"
                      value={dlFileSizeBytes || ''}
                      onChange={(e) => setDlFileSizeBytes(parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-fg-tertiary mb-1">Access Tier</label>
                    <select
                      value={dlAccessTier}
                      onChange={(e) => setDlAccessTier(e.target.value as VaultAccessTier)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
                    >
                      {ACCESS_TIERS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-fg-tertiary mb-1">Display Order</label>
                    <input
                      type="number"
                      value={dlDisplayOrder || ''}
                      onChange={(e) => setDlDisplayOrder(parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-fg-tertiary mb-1">Description (EN)</label>
                    <input
                      type="text"
                      value={dlDescriptionEn}
                      onChange={(e) => setDlDescriptionEn(e.target.value)}
                      placeholder="Quick reference guide"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-fg-tertiary mb-1">Description (JP)</label>
                    <input
                      type="text"
                      value={dlDescriptionJp}
                      onChange={(e) => setDlDescriptionJp(e.target.value)}
                      placeholder="クイックリファレンス"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddDownload}
                  disabled={dlSaving || !dlFileName.trim() || !dlFileUrl.trim()}
                >
                  <Plus size={14} className="mr-1" />
                  {dlSaving ? 'Adding...' : 'Add Download'}
                </Button>
              </div>
            )}
          </div>
        )}

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
                ? 'Create Content'
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
    </div>
  );
}
