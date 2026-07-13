'use client';

import dynamic from 'next/dynamic';
import { Languages } from 'lucide-react';
import { AiImageUploader } from '../ai-image-uploader';
import { VaultPromptListEditor } from '../VaultPromptListEditor';
import { SectionCard } from './section-card';
import { hintClass, inputClass, labelClass, selectClass } from './field-classes';
import { getRegisteredToolKeys } from '@/lib/vault/tools/registry';
import type {
  VaultContentItem,
  VaultContentType,
  VaultPrompt,
} from '@/lib/vault/types';
import type { MachineField } from './machine-filled';
import '@uiw/react-md-editor/markdown-editor.css';

// MDEditor pulls in CodeMirror which can't SSR. Lazy on the client only.
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

const CONTENT_TYPES: VaultContentType[] = [
  'video',
  'workshop',
  'article',
  'template',
  'tool',
  'prompt_pack',
];

type ContentMediaSectionProps = {
  item: VaultContentItem | null;
  contentType: VaultContentType;
  setContentType: (v: VaultContentType) => void;
  urlRequired: boolean;
  contentUrl: string;
  setContentUrl: (v: string) => void;
  embedUrl: string;
  setEmbedUrl: (v: string) => void;
  ytId: string | null;
  durationMinutes: number;
  setDurationMinutes: (v: number) => void;
  authorName: string;
  setAuthorName: (v: string) => void;
  publishDate: string;
  setPublishDate: (v: string) => void;
  // Article
  bodyEn: string;
  setBodyEn: (v: string) => void;
  bodyJp: string;
  setBodyJp: (v: string) => void;
  machineFilled: Set<MachineField>;
  translating: boolean;
  onTranslateBody: () => void;
  // Workshop
  eventDate: string;
  setEventDate: (v: string) => void;
  presenterName: string;
  setPresenterName: (v: string) => void;
  eventSignupUrl: string;
  setEventSignupUrl: (v: string) => void;
  // Tool
  toolWidgetKey: string;
  setToolWidgetKey: (v: string) => void;
  toolWidgetConfigText: string;
  setToolWidgetConfigText: (v: string) => void;
  toolConfigError: string;
  // Prompt pack
  prompts: VaultPrompt[];
  // Image
  onImageUploaded: () => void;
  onImageRemove: () => Promise<void>;
};

