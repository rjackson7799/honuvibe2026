import type { AiConfidence, RecommendationReason } from './codes';
import type {
  BusinessUpgradeAssessmentInput,
  BusinessUpgradeProjectForRecommendation,
  BusinessUpgradeRecommendation,
} from './types';

export const BUSINESS_UPGRADE_RECOMMENDATION_ENGINE_VERSION = '1';
export const BUSINESS_UPGRADE_RECOMMENDATION_TTL_DAYS = 14;

const confidenceRank: Record<AiConfidence, number> = {
  beginner: 0,
  comfortable: 1,
  advanced: 2,
};

export function recommendBusinessUpgrades(
  assessment: BusinessUpgradeAssessmentInput,
  projects: BusinessUpgradeProjectForRecommendation[],
  options: { workbenchAllowed: boolean },
): BusinessUpgradeRecommendation[] {
  const scored = projects.flatMap((project) => {
    if (!project.goalCodes.includes(assessment.goal)) return [];
    if (project.requiresWorkbench && !options.workbenchAllowed) return [];
    if (project.workModelCodes !== null && !project.workModelCodes.includes(assessment.workModel)) return [];
    if (project.industryCodes !== null && (!assessment.industry || !project.industryCodes.includes(assessment.industry))) return [];

    const confidence = confidenceRank[assessment.aiConfidence];
    if (
      confidence < confidenceRank[project.minConfidence] ||
      confidence > confidenceRank[project.maxConfidence]
    ) return [];

    const availableMinutes = assessment.weeklyTimeMinutes * Math.max(1, Math.ceil(project.estimatedDays / 7));
    if (project.totalMinutes > availableMinutes * 1.5) return [];

    let score = 40;
    const reasons: RecommendationReason[] = ['goal_match'];

    if (project.workModelCodes === null) score += 10;
    else if (project.workModelCodes.includes(assessment.workModel)) {
      score += 20;
      reasons.push('work_model_match');
    }

    if (project.industryCodes === null) score += 10;
    else if (assessment.industry && project.industryCodes.includes(assessment.industry)) {
      score += 20;
      reasons.push('industry_match');
    }

    score += 10;
    reasons.push('confidence_fit');

    if (project.totalMinutes <= availableMinutes) {
      score += 10;
      reasons.push('time_fit');
    }

    if (score < 50) return [];
    return [{ project, score, reasons }];
  });

  return scored
    .sort((a, b) => b.score - a.score || Number(b.project.featured) - Number(a.project.featured) || a.project.slug.localeCompare(b.project.slug))
    .slice(0, 3)
    .map(({ project, score, reasons }, index) => ({
      projectId: project.id,
      projectSlug: project.slug,
      projectVersion: project.templateVersion,
      rank: index + 1,
      score,
      reasonCodes: reasons,
    }));
}
