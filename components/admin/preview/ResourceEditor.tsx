'use client';

import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { ParsedResourceData } from '@/lib/courses/types';

type ResourceEditorProps = {
  resources: ParsedResourceData[];
  onChange: (resources: ParsedResourceData[]) => void;
};

function emptyResource(): ParsedResourceData {
  return {
    title_en: '',
    url: null,
    resource_type: 'article',
    description_en: null,
  };
}

export function ResourceEditor({ resources, onChange }: ResourceEditorProps) {
  function updateResource(index: number, partial: Partial<ParsedResourceData>) {
    const updated = resources.map((r, i) => (i === index ? { ...r, ...partial } : r));
    onChange(updated);
  }

  function addResource() {
    onChange([...resources, emptyResource()]);
  }

  function removeResource(index: number) {
    onChange(resources.filter((_, i) => i !== index));
  }

  if (resources.length === 0) {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-fg-tertiary uppercase tracking-wider">Resources</label>
        <button
          type="button"
          onClick={addResource}
          className="flex items-center gap-1.5 text-xs text-accent-teal hover:text-accent-teal-hover transition-colors"
        >
          <Plus size={14} /> Add Resource
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-fg-tertiary uppercase tracking-wider">Resources</label>
      {resources.map((resource, i) => (
        <div key={i} className="bg-bg-tertiary rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Select
              value={resource.resource_type || 'article'}
              onChange={(e) => updateResource(i, { resource_type: (e.target.value || null) as ParsedResourceData['resource_type'] })}
              options={[
                { value: 'article', label: 'Article' },
                { value: 'video', label: 'Video' },
                { value: 'tool', label: 'Tool' },
                { value: 'template', label: 'Template' },
                { value: 'download', label: 'Download' },
                { value: 'guide', label: 'Guide' },
              ]}
              className="!h-8 !text-xs !w-32"
            />
            <button
              type="button"
              onClick={() => removeResource(i)}
              className="text-fg-tertiary hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
          <Input
            value={resource.title_en}
            onChange={(e) => updateResource(i, { title_en: e.target.value })}
            placeholder="Resource title..."
            className="!h-9 !text-sm"
          />
          <Input
            value={resource.url || ''}
            onChange={(e) => updateResource(i, { url: e.target.value || null })}
            placeholder="URL (optional)..."
            className="!h-9 !text-sm"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addResource}
        className="flex items-center gap-1.5 text-xs text-accent-teal hover:text-accent-teal-hover transition-colors"
      >
        <Plus size={14} /> Add Resource
      </button>
    </div>
  );
}