export function ContentMediaSection({
  item,
  contentType,
  setContentType,
  urlRequired,
  contentUrl,
  setContentUrl,
  embedUrl,
  setEmbedUrl,
  ytId,
  durationMinutes,
  setDurationMinutes,
  authorName,
  setAuthorName,
  publishDate,
  setPublishDate,
  bodyEn,
  setBodyEn,
  bodyJp,
  setBodyJp,
  machineFilled,
  translating,
  onTranslateBody,
  eventDate,
  setEventDate,
  presenterName,
  setPresenterName,
  eventSignupUrl,
  setEventSignupUrl,
  toolWidgetKey,
  setToolWidgetKey,
  toolWidgetConfigText,
  setToolWidgetConfigText,
  toolConfigError,
  prompts,
  onImageUploaded,
  onImageRemove,
}: ContentMediaSectionProps) {
  const isCreate = item === null;

  return (
    <SectionCard id="content-media" number={2} title="Content &amp; media">
      {/* Content Type — lives here (not Classification) because it drives
          everything else in this card. */}
      <div>
        <label className={labelClass}>Content Type</label>
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value as VaultContentType)}
          className={`${selectClass} max-w-xs`}
        >
          {CONTENT_TYPES.map((ct) => (
            <option key={ct} value={ct}>
              {ct.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Article body (only for content_type='article') */}
      {contentType === 'article' && (
        <div className="space-y-4 rounded-lg border border-border-default bg-bg-primary/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-fg-tertiary">
              Markdown. Lives in the protected <code>vault_article_bodies</code>{' '}
              table — premium bodies are gated by subscription, not exposed via
              PostgREST. Reading time auto-computes on save.
            </p>
            <button
              type="button"
              onClick={onTranslateBody}
              disabled={translating || !bodyEn.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[color:var(--accent-teal)]/40 bg-[color:var(--accent-teal-subtle)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--accent-teal)] transition-colors hover:border-[color:var(--accent-teal)] disabled:opacity-50"
            >
              <Languages size={13} />
              {translating ? 'Translating…' : 'Translate body to JP'}
            </button>
          </div>

          <div data-color-mode="light">
            <label className={labelClass}>Body (EN)</label>
            <MDEditor
              value={bodyEn}
              onChange={(v) => setBodyEn(v ?? '')}
              height={400}
              preview="edit"
            />
          </div>

          <div data-color-mode="light">
            <label className={labelClass}>
              Body (JP)
              {machineFilled.has('body_jp') && (
                <span className="ml-2 text-[11px] font-semibold text-[color:var(--accent-gold)]">
                  machine translated
                </span>
              )}
            </label>
            <MDEditor
              value={bodyJp}
              onChange={(v) => setBodyJp(v ?? '')}
              height={400}
              preview="edit"
            />
          </div>
        </div>
      )}

      {/* Workshop details (only for content_type='workshop') */}
      {contentType === 'workshop' && (
        <div className="space-y-4 rounded-lg border border-border-default bg-bg-primary/40 p-4">
          <p className="text-xs text-fg-tertiary">
            The video URL below holds the recorded session. These fields capture
            the live event metadata — required to publish.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Event date &amp; time *</label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={inputClass}
              />
              <p className={hintClass}>
                Stored as UTC; shown to viewers in their local timezone.
              </p>
            </div>
            <div>
              <label className={labelClass}>Presenter name *</label>
              <input
                type="text"
                value={presenterName}
                onChange={(e) => setPresenterName(e.target.value)}
                placeholder="Ryan Jackson"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Live re-run signup URL</label>
            <input
              type="url"
              value={eventSignupUrl}
              onChange={(e) => setEventSignupUrl(e.target.value)}
              placeholder="https://cal.com/honuvibe/..."
              className={inputClass}
            />
            <p className={hintClass}>
              Optional. If set and the event date is in the future, the public
              page shows a &quot;Register for live session&quot; CTA.
            </p>
          </div>
        </div>
      )}

      {/* Tool widget (only for content_type='tool') */}
      {contentType === 'tool' &&
        (() => {
          const registeredKeys = getRegisteredToolKeys();
          return (
            <div className="space-y-4 rounded-lg border border-border-default bg-bg-primary/40 p-4">
              {registeredKeys.length === 0 ? (
                <p className="text-sm text-fg-tertiary">
                  No widgets registered yet. Tool entries can be saved as drafts
                  but cannot be published until at least one widget is
                  registered in <code>lib/vault/tools/registry.ts</code>.
                </p>
              ) : (
                <>
                  <div>
                    <label className={labelClass}>Widget key *</label>
                    <select
                      value={toolWidgetKey}
                      onChange={(e) => setToolWidgetKey(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">— Select a widget —</option>
                      {registeredKeys.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <p className={hintClass}>
                      Dropdown reads <code>toolWidgetRegistry</code>. Add new
                      widgets there to make them selectable.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Widget config (JSON, optional)
                    </label>
                    <textarea
                      value={toolWidgetConfigText}
                      onChange={(e) => setToolWidgetConfigText(e.target.value)}
                      rows={5}
                      placeholder='{ "defaultModel": "anthropic" }'
                      className={`${inputClass} resize-y font-mono`}
                    />
                    {toolConfigError ? (
                      <p className="mt-1 text-xs text-accent-coral">
                        {toolConfigError}
                      </p>
                    ) : (
                      <p className={hintClass}>
                        Passed to the widget as the <code>config</code> prop.
                        Must be a JSON object.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()}

      {/* Prompt pack (only for content_type='prompt_pack') */}
      {contentType === 'prompt_pack' &&
        (isCreate ? (
          <p className="text-sm text-fg-tertiary">
            Save the content first, then add prompts to the pack.
          </p>
        ) : (
          <div className="space-y-3 rounded-lg border border-border-default bg-bg-primary/40 p-4">
            <p className="text-xs text-fg-tertiary">
              Each prompt becomes a copy-able card on the subscriber side.
              Premium packs are gated by RLS via <code>vault_prompts</code> —
              free packs are public, premium packs require Vault access.
            </p>
            <VaultPromptListEditor contentItemId={item.id} prompts={prompts} />
          </div>
        ))}

      {/* Content URL */}
      <div>
        <label className={labelClass}>
          Content URL{urlRequired ? ' *' : ' (optional for in-app types)'}
        </label>
        <input
          type="url"
          value={contentUrl}
          onChange={(e) => setContentUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=... or article URL"
          className={inputClass}
        />
      </div>

      {/* Embed URL */}
      <div>
        <label className={labelClass}>Embed URL</label>
        <input
          type="url"
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          placeholder="https://youtube.com/embed/..."
          className={inputClass}
        />
      </div>

      {/* YouTube preview */}
      {ytId && (
        <div className="aspect-[16/9] overflow-hidden rounded-lg bg-bg-tertiary">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video preview"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Duration (minutes)</label>
          <input
            type="number"
            value={durationMinutes || ''}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
            min={0}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Author Name</label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Ryan Jackson"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Publish Date</label>
          <input
            type="date"
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Thumbnail / card image */}
      <div>
        <label className={labelClass}>Card Image (16:9)</label>
        {item ? (
          // Cap the preview near the real card width so it doesn't dominate
          // the editor — the stored image (1536x864) is unchanged.
          <div className="max-w-md">
            <AiImageUploader
              entityId={item.id}
              idField="itemId"
              imageType="thumbnail"
              currentUrl={item.thumbnail_url}
              generateEndpoint="/api/admin/vault/generate-image"
              uploadEndpoint="/api/admin/vault/upload-image"
              aspectClass="aspect-[16/9]"
              maxSizeBytes={2 * 1024 * 1024}
              onUploadComplete={onImageUploaded}
              onRemove={onImageRemove}
            />
          </div>
        ) : (
          <p className="text-xs text-fg-tertiary">
            Save the content first, then manage the card image.
          </p>
        )}
      </div>

      {contentType === 'template' && isCreate && (
        <p className="text-xs text-fg-tertiary">
          Templates need at least one downloadable file to publish — attach
          files in step 5 after saving.
        </p>
      )}
    </SectionCard>
  );
}
