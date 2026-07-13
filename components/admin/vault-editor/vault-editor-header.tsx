'use client';

import { ArrowLeft, Eye, EyeOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '../StatusBadge';

type VaultEditorHeaderProps = {
  isCreate: boolean;
  title: string;
  isPublished: boolean;
  saving: boolean;
  actionLoading: boolean;
  canSave: boolean;
  saveMessage: string;
  onBack: () => void;
  onSaveDraft: () => void;
  onCreate: () => void;
  onSaveChanges: () => void;
  onPublishToggle: () => void;
};

/**
 * Sticky action bar. Create mode: Save draft (stay in editor) + Create
 * Content (go to edit view) — both save an unpublished draft. Edit mode:
 * Save changes + Publish/Unpublish. Delete lives in the step-5 danger zone.
 */
export function VaultEditorHeader({
  isCreate,
  title,
  isPublished,
  saving,
  actionLoading,
  canSave,
  saveMessage,
  onBack,
  onSaveDraft,
  onCreate,
  onSaveChanges,
  onPublishToggle,
}: VaultEditorHeaderProps) {
  const isError =
    saveMessage.includes('fail') || saveMessage.includes('Failed');

  return (
    <header className="sticky top-0 z-20 border-b border-border-default bg-bg-primary/95 pb-3 pt-2 backdrop-blur">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-fg-tertiary transition-colors hover:text-fg-primary"
      >
        <ArrowLeft size={16} />
        Back to Vault
      </button>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate font-serif text-2xl text-fg-primary">
            {title}
          </h1>
          {isCreate ? (
            <span className="shrink-0 text-xs text-fg-tertiary">
              Draft · not saved
            </span>
          ) : (
            <StatusBadge status={isPublished ? 'published' : 'draft'} />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {saveMessage && (
            <span
              className={`text-sm ${isError ? 'text-red-400' : 'text-accent-teal'}`}
            >
              {saveMessage}
            </span>
          )}
          {isCreate ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSaveDraft}
                disabled={saving || !canSave}
              >
                {saving ? 'Saving…' : 'Save draft'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onCreate}
                disabled={saving || !canSave}
              >
                <Save size={16} className="mr-1.5" />
                Create Content
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onPublishToggle}
                disabled={actionLoading}
              >
                {isPublished ? (
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
                variant="primary"
                size="sm"
                onClick={onSaveChanges}
                disabled={saving || !canSave}
              >
                <Save size={16} className="mr-1.5" />
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
