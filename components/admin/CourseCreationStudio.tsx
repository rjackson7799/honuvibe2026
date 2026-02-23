'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wand2, FileUp, Download } from 'lucide-react';
import { CourseWizard } from './wizard/CourseWizard';
import { CourseUploader } from './CourseUploader';
import { EditablePreview } from './EditablePreview';
import { cn } from '@/lib/utils';
import type { ParsedCourseData } from '@/lib/courses/types';

type ActiveTab = 'wizard' | 'upload';
type Step = 'input' | 'parsing' | 'preview' | 'saving' | 'done';

export function CourseCreationStudio() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('wizard');
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState<ParsedCourseData | null>(null);
  const [uploadId, setUploadId] = useState('');

  // Called by the wizard when AI generation completes
  function handleWizardGenerated(data: ParsedCourseData, id: string) {
    setParsedData(data);
    setUploadId(id);
    setStep('preview');
  }

  // Called by the markdown uploader when parsing completes
  async function handleParse(markdown: string, filename: string) {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/courses/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, filename }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Parsing failed');
      }

      const data = await res.json();
      setParsedData(data.parsedData);
      setUploadId(data.uploadId);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parsing failed');
    } finally {
      setLoading(false);
    }
  }

  // Called by the editable preview when confirm is clicked
  async function handleConfirm(data: ParsedCourseData, startDate: string) {
    setLoading(true);
    setError('');
    setStep('saving');

    try {
      const res = await fetch('/api/admin/courses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedData: data,
          uploadId,
          startDate: startDate || undefined,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Course creation failed');
      }

      const result = await res.json();
      setStep('done');

      setTimeout(() => {
        router.push(`/admin/courses/${result.courseId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Course creation failed');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setParsedData(null);
    setUploadId('');
    setStep('input');
    setError('');
  }

  // Done state
  if (step === 'done') {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-serif text-fg-primary mb-2">Course Created!</h2>
        <p className="text-sm text-fg-tertiary">Redirecting to course detail...</p>
      </div>
    );
  }

  // Preview/edit state (shared by both tabs)
  if (step === 'preview' && parsedData) {
    return (
      <EditablePreview
        parsedData={parsedData}
        onConfirm={handleConfirm}
        onBack={handleBack}
        loading={loading}
      />
    );
  }

  // Input state — show tabs
  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-border-default">
        <TabButton
          active={activeTab === 'wizard'}
          onClick={() => setActiveTab('wizard')}
          icon={<Wand2 size={16} />}
          label="Create with Wizard"
        />
        <TabButton
          active={activeTab === 'upload'}
          onClick={() => setActiveTab('upload')}
          icon={<FileUp size={16} />}
          label="Upload Markdown"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'wizard' && (
        <CourseWizard onGenerated={handleWizardGenerated} />
      )}

      {activeTab === 'upload' && (
        <div className="space-y-4">
          {/* Sample template download */}
          <div className="flex items-center justify-end">
            <a
              href="/downloads/course-template.md"
              download
              className="inline-flex items-center gap-1.5 text-xs text-accent-teal hover:text-accent-teal-hover transition-colors"
            >
              <Download size={14} /> Download sample template
            </a>
          </div>
          <CourseUploader onParse={handleParse} loading={loading} />
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
        active
          ? 'text-accent-teal border-accent-teal'
          : 'text-fg-tertiary border-transparent hover:text-fg-secondary',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
