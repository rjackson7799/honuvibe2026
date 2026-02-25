'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ImageIcon, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LibraryThumbnailUploaderProps = {
  videoId: string;
  currentUrl: string | null;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export function LibraryThumbnailUploader({
  videoId,
  currentUrl,
  onUploadComplete,
  onRemove,
}: LibraryThumbnailUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const displayUrl = preview || currentUrl;

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'File must be JPEG, PNG, WebP, or AVIF';
    }
    if (file.size > MAX_SIZE) {
      return 'File exceeds 2MB limit';
    }
    return null;
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError('');
      setUploading(true);

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('videoId', videoId);

        const res = await fetch('/api/admin/library/upload-thumbnail', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        URL.revokeObjectURL(objectUrl);
        setPreview(null);
        onUploadComplete(data.url);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [videoId, validateFile, onUploadComplete],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      {displayUrl ? (
        <div className="relative w-full max-w-sm aspect-[16/9] rounded-lg overflow-hidden bg-bg-tertiary group">
          <img
            src={displayUrl}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />

          {uploading && (
            <div className="absolute inset-0 bg-bg-primary/60 flex items-center justify-center">
              <Loader2 size={24} className="text-accent-teal animate-spin" />
            </div>
          )}

          {!uploading && (
            <div className="absolute inset-0 bg-bg-primary/0 hover:bg-bg-primary/50 transition-colors flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-bg-secondary/80 !p-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <RefreshCw size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-bg-secondary/80 !p-1.5 text-red-400 hover:text-red-300"
                onClick={onRemove}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'w-full max-w-sm aspect-[16/9] rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors cursor-pointer',
            dragOver
              ? 'border-accent-teal bg-accent-teal/5'
              : 'border-border-default hover:border-border-hover',
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 size={24} className="text-accent-teal animate-spin" />
          ) : (
            <>
              <ImageIcon size={24} className="text-fg-tertiary mb-1" />
              <span className="text-xs text-fg-tertiary">
                Drag & drop or click to upload
              </span>
              <span className="text-xs text-fg-tertiary mt-0.5">
                JPEG, PNG, WebP, AVIF · max 2MB
              </span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
