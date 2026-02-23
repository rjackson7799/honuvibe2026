'use client';

import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { WIZARD_TEMPLATES } from '@/lib/courses/wizard-templates';
import type { WizardParams } from '@/lib/courses/types';

type WizardStepInstructionsProps = {
  data: WizardParams;
  onChange: (data: Partial<WizardParams>) => void;
  onBack: () => void;
  onGenerate: () => void;
  loading: boolean;
};

export function WizardStepInstructions({
  data,
  onChange,
  onBack,
  onGenerate,
  loading,
}: WizardStepInstructionsProps) {
  const templateOptions = [
    { value: '', label: 'No template (custom)' },
    ...WIZARD_TEMPLATES.map((t) => ({
      value: t.id,
      label: t.name,
    })),
  ];

  return (
    <div className="space-y-5">
      <Select
        label="Template Preset (optional)"
        value={data.templateId || ''}
        onChange={(e) => onChange({ templateId: e.target.value || undefined })}
        options={templateOptions}
      />

      {data.templateId && (
        <p className="text-xs text-fg-tertiary -mt-3">
          Template context will be included in the AI generation prompt.
        </p>
      )}

      <Textarea
        label="Special Instructions (optional)"
        value={data.specialInstructions || ''}
        onChange={(e) => onChange({ specialInstructions: e.target.value || undefined })}
        placeholder="Any special requirements for the AI generator? e.g., 'Focus on practical projects', 'Include real-world case studies from Hawaii', 'Emphasize hands-on coding exercises'..."
        rows={5}
      />

      {/* Summary */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-medium text-fg-primary">Generation Summary</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-fg-secondary">
          <span>Title: <strong className="text-fg-primary">{data.title}</strong></span>
          <span>Weeks: <strong className="text-fg-primary">{data.totalWeeks}</strong></span>
          <span>Level: <strong className="text-fg-primary capitalize">{data.level}</strong></span>
          <span>Format: <strong className="text-fg-primary capitalize">{data.format}</strong></span>
          <span>Language: <strong className="text-fg-primary uppercase">{data.studentLanguage}</strong></span>
          <span>Difficulty: <strong className="text-fg-primary capitalize">{data.contentDifficulty}</strong></span>
          <span>Outcomes: <strong className="text-fg-primary">{data.learningOutcomes.length}</strong></span>
          <span>Tools: <strong className="text-fg-primary">{data.toolsToCover.length}</strong></span>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button variant="primary" onClick={onGenerate} disabled={loading} icon={Sparkles}>
          {loading ? 'Generating Course...' : 'Generate with AI'}
        </Button>
      </div>
    </div>
  );
}
