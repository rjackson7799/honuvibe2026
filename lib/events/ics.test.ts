import { describe, it, expect } from 'vitest';
import { buildEventIcs } from './ics';

describe('buildEventIcs', () => {
  const base = {
    uid: 'event-123@honuvibe.ai',
    title: 'Intro to AI Agents (Live)',
    description: 'A live guest training.',
    startsAt: new Date(Date.UTC(2026, 5, 20, 18, 0, 0)), // 2026-06-20 18:00 UTC
    endsAt: new Date(Date.UTC(2026, 5, 20, 19, 30, 0)), // 19:30 UTC
    eventPageUrl: 'https://honuvibe.ai/learn/dashboard/events/intro-ai-agents',
  };

  it('embeds the gated event-page URL as the calendar URL and location (never a raw meeting link)', () => {
    const ics = buildEventIcs(base);
    expect(ics).toContain('URL:https://honuvibe.ai/learn/dashboard/events/intro-ai-agents');
    expect(ics).toContain('LOCATION:https://honuvibe.ai/learn/dashboard/events/intro-ai-agents');
  });

  it('writes DTSTART/DTEND as UTC derived from the Date inputs', () => {
    const ics = buildEventIcs(base);
    expect(ics).toContain('DTSTART:20260620T180000Z');
    expect(ics).toContain('DTEND:20260620T193000Z');
  });

  it('defaults to a one-hour event when endsAt is missing', () => {
    const ics = buildEventIcs({ ...base, endsAt: null });
    expect(ics).toContain('DTSTART:20260620T180000Z');
    expect(ics).toContain('DTEND:20260620T190000Z');
  });

  it('produces a valid VEVENT envelope with the provided uid and title', () => {
    const ics = buildEventIcs(base);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:event-123@honuvibe.ai');
    expect(ics).toContain('SUMMARY:Intro to AI Agents (Live)');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
