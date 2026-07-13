'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createVaultItem,
  updateVaultItem,
  publishVaultItem,
  unpublishVaultItem,
  deleteVaultItem,
} from '@/lib/vault/actions';
import { getRequiredChecks } from '@/lib/vault/editor-progress';
import type { VaultTranslationResult } from '@/lib/vault/translate';
import type {
  VaultContentItem,
  VaultTag,
  VaultDownload,
  VaultArticleBody,
  VaultPrompt,
  VaultContentType,
  VaultDifficulty,
  VaultAccessTier,
  VaultLanguage,
  VaultFreshnessStatus,
} from '@/lib/vault/types';
import { VaultEditorHeader } from './vault-editor-header';
import { VaultEditorNav, type EditorStep } from './vault-editor-nav';
import { useScrollSpy } from './use-scroll-spy';
import { CoreInfoSection } from './core-info-section';
import { ContentMediaSection } from './content-media-section';
import { ClassificationSection } from './classification-section';
import { TagsSection } from './tags-section';
import { RelationsPublishSection } from './relations-publish-section';
import type { MachineField } from './machine-filled';

type PartnerOpt = {
  id: string;
  slug: string;
  name_en: string;
  logo_url: string | null;
  revenue_share_pct: number;
};

type VaultEditorProps = {
  item: VaultContentItem | null;
  tags: VaultTag[];
  seriesOptions: { id: string; title: string; partner_id: string | null }[];
  courseOptions: { id: string; title: string }[];
  downloads?: VaultDownload[];
  articleBody?: VaultArticleBody | null;
  prompts?: VaultPrompt[];
  allItems?: { id: string; title_en: string; title_jp: string | null; content_type: string }[];
  partners?: PartnerOpt[];
};

const STEPS = [
  { id: 'core-info', label: 'Core info' },
  { id: 'content-media', label: 'Content & media' },
  { id: 'classification', label: 'Classification' },
  { id: 'tags', label: 'Tags' },
  { id: 'relations-publish', label: 'Relations & publish' },
] as const;

const STEP_IDS = STEPS.map((s) => s.id);

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

/**
 * Convert a Postgres timestamptz ISO string ("2026-08-15T18:30:00+00:00")
 * into the HTML datetime-local format ("YYYY-MM-DDTHH:mm") in the user's
 * local timezone so the admin sees the time they expect.
 */
