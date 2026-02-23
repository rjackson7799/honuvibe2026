'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CourseUploaderProps = {
  onParse: (markdown: string, filename: string) => void;
  loading: boolean;
};

export function CourseUploader({ onParse, loading }: CourseUploaderProps) {
  const [markdown, setMarkdown] = useState('');
  const [filename, setFilename] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setMarkdown(text);
      setFilename(file.name);
    };
    reader.readAsText(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.md') || file.type === 'text/markdown' || file.type === 'text/plain')) {
      handleFile(file);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleClear() {
    setMarkdown('');
    setFilename('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          dragOver
            ? 'border-accent-teal bg-accent-teal/5'
            : 'border-border-default hover:border-border-hover',
        )}
      >
        {filename ? (
          <div className="flex items-center justify-center gap-3">
            <FileText size={24} className="text-accent-teal" />
            <span className="text-fg-primary font-medium">{filename}</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-fg-tertiary hover:text-fg-primary"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={32} className="mx-auto text-fg-tertiary mb-3" />
            <p className="text-sm text-fg-secondary mb-1">
              Drag & drop a .md file here
            </p>
            <p className="text-xs text-fg-tertiary mb-3">or</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.markdown"
              onChange={handleFileInput}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Paste area */}
      <div>
        <label className="block text-xs text-fg-tertiary mb-1">
          Or paste markdown content directly:
        </label>
        <textarea
          value={markdown}
          onChange={(e) => { setMarkdown(e.target.value); setFilename('pasted_content.md'); }}
          placeholder="# Course Title&#10;&#10;Paste your course markdown here..."
          rows={12}
          className="w-full px-4 py-3 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary font-mono resize-y focus:outline-none focus:border-accent-teal"
        />
      </div>

      {/* Parse button */}
      <Button
        variant="primary"
        onClick={() => onParse(markdown, filename)}
        disabled={loading || !markdown.trim()}
        fullWidth
      >
        {loading ? 'Parsing with AI...' : 'Parse with AI'}
      </Button>
    </div>
  );
}
