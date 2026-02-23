'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, ImageIcon, RefreshCw, Trash2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CourseImageUploaderProps = {
  courseId: string;
  imageType: 'thumbnail' | 'hero';
  currentUrl: string | null;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = {
  thumbnail: 2 * 1024 * 1024,
  hero: 5 * 1024 * 1024,
};

export function CourseImageUploader({
  courseId,
  imageType,
  currentUrl,
  onUploadComplete,
  onRemove,
}: CourseImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const maxMB = MAX_SIZE[imageType] / (1024 * 1024);
  const aspectClass = imageType === 'thumbnail' ? 'aspect-[16/9]' : 'aspect-[21/9]';
  const displayUrl = preview || currentUrl;

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return 'File must be JPEG, PNG, WebP, or AVIF';
      }
      if (file.size > MAX_SIZE[imageType]) {
        return `File exceeds ${maxMB}MB limit`;
      }
      return null;
    },
    [imageType, maxMB],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError('');
      setUploading(true);

      // Show local preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseId', courseId);
        formData.append('imageType', imageType);

        const res = await fetch('/api/admin/courses/upload-image', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        // Clear local preview since we now have a real URL
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
    [courseId, imageType, validateFile, onUploadComplete],
  );

  const generateImage = useCallback(async () => {
    setError('');
    setGenerating(true);

    try {
      const res = await fetch('/api/admin/courses/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, imageType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      onUploadComplete(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [courseId, imageType, onUploadComplete]);

  const busy = uploading || generating;

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      {displayUrl ? (
        /* Image preview with overlay actions */
        <div className={cn('relative rounded-lg overflow-hidden bg-bg-tertiary', aspectClass)}>
          <img
            src={displayUrl}
            alt={`Course ${imageType}`}
            className="w-full h-full object-cover"
          />

          {/* Loading overlay */}
          {busy && (
            <div className="absolute inset-0 bg-bg-primary/60 flex flex-col items-center justify-center gap-2">
              <Loader2 size={28} className="text-accent-teal animate-spin" />
              {generating && (
                <p className="text-xs text-fg-tertiary">Generating with AI...</p>
              )}
            </div>
          )}

          {/* Action buttons overlay */}
          {!busy && (
            <div className="absolute inset-0 bg-bg-primary/0 hover:bg-bg-primary/50 transition-colors group flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-bg-secondary/80"
                onClick={() => fileInputRef.current?.click()}
              >
                <RefreshCw size={14} className="mr-1.5" />
                Replace
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-bg-secondary/80"
                onClick={generateImage}
              >
                <Sparkles size={14} className="mr-1.5" />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-bg-secondary/80 text-red-400 hover:text-red-300"
                onClick={onRemove}
              >
                <Trash2 size={14} className="mr-1.5" />
                Remove
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
        /* Empty drop zone */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            aspectClass,
            'flex flex-col items-center justify-center',
            dragOver
              ? 'border-accent-teal bg-accent-teal/5'
              : 'border-border-default hover:border-border-hover',
          )}
        >
          {busy ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={28} className="text-accent-teal animate-spin" />
              {generating && (
                <p className="text-xs text-fg-tertiary">Generating with AI...</p>
              )}
            </div>
          ) : (
            <>
              <ImageIcon size={28} className="text-fg-tertiary mb-2" />
              <p className="text-sm text-fg-secondary mb-1">
                Drag & drop an image here
              </p>
              <p className="text-xs text-fg-tertiary mb-2">or</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} className="mr-1.5" />
                  Browse Files
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateImage}
                >
                  <Sparkles size={14} className="mr-1.5" />
                  Generate with AI
                </Button>
              </div>
              <p className="text-xs text-fg-tertiary mt-2">
                JPEG, PNG, WebP, AVIF &middot; max {maxMB}MB
              </p>
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