function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VaultEditor({
  item,
  tags,
  seriesOptions,
  courseOptions,
  downloads = [],
  articleBody = null,
  prompts = [],
  allItems = [],
  partners = [],
}: VaultEditorProps) {
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
    item?.content_type ?? 'video',
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
  const [bodyEn, setBodyEn] = useState(articleBody?.body_en ?? '');
  const [bodyJp, setBodyJp] = useState(articleBody?.body_jp ?? '');
  // Workshop-only fields — `event_date` is timestamptz in Postgres; we use
  // datetime-local input here (YYYY-MM-DDTHH:mm) and ISO-string it on save.
  const [eventDate, setEventDate] = useState(
    item?.event_date ? toDateTimeLocal(item.event_date) : '',
  );
  const [presenterName, setPresenterName] = useState(item?.presenter_name ?? '');
  const [eventSignupUrl, setEventSignupUrl] = useState(item?.event_signup_url ?? '');
  // Tool-only — widget key + JSON config. The config field stores raw JSON
  // text in the input; we parse + validate on save.
  const [toolWidgetKey, setToolWidgetKey] = useState(item?.tool_widget_key ?? '');
  const [toolWidgetConfigText, setToolWidgetConfigText] = useState(
    item?.tool_widget_config ? JSON.stringify(item.tool_widget_config, null, 2) : '',
  );
  const [toolConfigError, setToolConfigError] = useState('');
  const [freshnessStatus, setFreshnessStatus] = useState<VaultFreshnessStatus>(
    item?.freshness_status ?? 'current',
  );

  // Partner state — default to item's own partner_id, then fall back to the
  // parent series partner_id (if the item already belongs to a series).
  const seriesPartnerDefault =
    item?.series_id
      ? (seriesOptions.find((s) => s.id === item.series_id)?.partner_id ?? null)
      : null;
  const [partnerId, setPartnerId] = useState<string | null>(
    item?.partner_id ?? seriesPartnerDefault,
  );

  // Translate assist — session-local review state. Editing a machine-filled
  // JP field clears its tag (human touched it = reviewed).
  const [translating, setTranslating] = useState(false);
  const [assistError, setAssistError] = useState('');
  const [machineFilled, setMachineFilled] = useState<Set<MachineField>>(new Set());

  function clearMachineTag(field: MachineField) {
    setMachineFilled((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

  // Video/Workshop need a URL; in-app types (article/tool/prompt_pack) don't.
  // Templates also don't need a URL on content_items (they have downloads).
  const urlRequired = contentType === 'video' || contentType === 'workshop';
  const canSave = !!titleEn.trim() && (!urlRequired || !!contentUrl.trim());

  const requiredChecks = getRequiredChecks({
    contentType,
    titleEn,
    slug,
    url: contentUrl,
    bodyEn,
    toolWidgetKey,
  });
  const checkDone = (key: string) =>
    requiredChecks.find((c) => c.key === key)?.done ?? false;
  const typeCheck = requiredChecks[2]; // url / body / widget, when the type has one
  const steps: EditorStep[] = STEPS.map((s) => ({
    ...s,
    complete:
      s.id === 'core-info'
        ? checkDone('title') && checkDone('slug')
        : s.id === 'content-media'
          ? (typeCheck?.done ?? false)
          : false,
  }));

  const { activeId, scrollTo } = useScrollSpy(STEP_IDS);

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

  async function requestTranslation(payload: {
    title_en: string | null;
    description_en: string | null;
    body_en: string | null;
  }): Promise<VaultTranslationResult | null> {
    setTranslating(true);
    setAssistError('');
    try {
      const res = await fetch('/api/admin/vault/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAssistError(data.error ?? 'Translate assist failed.');
        return null;
      }
      return data as VaultTranslationResult;
    } catch {
      setAssistError('Translate assist failed.');
      return null;
    } finally {
      setTranslating(false);
    }
  }

  async function handleTranslateCore() {
    if (
      (titleJp.trim() || descriptionJp.trim()) &&
      !window.confirm(
        'Translating will replace the current Japanese title/description. Continue?',
      )
    ) {
      return;
    }
    const jp = await requestTranslation({
      title_en: titleEn.trim(),
      description_en: descriptionEn.trim() || null,
      body_en: null,
    });
    if (!jp) return;
    const filled: MachineField[] = [];
    if (jp.title_jp) {
      setTitleJp(jp.title_jp);
      filled.push('title_jp');
    }
    if (jp.description_jp) {
      setDescriptionJp(jp.description_jp);
      filled.push('description_jp');
    }
    setMachineFilled((prev) => new Set([...prev, ...filled]));
  }

  async function handleTranslateBody() {
    if (
      bodyJp.trim() &&
      !window.confirm(
        'Translating will replace the current Japanese article body. Continue?',
      )
    ) {
      return;
    }
    const jp = await requestTranslation({
      title_en: null,
      description_en: null,
      body_en: bodyEn,
    });
    if (!jp?.body_jp) return;
    setBodyJp(jp.body_jp);
    setMachineFilled((prev) => new Set([...prev, 'body_jp']));
  }

  /**
   * Both create buttons save an unpublished draft; they differ only in
   * navigation intent. 'draft' = keep authoring in place (replace, so Back
   * skips the dead /new entry); 'create' = the record now exists (push to
   * the canonical edit URL, ready to publish).
   */
  async function handleSave(mode: 'draft' | 'create' | 'update') {
    setSaving(true);
    setSaveMessage('');
    setToolConfigError('');
    // Tool config: validate JSON before sending.
    let parsedToolConfig: Record<string, unknown> | undefined;
    if (contentType === 'tool' && toolWidgetConfigText.trim()) {
      try {
        const parsed = JSON.parse(toolWidgetConfigText);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('Config must be a JSON object');
        }
        parsedToolConfig = parsed as Record<string, unknown>;
      } catch (err) {
        setToolConfigError(err instanceof Error ? err.message : 'Invalid JSON');
        setSaving(false);
        return;
      }
    }
    try {
      const formData = {
        title_en: titleEn.trim(),
        title_jp: titleJp.trim() || undefined,
        slug: slug.trim() || undefined,
        description_en: descriptionEn.trim() || undefined,
        description_jp: descriptionJp.trim() || undefined,
        content_type: contentType,
        url: contentUrl.trim() || undefined,
        embed_url: embedUrl.trim() || undefined,
        duration_minutes: durationMinutes || undefined,
        author_name: authorName.trim() || undefined,
        publish_date: publishDate || undefined,
        difficulty_level: difficulty,
        language,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        access_tier: accessTier,
        source_course_id: relatedCourseId || undefined,
        partner_id: partnerId,
        related_item_ids: relatedItemIds.length > 0 ? relatedItemIds : undefined,
        admin_notes: adminNotes.trim() || undefined,
        series_id: seriesId || undefined,
        series_order: seriesOrder || undefined,
        is_featured: isFeatured,
        ...(!isCreate ? { freshness_status: freshnessStatus } : {}),
        ...(contentType === 'article'
          ? { article_body_en: bodyEn, article_body_jp: bodyJp }
          : {}),
        ...(contentType === 'workshop'
          ? {
              event_date: eventDate ? new Date(eventDate).toISOString() : undefined,
              presenter_name: presenterName.trim() || undefined,
              event_signup_url: eventSignupUrl.trim() || undefined,
            }
          : {}),
        ...(contentType === 'tool'
          ? {
              tool_widget_key: toolWidgetKey.trim() || undefined,
              tool_widget_config: parsedToolConfig,
            }
          : {}),
      };

      if (isCreate) {
        const { id } = await createVaultItem(formData);
        if (mode === 'draft') {
          router.replace(`/admin/vault/${id}`);
        } else {
          router.push(`/admin/vault/${id}`);
        }
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

  const ytId = contentUrl ? extractYouTubeId(contentUrl) : null;

  return (
    <div className="max-w-[1200px]">
      <VaultEditorHeader
        isCreate={isCreate}
        title={isCreate ? 'New Content' : item.title_en}
        isPublished={item?.is_published ?? false}
        saving={saving}
        actionLoading={actionLoading}
        canSave={canSave}
        saveMessage={saveMessage}
        onBack={() => router.push('/admin/vault')}
        onSaveDraft={() => handleSave('draft')}
        onCreate={() => handleSave('create')}
        onSaveChanges={() => handleSave('update')}
        onPublishToggle={handlePublishToggle}
      />

      {assistError && (
        <div className="mt-4 rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {assistError}
        </div>
      )}

      <div className="items-start pt-6 lg:grid lg:grid-cols-[232px,minmax(0,1fr)] lg:gap-8">
        <VaultEditorNav
          className="sticky top-[104px] hidden lg:block"
          steps={steps}
          activeId={activeId}
          checks={requiredChecks}
          onNavigate={scrollTo}
        />

        <div className="max-w-[880px] space-y-5">
          <CoreInfoSection
            slug={slug}
            setSlug={setSlug}
            titleEn={titleEn}
            setTitleEn={setTitleEn}
            onTitleBlur={handleTitleBlur}
            titleJp={titleJp}
            setTitleJp={(v) => {
              setTitleJp(v);
              clearMachineTag('title_jp');
            }}
            descriptionEn={descriptionEn}
            setDescriptionEn={setDescriptionEn}
            descriptionJp={descriptionJp}
            setDescriptionJp={(v) => {
              setDescriptionJp(v);
              clearMachineTag('description_jp');
            }}
            machineFilled={machineFilled}
            translating={translating}
            canTranslate={!!titleEn.trim()}
            onTranslate={handleTranslateCore}
          />

          <ContentMediaSection
            item={item}
            contentType={contentType}
            setContentType={setContentType}
            urlRequired={urlRequired}
            contentUrl={contentUrl}
            setContentUrl={setContentUrl}
            embedUrl={embedUrl}
            setEmbedUrl={setEmbedUrl}
            ytId={ytId}
            durationMinutes={durationMinutes}
            setDurationMinutes={setDurationMinutes}
            authorName={authorName}
            setAuthorName={setAuthorName}
            publishDate={publishDate}
            setPublishDate={setPublishDate}
            bodyEn={bodyEn}
            setBodyEn={setBodyEn}
            bodyJp={bodyJp}
            setBodyJp={(v) => {
              setBodyJp(v);
              clearMachineTag('body_jp');
            }}
            machineFilled={machineFilled}
            translating={translating}
            onTranslateBody={handleTranslateBody}
            eventDate={eventDate}
            setEventDate={setEventDate}
            presenterName={presenterName}
            setPresenterName={setPresenterName}
            eventSignupUrl={eventSignupUrl}
            setEventSignupUrl={setEventSignupUrl}
            toolWidgetKey={toolWidgetKey}
            setToolWidgetKey={setToolWidgetKey}
            toolWidgetConfigText={toolWidgetConfigText}
            setToolWidgetConfigText={setToolWidgetConfigText}
            toolConfigError={toolConfigError}
            prompts={prompts}
            onImageUploaded={() => router.refresh()}
            onImageRemove={async () => {
              if (!item) return;
              await updateVaultItem(item.id, { thumbnail_url: null });
              router.refresh();
            }}
          />

          <ClassificationSection
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            language={language}
            setLanguage={setLanguage}
            accessTier={accessTier}
            setAccessTier={setAccessTier}
            isFeatured={isFeatured}
            setIsFeatured={setIsFeatured}
          />

          <TagsSection
            tags={tags}
            selectedTags={selectedTags}
            onToggle={handleTagToggle}
          />

          <RelationsPublishSection
            item={item}
            seriesOptions={seriesOptions}
            seriesId={seriesId}
            setSeriesId={setSeriesId}
            seriesOrder={seriesOrder}
            setSeriesOrder={setSeriesOrder}
            courseOptions={courseOptions}
            relatedCourseId={relatedCourseId}
            setRelatedCourseId={setRelatedCourseId}
            allItems={allItems}
            relatedItemIds={relatedItemIds}
            setRelatedItemIds={setRelatedItemIds}
            adminNotes={adminNotes}
            setAdminNotes={setAdminNotes}
            partners={partners}
            partnerId={partnerId}
            setPartnerId={setPartnerId}
            freshnessStatus={freshnessStatus}
            setFreshnessStatus={setFreshnessStatus}
            downloads={downloads}
            actionLoading={actionLoading}
            onPublishToggle={handlePublishToggle}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
