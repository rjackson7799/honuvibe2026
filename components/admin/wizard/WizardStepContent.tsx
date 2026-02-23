'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { WizardParams } from '@/lib/courses/types';

type WizardStepContentProps = {
  data: WizardParams;
  onChange: (data: Partial<WizardParams>) => void;
  onNext: () => void;
  onBack: () => void;
};

export function WizardStepContent({ data, onChange, onNext, onBack }: WizardStepContentProps) {
  const [outcomeInput, setOutcomeInput] = useState('');
  const [toolInput, setToolInput] = useState('');

  const canProceed = data.topicOverview.trim();

  function addOutcome() {
    const val = outcomeInput.trim();
    if (!val) return;
    onChange({ learningOutcomes: [...data.learningOutcomes, val] });
    setOutcomeInput('');
  }

  function removeOutcome(index: number) {
    onChange({ learningOutcomes: data.learningOutcomes.filter((_, i) => i !== index) });
  }

  function addTool() {
    const val = toolInput.trim();
    if (!val) return;
    onChange({ toolsToCover: [...data.toolsToCover, val] });
    setToolInput('');
  }

  function removeTool(index: number) {
    onChange({ toolsToCover: data.toolsToCover.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-5">
      <Textarea
        label="Topic Overview"
        value={data.topicOverview}
        onChange={(e) => onChange({ topicOverview: e.target.value })}
        placeholder="Describe in detail what this course covers. The more detail you provide, the better the AI can generate the curriculum..."
        rows={5}
      />

      {/* Learning Outcomes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-fg-secondary block">
          Learning Outcomes
        </label>
        {data.learningOutcomes.length > 0 && (
          <ul className="space-y-1.5">
            {data.learningOutcomes.map((outcome, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-fg-primary bg-bg-tertiary rounded px-3 py-2">
                <span className="flex-1">{outcome}</span>
                <button
                  type="button"
                  onClick={() => removeOutcome(i)}
                  className="text-fg-tertiary hover:text-red-400 mt-0.5 shrink-0"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            value={outcomeInput}
            onChange={(e) => setOutcomeInput(e.target.value)}
            placeholder="Add a learning outcome..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOutcome(); } }}
            className="flex-1"
          />
          <Button variant="ghost" size="sm" onClick={addOutcome} disabled={!outcomeInput.trim()}>
            <Plus size={16} />
          </Button>
        </div>
      </div>

      {/* Tools to Cover */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-fg-secondary block">
          Tools to Cover
        </label>
        {data.toolsToCover.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.toolsToCover.map((tool, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-bg-tertiary rounded font-mono text-fg-secondary"
              >
                {tool}
                <button
                  type="button"
                  onClick={() => removeTool(i)}
                  className="text-fg-tertiary hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={toolInput}
            onChange={(e) => setToolInput(e.target.value)}
            placeholder="Add a tool (e.g., ChatGPT, Claude, Cursor)..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTool(); } }}
            className="flex-1"
          />
          <Button variant="ghost" size="sm" onClick={addTool} disabled={!toolInput.trim()}>
            <Plus size={16} />
          </Button>
        </div>
      </div>

      <Textarea
        label="Target Audience"
        value={data.targetAudience}
        onChange={(e) => onChange({ targetAudience: e.target.value })}
        placeholder="Who is this course designed for?"
        rows={2}
      />

      <Textarea
        label="Prerequisites (optional)"
        value={data.prerequisites || ''}
        onChange={(e) => onChange({ prerequisites: e.target.value || undefined })}
        placeholder="Any required knowledge or experience..."
        rows={2}
      />

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onNext} disabled={!canProceed}>
          Next: Special Instructions
        </Button>
      </div>
    </div>
  );
}
