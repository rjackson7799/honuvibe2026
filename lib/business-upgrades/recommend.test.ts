import { describe, expect, it } from 'vitest';
import { recommendBusinessUpgrades } from './recommend';
import type { BusinessUpgradeAssessmentInput, BusinessUpgradeProjectForRecommendation } from './types';

const assessment: BusinessUpgradeAssessmentInput = {
  goal: 'save_time',
  workModel: 'solopreneur',
  industry: 'professional_services',
  aiConfidence: 'beginner',
  weeklyTimeMinutes: 120,
  currentTools: [],
  locale: 'en',
};

function project(overrides: Partial<BusinessUpgradeProjectForRecommendation> = {}): BusinessUpgradeProjectForRecommendation {
  return {
    id: crypto.randomUUID(),
    slug: 'default-project',
    templateVersion: 1,
    featured: false,
    goalCodes: ['save_time'],
    workModelCodes: null,
    industryCodes: null,
    minConfidence: 'beginner',
    maxConfidence: 'advanced',
    estimatedDays: 7,
    totalMinutes: 90,
    requiresWorkbench: false,
    ...overrides,
  };
}

describe('recommendBusinessUpgrades', () => {
  it('scores exact matches above generic projects', () => {
    const generic = project({ slug: 'generic' });
    const exact = project({ slug: 'exact', workModelCodes: ['solopreneur'], industryCodes: ['professional_services'] });
    const result = recommendBusinessUpgrades(assessment, [generic, exact], { workbenchAllowed: true });
    expect(result.map((r) => r.projectSlug)).toEqual(['exact', 'generic']);
    expect(result[0].score).toBe(100);
  });

  it('excludes Workbench projects when the entitlement cannot read Workbench', () => {
    const result = recommendBusinessUpgrades(assessment, [project({ requiresWorkbench: true })], { workbenchAllowed: false });
    expect(result).toEqual([]);
  });

  it('excludes projects targeted to another work model or industry', () => {
    const result = recommendBusinessUpgrades(assessment, [
      project({ workModelCodes: ['team_leader'] }),
      project({ industryCodes: ['hospitality'] }),
    ], { workbenchAllowed: true });
    expect(result).toEqual([]);
  });

  it('excludes projects over 150 percent of available time', () => {
    const result = recommendBusinessUpgrades(assessment, [project({ totalMinutes: 181 })], { workbenchAllowed: true });
    expect(result).toEqual([]);
  });

  it('breaks ties by featured and then slug', () => {
    const result = recommendBusinessUpgrades(assessment, [
      project({ slug: 'zulu' }),
      project({ slug: 'beta', featured: true }),
      project({ slug: 'alpha' }),
    ], { workbenchAllowed: true });
    expect(result.map((r) => r.projectSlug)).toEqual(['beta', 'alpha', 'zulu']);
  });
});
