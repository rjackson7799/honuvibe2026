import { describe, expect, it } from 'vitest';
import { BUSINESS_UPGRADE_LAUNCH_CATALOG } from './launch-catalog';
import { projectInputSchema } from './schemas';
import { BUSINESS_GOALS, WORK_MODELS } from './codes';
import { recommendBusinessUpgrades } from './recommend';

describe('Business Upgrade launch catalog', () => {
  it('contains four uniquely targeted, schema-valid launch projects', () => {
    expect(BUSINESS_UPGRADE_LAUNCH_CATALOG).toHaveLength(4);
    expect(new Set(BUSINESS_UPGRADE_LAUNCH_CATALOG.map(({ project }) => project.slug)).size).toBe(4);

    for (const entry of BUSINESS_UPGRADE_LAUNCH_CATALOG) {
      const resolvedSteps = entry.steps.map(({ contentSlug, ...step }) => ({
        ...step,
        contentItemId: contentSlug ? crypto.randomUUID() : null,
        workbenchScenarioId: null,
      }));
      expect(() => projectInputSchema.parse({ ...entry.project, steps: resolvedSteps })).not.toThrow();
      expect(resolvedSteps.filter((step) => step.measurementKind === 'baseline')).toHaveLength(1);
      expect(resolvedSteps.filter((step) => step.measurementKind === 'result')).toHaveLength(1);
      expect(resolvedSteps[0].measurementKind).toBe('baseline');
      expect(resolvedSteps.at(-1)?.measurementKind).toBe('result');
    }
  });

  it('uses only reviewed hosted resource slugs and no unavailable Workbench steps', () => {
    const allowedResources = new Set([
      'prompt-starter-kit',
      'ai-content-creation-social-media',
      'ai-meeting-notes-template-japanese',
      'notebooklm-research-guide',
      'perplexity-deep-research',
    ]);

    for (const { steps } of BUSINESS_UPGRADE_LAUNCH_CATALOG) {
      for (const step of steps) {
        expect(step.stepType).not.toBe('workbench');
        if (step.contentSlug) expect(allowedResources.has(step.contentSlug)).toBe(true);
      }
    }
  });

  it('keeps every Japanese draft behind the native-review publishing gate', () => {
    for (const { project } of BUSINESS_UPGRADE_LAUNCH_CATALOG) {
      expect(project.jpNeedsReview).toBe(true);
    }
  });

  it('offers at least one launch project for every goal and work model at the standard time level', () => {
    const projects = BUSINESS_UPGRADE_LAUNCH_CATALOG.map(({ project }, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      slug: project.slug,
      templateVersion: 1,
      featured: project.featured,
      goalCodes: project.goalCodes,
      workModelCodes: project.workModelCodes,
      industryCodes: project.industryCodes,
      minConfidence: project.minConfidence,
      maxConfidence: project.maxConfidence,
      estimatedDays: project.estimatedDays,
      totalMinutes: project.totalMinutes,
      requiresWorkbench: false,
    }));

    for (const goal of BUSINESS_GOALS) {
      for (const workModel of WORK_MODELS) {
        const results = recommendBusinessUpgrades({
          goal,
          workModel,
          industry: null,
          aiConfidence: 'beginner',
          weeklyTimeMinutes: 120,
          currentTools: [],
          locale: 'en',
        }, projects, { workbenchAllowed: true });
        expect(results.length, `${goal}/${workModel}`).toBeGreaterThan(0);
      }
    }
  });
});
