import type { WizardParams } from './types';

export type WizardTemplate = {
  id: string;
  name: string;
  description: string;
  defaults: Partial<WizardParams>;
};

export const WIZARD_TEMPLATES: WizardTemplate[] = [
  {
    id: '8-week-cohort',
    name: '8-Week Cohort Course',
    description: 'Weekly live sessions + assignments, community access, structured pace',
    defaults: {
      courseType: 'cohort',
      format: 'live',
      totalWeeks: 8,
      contentDifficulty: 'foundational',
      instructorName: 'Ryan Jackson',
      topicOverview: '',
      learningOutcomes: [],
      toolsToCover: [],
      targetAudience: '',
    },
  },
  {
    id: '4-week-intensive',
    name: '4-Week Intensive',
    description: '2x weekly sessions, project-based, fast-paced learning',
    defaults: {
      courseType: 'cohort',
      format: 'hybrid',
      totalWeeks: 4,
      contentDifficulty: 'intermediate',
      instructorName: 'Ryan Jackson',
      topicOverview: '',
      learningOutcomes: [],
      toolsToCover: [],
      targetAudience: '',
    },
  },
  {
    id: '12-week-deep-dive',
    name: '12-Week Deep Dive',
    description: 'Comprehensive mixed format, capstone project, in-depth mastery',
    defaults: {
      courseType: 'cohort',
      format: 'hybrid',
      totalWeeks: 12,
      contentDifficulty: 'advanced',
      instructorName: 'Ryan Jackson',
      topicOverview: '',
      learningOutcomes: [],
      toolsToCover: [],
      targetAudience: '',
    },
  },
  {
    id: 'self-paced',
    name: 'Self-Paced Course',
    description: 'All recorded lessons, flexible timeline, no live sessions',
    defaults: {
      courseType: 'self-study',
      format: 'recorded',
      totalWeeks: 6,
      contentDifficulty: 'foundational',
      instructorName: 'Ryan Jackson',
      topicOverview: '',
      learningOutcomes: [],
      toolsToCover: [],
      targetAudience: '',
    },
  },
];

export function getTemplate(id: string): WizardTemplate | undefined {
  return WIZARD_TEMPLATES.find((t) => t.id === id);
}
