// Vault content editor — required-fields progress meter. Purely informational:
// mirrors the per-type publish gate in lib/vault/actions.ts (publishVaultItem)
// for the fields that exist pre-save. It does NOT gate saving — the editor's
// canSave logic is unchanged. Downloads/prompts (template/prompt_pack) can only
// be attached after the item exists, so they are deliberately excluded.

import type { VaultContentType } from '@/lib/vault/types';

export interface RequiredCheck {
  key: string;
  label: string;
  done: boolean;
}

export interface EditorProgressInput {
  contentType: VaultContentType;
  titleEn: string;
  slug: string;
  url: string;
  bodyEn: string;
  toolWidgetKey: string;
}

export function getRequiredChecks(input: EditorProgressInput): RequiredCheck[] {
  const checks: RequiredCheck[] = [
    { key: 'title', label: 'Title (EN)', done: input.titleEn.trim() !== '' },
    { key: 'slug', label: 'Slug', done: input.slug.trim() !== '' },
  ];

  switch (input.contentType) {
    case 'video':
    case 'workshop':
      checks.push({
        key: 'url',
        label: 'Content URL',
        done: input.url.trim() !== '',
      });
      break;
    case 'article':
      checks.push({
        key: 'body',
        label: 'Body (EN)',
        done: input.bodyEn.trim() !== '',
      });
      break;
    case 'tool':
      checks.push({
        key: 'widget',
        label: 'Widget key',
        done: input.toolWidgetKey.trim() !== '',
      });
      break;
    // template / prompt_pack: attachments live in child tables, post-save.
  }

  return checks;
}
