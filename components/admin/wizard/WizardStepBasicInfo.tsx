'use client';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { WizardParams } from '@/lib/courses/types';

type WizardStepBasicInfoProps = {
  data: WizardParams;
  onChange: (data: Partial<WizardParams>) => void;
  onNext: () => void;
};

export function WizardStepBasicInfo({ data, onChange, onNext }: WizardStepBasicInfoProps) {
  const canProceed = data.title.trim() && data.description.trim();

  return (
    <div className="space-y-5">
      <Input
        label="Course Title (EN)"
        value={data.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="e.g., AI Foundations for Business"
        required
      />

      <Textarea
        label="Course Description (EN)"
        value={data.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="A brief description of what students will learn..."
        rows={3}
      />

      <Input
        label="Instructor Name"
        value={data.instructorName}
        onChange={(e) => onChange({ instructorName: e.target.value })}
        placeholder="Ryan Jackson"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Course Type"
          value={data.courseType}
          onChange={(e) => onChange({ courseType: e.target.value as WizardParams['courseType'] })}
          options={[
            { value: 'cohort', label: 'Cohort (scheduled)' },
            { value: 'self-study', label: 'Self-Study (flexible)' },
          ]}
        />

        <Select
          label="Level"
          value={data.level}
          onChange={(e) => onChange({ level: e.target.value as WizardParams['level'] })}
          options={[
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
          ]}
        />

        <Select
          label="Format"
          value={data.format}
          onChange={(e) => onChange({ format: e.target.value as WizardParams['format'] })}
          options={[
            { value: 'live', label: 'Live Sessions' },
            { value: 'recorded', label: 'Recorded' },
            { value: 'hybrid', label: 'Hybrid (Live + Recorded)' },
          ]}
        />

        <Select
          label="Primary Student Language"
          value={data.studentLanguage}
          onChange={(e) => onChange({ studentLanguage: e.target.value as WizardParams['studentLanguage'] })}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ja', label: 'Japanese' },
            { value: 'both', label: 'Both (EN + JP)' },
          ]}
        />

        <Select
          label="Content Difficulty"
          value={data.contentDifficulty}
          onChange={(e) => onChange({ contentDifficulty: e.target.value as WizardParams['contentDifficulty'] })}
          options={[
            { value: 'introductory', label: 'Introductory' },
            { value: 'foundational', label: 'Foundational' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
            { value: 'expert', label: 'Expert' },
          ]}
        />

        <Input
          label="Total Weeks"
          type="number"
          min={1}
          max={24}
          value={data.totalWeeks || ''}
          onChange={(e) => onChange({ totalWeeks: parseInt(e.target.value) || 0 })}
        />

        <Input
          label="Price (USD)"
          type="number"
          min={0}
          step={1}
          value={data.priceUsd || ''}
          onChange={(e) => onChange({ priceUsd: parseFloat(e.target.value) || 0 })}
          placeholder="e.g., 299"
        />

        <Input
          label="Price (JPY)"
          type="number"
          min={0}
          step={100}
          value={data.priceJpy || ''}
          onChange={(e) => onChange({ priceJpy: parseInt(e.target.value) || 0 })}
          placeholder="e.g., 44800"
        />

        <Input
          label="Max Enrollment (optional)"
          type="number"
          min={1}
          value={data.maxEnrollment || ''}
          onChange={(e) => onChange({ maxEnrollment: parseInt(e.target.value) || undefined })}
          placeholder="e.g., 25"
        />

        <Input
          label="Start Date (optional)"
          type="date"
          value={data.startDate || ''}
          onChange={(e) => onChange({ startDate: e.target.value || undefined })}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="primary" onClick={onNext} disabled={!canProceed}>
          Next: Content Outline
        </Button>
      </div>
    </div>
  );
}
