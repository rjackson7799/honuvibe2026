'use client';

import { Wrench } from 'lucide-react';
import { toolWidgetRegistry } from '@/lib/vault/tools/registry';
import type { VaultContentItem, VaultAccessTier } from '@/lib/vault/types';

type VaultToolRendererProps = {
  item: VaultContentItem;
  userTier: VaultAccessTier;
};

/**
 * Renders the interactive widget for a content_type='tool' item.
 *
 * Looks up `tool_widget_key` in the central registry. If the key is unset
 * or the widget hasn't been registered (registry mismatch — usually means
 * an old key whose component was removed), shows a graceful placeholder
 * instead of crashing.
 *
 * Publish-time validation (publishVaultItem) prevents a Tool item from
 * going live without a registered key, so users should only see the
 * placeholder in admin preview / unpublished-draft contexts.
 */
export function VaultToolRenderer({ item, userTier }: VaultToolRendererProps) {
  const key = item.tool_widget_key;

  if (!key) {
    return <ToolPlaceholder message="No widget selected for this tool yet." />;
  }

  const Widget = toolWidgetRegistry[key];
  if (!Widget) {
    return (
      <ToolPlaceholder
        message={`Widget "${key}" isn't registered. The component may have been removed — pick a different widget in the admin.`}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <Widget
        contentItem={item}
        config={item.tool_widget_config ?? null}
        userTier={userTier}
      />
    </div>
  );
}

function ToolPlaceholder({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-default p-6 text-center text-fg-tertiary text-sm flex flex-col items-center gap-2">
      <Wrench size={20} className="text-fg-muted" />
      <p>{message}</p>
    </div>
  );
}
