import { describe, expect, it } from 'vitest';
import { assessmentInputSchema, projectInputSchema } from './schemas';

describe('business upgrade schemas', () => {
  it('accepts an employed professional without business summaries', () => {
    expect(assessmentInputSchema.parse({
      goal: 'strengthen_career',
      workModel: 'employed_professional',
      industry: null,
      aiConfidence: 'beginner',
      weeklyTimeMinutes: 60,
      currentTools: [],
      locale: 'ja',
    }).workModel).toBe('employed_professional');
  });

  it('rejects unbounded profile text', () => {
    expect(() => assessmentInputSchema.parse({
      goal: 'save_time', workModel: 'solopreneur', aiConfidence: 'beginner',
      weeklyTimeMinutes: 60, currentTools: [], locale: 'en', offerSummary: 'x'.repeat(601),
    })).toThrow();
  });

  it('rejects inverted metric bounds', () => {
    const value = {
      slug: 'test', titleEn: 'Test', titleJa: 'テスト', descriptionEn: 'Description', descriptionJa: '説明',
      outcomeEn: 'Outcome', outcomeJa: '成果', deliverableEn: 'Deliverable', deliverableJa: '成果物',
      metricLabelEn: 'Minutes', metricLabelJa: '分', metricUnit: 'minutes', metricValueType: 'minutes',
      metricMin: 10, metricMax: 5, improvementDirection: 'decrease', goalCodes: ['save_time'],
      workModelCodes: null, industryCodes: null, minConfidence: 'beginner', maxConfidence: 'advanced',
      estimatedDays: 7, totalMinutes: 60, featured: false, jpNeedsReview: false,
      steps: [{ sortOrder: 1, stepType: 'action', titleEn: 'Act', titleJa: '実行', instructionsEn: 'Do it', instructionsJa: '実行する', estimatedMinutes: 10, required: true }],
    };
    expect(() => projectInputSchema.parse(value)).toThrow('Metric minimum');
  });
});
