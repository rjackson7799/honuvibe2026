'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Eye, EyeOff, Plus, X, GripVertical, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import {
  createVaultSeries,
  updateVaultSeries,
  deleteVaultSeries,
  reorderSeriesItems,
} from '@/lib/vault/actions';
import type {
  VaultSeries,
  VaultContentItem,
  VaultTag,
  VaultDifficulty,
} from '@/lib/vault/types';

type AdminVaultSeriesDetailProps = {
  series: VaultSeries | null;
  tags: VaultTag[];
  allItems: VaultContentItem[];
  seriesItems: VaultContentItem[];
};

const DIFFICULTIES: VaultDifficulty[] = ['beginner', 'intermediate', 'advanced'];
const TAG_CATEGORIES = ['topic', 'tool', 'skill', 'industry', 'format'] as const;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function AdminVaultSeriesDetail({
  series,
  tags,
  allItems,
  seriesItems: initialSeriesItems,
}: AdminVaultSeriesDetailProps) {
  const router = useRouter();
  const isCreate = series === null;

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [slug, setSlug] = useState(series?.slug ?? '');
  const [titleEn, setTitleEn] = useState(series?.title_en ?? '');
  const [titleJp, setTitleJp] = useState(series?.title_jp ?? '');
  const [descriptionEn, setDescriptionEn] = useState(series?.description_en ?? '');
  const [descriptionJp, setDescriptionJp] = useState(series?.description_jp ?? '');
  const [thumbnailUrl, setThumbnailUrl] = useState(series?.thumbnail_url ?? '');
  const [difficulty, setDifficulty] = useState<VaultDifficulty>(
    series?.difficulty_level ?? 'beginner',
  );
  const [isFeatured, setIsFeatured] = useState(series?.is_featured ?? false);
  const [selectedTags, setSelectedTags] = useState<string[]>(series?.tags ?? []);

  // Item management
  const [orderedItems, setOrderedItems] = useState<VaultContentItem[]>(initialSeriesItems);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const canSave = titleEn.trim();

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

  // Drag handlers
  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const items = [...orderedItems];
    const dragged = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, dragged);

    dragItem.current = null;
    dragOverItem.current = null;

    setOrderedItems(items);
    setOrderDirty(true);
  }

  function handleRemoveItem(itemId: string) {
    setOrderedItems((prev) => prev.filter((i) => i.id !== itemId));
    setOrderDirty(true);
  }

  function handleAddItem(item: VaultContentItem) {
    setOrderedItems((prev) => [...prev, item]);
    setItemSearch('');
    setShowItemPicker(false);
    setOrderDirty(true);
  }

  async function handleSaveOrder() {
    if (!series) return;
    setOrderSaving(true);
    try {
      await reorderSeriesItems(
        series.id,
        orderedItems.map((i) => i.id),
      );
      setOrderDirty(false);
      setSaveMessage('Order saved');
      router.refresh();
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save order');
    } finally {
      setOrderSaving(false);
    }
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
        thumbnail_url: thumbnailUrl.trim() || undefined,
        difficulty_level: difficulty,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        is_featured: isFeatured,
      };

      if (isCreate) {
        const { id } = await createVaultSeries(formData);
        router.push(`/admin/vault/series/${id}`);
      } else {
        await updateVaultSeries(series.id, formData);
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
    if (!series) return;
    setActionLoading(true);
    try {
      await updateVaultSeries(series.id, { is_published: !series.is_published });
      router.refresh();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!series) return;
    if (!confirm('Are you sure you want to delete this series? Items will be unlinked, not deleted.')) {
      return;
    }
    setActionLoading(true);
    try {
      await deleteVaultSeries(series.id);
      router.push('/admin/vault/series');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Delete failed');
      setActionLoading(false);
    }
  }

  // Filtered items for picker (exclude already assigned)
  const assignedIds = new Set(orderedItems.map((i) => i.id));
  const availableItems = allItems
    .filter((i) => !assignedIds.has(i.id))
    .filter(
      (i) =>
        !itemSearch ||
        i.title_en.toLowerCase().includes(itemSearch.toLowerCase()) ||
        (i.title_jp && i.title_jp.toLowerCase().includes(itemSearch.toLowerCase())),
    )
    .slice(0, 20);

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
        onClick={() => router.push('/admin/vault/series')}
        className="flex items-center gap-1 text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Series
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-serif text-fg-primary">
            {isCreate ? 'New Series' : series.title_en}
          </h1>
          {!isCreate && (
            <StatusBadge status={series.is_published ? 'published' : 'draft'} />
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
              {series.is_published ? (
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Title (EN) *</label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="AI Fundamentals Series"
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Title (JP)</label>
              <input
                type="text"
                value={titleJp}
                onChange={(e) => setTitleJp(e.target.value)}
                placeholder="AI基礎シリーズ"
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-fg-tertiary mb-1">Description (EN)</label>
            <textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="What this series covers..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-fg-tertiary mb-1">Description (JP)</label>
            <textarea
              value={descriptionJp}
              onChange={(e) => setDescriptionJp(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="シリーズの説明..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-fg-tertiary mb-1">Thumbnail URL</label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
            />
          </div>
        </div>

        {/* Section 2: Classification */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
            Classification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

          {/* Tags */}
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
        </div>

        {/* Section 3: Items (edit mode only) */}
        {!isCreate && series && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
                Items ({orderedItems.length})
              </h3>
              {orderDirty && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveOrder}
                  disabled={orderSaving}
                >
                  <Save size={14} className="mr-1" />
                  {orderSaving ? 'Saving...' : 'Save Order'}
                </Button>
              )}
            </div>

            {/* Ordered item list with drag-to-reorder */}
            {orderedItems.length > 0 ? (
              <div className="space-y-1">
                {orderedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-tertiary border border-border-default hover:border-border-hover transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical size={14} className="shrink-0 text-fg-tertiary" />
                    <span className="shrink-0 w-6 text-center text-xs font-medium text-fg-tertiary">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg-primary truncate">{item.title_en}</p>
                      <p className="text-xs text-fg-tertiary">
                        {item.content_type.replace(/_/g, ' ')}
                        {item.duration_minutes ? ` · ${item.duration_minutes} min` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="shrink-0 p-1 rounded text-fg-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-fg-tertiary py-4 text-center">
                No items assigned. Use the picker below to add items.
              </p>
            )}

            {/* Add item picker */}
            {!showItemPicker ? (
              <button
                type="button"
                onClick={() => setShowItemPicker(true)}
                className="flex items-center gap-1.5 text-sm text-accent-teal hover:text-accent-teal/80 transition-colors"
              >
                <Plus size={14} />
                Add Item
              </button>
            ) : (
              <div className="space-y-2 p-3 rounded-lg bg-bg-tertiary border border-border-default">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Search content items..."
                      autoFocus
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowItemPicker(false);
                      setItemSearch('');
                    }}
                    className="text-fg-tertiary hover:text-fg-primary transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {availableItems.length === 0 ? (
                    <p className="text-xs text-fg-tertiary py-2 text-center">
                      {itemSearch ? 'No matching items.' : 'All items are assigned.'}
                    </p>
                  ) : (
                    availableItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAddItem(item)}
                        className="w-full flex items-center gap-3 p-2 rounded text-left hover:bg-bg-secondary transition-colors"
                      >
                        <Plus size={12} className="shrink-0 text-accent-teal" />
                        <div className="min-w-0">
                          <p className="text-sm text-fg-primary truncate">{item.title_en}</p>
                          <p className="text-xs text-fg-tertiary">
                            {item.content_type.replace(/_/g, ' ')}
                            {item.duration_minutes ? ` · ${item.duration_minutes} min` : ''}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
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
                ? 'Create Series'
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
