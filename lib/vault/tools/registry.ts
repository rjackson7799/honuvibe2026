/**
 * Tool widget registry.
 *
 * Maps a `tool_widget_key` (stored on content_items) to a React component
 * that renders inside the public Vault tool page. Adding a new widget is
 * intentionally a code change — Ryan controls what executes inside the
 * vault. The admin form's widget picker reads this registry directly so
 * the dropdown stays in sync.
 *
 * Phase 1 ships ZERO widgets. The publishVaultItem gate (see lib/vault/
 * actions.ts) blocks publishing a Tool item until a registered key is
 * selected — so the empty registry is a feature, not a bug.
 *
 * To add a widget:
 *   1. Build the component under components/vault/tools/<Name>.tsx
 *      following the ToolWidgetProps contract.
 *   2. Register it below with a stable kebab-case key.
 *   3. The admin picker will pick it up automatically.
 */

import type { ComponentType } from 'react';
import type { VaultContentItem, VaultAccessTier } from '@/lib/vault/types';

export type ToolWidgetProps = {
  contentItem: VaultContentItem;
  config: Record<string, unknown> | null;
  userTier: VaultAccessTier;
};

export const toolWidgetRegistry: Record<string, ComponentType<ToolWidgetProps>> = {
  // 'prompt-builder': dynamic(() => import('@/components/vault/tools/PromptBuilder')),
  // 'jp-en-translator': dynamic(() => import('@/components/vault/tools/JpEnTranslator')),
  // 'ai-cost-calculator': dynamic(() => import('@/components/vault/tools/AiCostCalculator')),
};

export function getRegisteredToolKeys(): string[] {
  return Object.keys(toolWidgetRegistry);
}

export function isRegisteredToolWidget(key: string | null | undefined): boolean {
  return typeof key === 'string' && key in toolWidgetRegistry;
}
