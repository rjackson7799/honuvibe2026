import { describe, it, expect } from 'vitest';
import {
  buildCourseDetailView,
  formatCourseDate,
  formatCoursePrice,
} from '@/lib/learn/course-detail';
import {
  makeCourse,
  makeOneOnOne,
  makeWeek,
  makeSession,
  makeAssignment,
  NOW,
} from '../../fixtures/course-detail';
import type { CourseInstructorWithProfile } from '@/lib/instructors/types';

function instructor(
  name: string,
  role: 'lead' | 'instructor' | 'guest',
): CourseInstructorWithProfile {
  return {
    id: `ci-${name}`,
    course_id: 'c1',
    instructor_id: `i-${name}`,
    role,
    sort_order: 0,
    revenue_share_pct: 77,
    created_at: '2026-01-01T00:00:00Z',
    instructor: {
      display_name: name,
      title_en: `${name} title`,
      title_jp: `${name} 肩書き`,
      bio_short_en: `${name} bio`,
      bio_short_jp: null,
      bio_long_en: 'long-bio-secret',
      bio_long_jp: null,
      photo_url: `https://img.example/${name}.png`,
      website_url: null,
    },
  };
}

describe('buildCourseDetailView', () => {
  it('whitelists fields', () => {
    const course = makeCourse({
      weeks: [
        makeWeek(1, {
          sessions: [
            makeSession({
              replay_url: 'https://secret.example/replay',
              zoom_link: 'https://secret.example/session-zoom',
              materials_en: ['secret-material'],
              slide_deck_url: 'https://secret.example/slides',
              transcript_url: 'https://secret.example/transcript',
            }),
          ],
        }),
      ],
      instructors: [instructor('Aki', 'lead')],
    });
    const json = JSON.stringify(buildCourseDetailView(course, 'en', NOW));
    for (const secret of [
      'secret.example',
      'esl-secret-value',
      'proposal-secret-notes',
      'secret-material',
      'long-bio-secret',
    ]) {
      expect(json).not.toContain(secret);
    }
    expect(json).not.toContain('42'); // instructor_revenue_share_pct
    expect(json).not.toContain('77'); // revenue_share_pct
  });

  it('locale fallback', () => {
    const ja = buildCourseDetailView(
      makeCourse({ learning_outcomes_jp: [], description_jp: '' }),
      'ja',
      NOW,
    );
    expect(ja.title).toBe('AIエッセンシャルズ');
    expect(ja.altTitle).toBe('AI Essentials');
    expect(ja.description).toBe('Start with AI.'); // empty JP falls back
    expect(ja.outcomes).toEqual(['Outcome one', 'Outcome two']); // empty JP array falls back
    expect(ja.audience).toEqual(['初心者']);
    expect(ja.modules[0].title).toBe('第1章');
    expect(ja.modules[0].lessons[0].title).toBe('トピック1.1');
    expect(ja.modules[0].lessons[0].points).toEqual(['ポイント1a']);

    const en = buildCourseDetailView(makeCourse(), 'en', NOW);
    expect(en.title).toBe('AI Essentials');
    expect(en.altTitle).toBe('AIエッセンシャルズ');
    expect(en.outcomes).toEqual(['Outcome one', 'Outcome two']);

    expect(buildCourseDetailView(makeCourse({ title_jp: null }), 'en', NOW).altTitle).toBeNull();
    expect(
      buildCourseDetailView(makeCourse({ title_jp: 'AI Essentials' }), 'en', NOW).altTitle,
    ).toBeNull();
  });

  it('modules map weeks', () => {
    const course = makeCourse({
      free_preview_count: 1,
      weeks: [
        makeWeek(2, {
          sessions: [
            makeSession({ id: 'b', session_number: null, duration_minutes: 30, topics_en: null }),
            makeSession({
              id: 'a',
              session_number: 1,
              duration_minutes: 45,
              topics_en: [{ title: 'Alpha', subtopics: [] }],
            }),
          ],
          assignments: [
            makeAssignment({ id: 'z', sort_order: 2, title_en: 'Second' }),
            makeAssignment({ id: 'y', sort_order: 1, title_en: 'First' }),
          ],
        }),
        makeWeek(1, {
          phase: null,
          assignments: [],
          sessions: [makeSession({ id: 'x', duration_minutes: null })],
        }),
      ],
    });
    const view = buildCourseDetailView(course, 'en', NOW);
    expect(view.modules.map((m) => m.number)).toEqual([1, 2]);
    const [m1, m2] = view.modules;
    expect(m1.stage).toBeNull();
    expect(m1.task).toBeNull();
    expect(m1.minutes).toBeNull(); // a null duration
    expect(m1.lessons[0].freePreview).toBe(true); // first session of the first week
    expect(m2.stage).toBe('Stage 2');
    expect(m2.task).toBe('First');
    expect(m2.minutes).toBe(75);
    expect(m2.lessonCount).toBe(2);
    expect(m2.lessons.map((l) => l.code)).toEqual(['2.1', '2.2']);
    expect(m2.lessons[0].points).toEqual(['Alpha']);
    expect(m2.lessons[1].points).toEqual([]);
    expect(m2.lessons[0].freePreview).toBe(false);
  });

  it('excludes bonus sessions from lessons', () => {
    const course = makeCourse({
      weeks: [makeWeek(1, { sessions: [makeSession({ id: 'bonus', is_bonus: true })] })],
    });
    expect(buildCourseDetailView(course, 'en', NOW).modules[0].lessons).toEqual([]);
  });

  it('facts', () => {
    expect(buildCourseDetailView(makeCourse(), 'en', NOW).facts).toEqual([
      { key: 'format', value: 'live_cohort' },
      { key: 'length', modules: 5, hours: 5, weeks: 5 },
      { key: 'language', value: 'both' },
      { key: 'community', months: 1 },
    ]);

    const future = buildCourseDetailView(
      makeCourse({ start_date: '2026-12-01T00:00:00Z' }),
      'en',
      NOW,
    );
    expect(future.facts[3]).toEqual({ key: 'starts', date: '2026-12-01T00:00:00Z' });
    expect(future.facts).toHaveLength(4);

    expect(buildCourseDetailView(makeOneOnOne(), 'en', NOW).facts).toEqual([
      { key: 'format', value: 'one_on_one' },
      { key: 'language', value: 'both' },
    ]);

    const noWeeks = buildCourseDetailView(makeCourse({ weeks: [] }), 'en', NOW);
    expect(noWeeks.facts.find((f) => f.key === 'length')).toBeUndefined();
  });

  it('formatKind', () => {
    expect(buildCourseDetailView(makeOneOnOne(), 'en', NOW).formatKind).toBe('one_on_one');
    expect(
      buildCourseDetailView(makeCourse({ live_sessions_count: 3 }), 'en', NOW).formatKind,
    ).toBe('live_cohort');
    expect(
      buildCourseDetailView(makeCourse({ live_sessions_count: 0 }), 'en', NOW).formatKind,
    ).toBe('self_paced');
    expect(
      buildCourseDetailView(makeCourse({ live_sessions_count: null }), 'en', NOW).formatKind,
    ).toBe('self_paced');
  });

  it('syllabusLocales', () => {
    expect(buildCourseDetailView(makeCourse(), 'en', NOW).syllabusLocales).toEqual(['en', 'ja']);
    expect(
      buildCourseDetailView(makeCourse({ language: 'en' }), 'en', NOW).syllabusLocales,
    ).toEqual(['en']);
    expect(buildCourseDetailView(makeOneOnOne(), 'en', NOW).syllabusLocales).toEqual([]);
    expect(buildCourseDetailView(makeCourse({ weeks: [] }), 'en', NOW).syllabusLocales).toEqual(
      [],
    );
  });

  it('spotsLeft', () => {
    expect(buildCourseDetailView(makeCourse(), 'en', NOW).spotsLeft).toBe(13);
    expect(
      buildCourseDetailView(makeCourse({ max_enrollment: null }), 'en', NOW).spotsLeft,
    ).toBeNull();
    expect(
      buildCourseDetailView(makeCourse({ max_enrollment: 2, current_enrollment: 5 }), 'en', NOW)
        .spotsLeft,
    ).toBe(0);
  });

  it('instructors', () => {
    const two = buildCourseDetailView(
      makeCourse({ instructors: [instructor('Bo', 'guest'), instructor('Aki', 'lead')] }),
      'ja',
      NOW,
    );
    expect(two.instructors.map((i) => i.name)).toEqual(['Bo', 'Aki']);
    expect(two.instructors[1]).toEqual({
      name: 'Aki',
      role: 'lead',
      title: 'Aki 肩書き',
      bio: 'Aki bio',
      photoUrl: 'https://img.example/Aki.png',
    });

    const legacy = buildCourseDetailView(
      makeCourse({ instructor: instructor('Cy', 'lead').instructor }),
      'en',
      NOW,
    );
    expect(legacy.instructors).toEqual([
      { name: 'Cy', role: null, title: 'Cy title', bio: 'Cy bio', photoUrl: 'https://img.example/Cy.png' },
    ]);

    const byName = buildCourseDetailView(makeCourse({ instructor_name: 'Dee' }), 'en', NOW);
    expect(byName.instructors).toEqual([
      { name: 'Dee', role: null, title: null, bio: null, photoUrl: null },
    ]);

    expect(buildCourseDetailView(makeCourse(), 'en', NOW).instructors).toEqual([]);
  });

  it('carries course identity and image fields', () => {
    const view = buildCourseDetailView(
      makeCourse({
        vault_included: true,
        is_private: true,
        partners: { slug: 'p', name_en: 'Partner Co', name_jp: 'パートナー', logo_url: null },
      }),
      'ja',
      NOW,
    );
    expect(view.vaultIncluded).toBe(true);
    expect(view.isPrivate).toBe(true);
    expect(view.partnerName).toBe('パートナー');
    expect(view.imageUrl).toBe('https://img.example/hero.png');
    expect(view.code).toBe('HV-AIE100');
    expect(view.cancellationPolicy).toBe('Full refund before start.');
    expect(
      buildCourseDetailView(
        makeCourse({ hero_image_url: null, thumbnail_url: 'https://img.example/t.png' }),
        'en',
        NOW,
      ).imageUrl,
    ).toBe('https://img.example/t.png');
    const withoutFlag = makeCourse();
    delete withoutFlag.vault_included;
    expect(buildCourseDetailView(withoutFlag, 'en', NOW).vaultIncluded).toBe(false);
  });
});

describe('formatCourseDate', () => {
  it('formats a start date per locale in UTC (date-only values do not shift a day)', () => {
    expect(formatCourseDate('2026-12-01', 'en')).toBe('Dec 1, 2026');
    expect(formatCourseDate('2026-12-01T00:00:00Z', 'ja')).toBe('2026年12月1日');
  });
});

describe('formatCoursePrice', () => {
  it('formats per locale with USD fallback', () => {
    expect(formatCoursePrice(125000, 0, 'ja')).toBe('$1,250');
    expect(formatCoursePrice(19800, 2980, 'ja')).toBe('¥2,980');
    expect(formatCoursePrice(19800, 0, 'en')).toBe('$198');
    expect(formatCoursePrice(null, null, 'en')).toBeNull();
    expect(formatCoursePrice(0, 2980, 'en')).toBeNull();
  });
});
