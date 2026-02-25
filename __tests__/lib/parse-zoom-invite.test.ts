import { describe, it, expect } from 'vitest';
import { parseZoomInvite } from '@/lib/courses/parse-zoom-invite';

describe('parseZoomInvite', () => {
  it('parses a full Zoom invite with all fields', () => {
    const invite = `Topic: AI Foundations for Business - Session 1
Time: Mar 5, 2026 06:00 PM Hawaii

Join Zoom Meeting
https://us06web.zoom.us/j/83456789012?pwd=abc123def456

Meeting ID: 834 5678 9012
Passcode: 123456`;

    const result = parseZoomInvite(invite);
    expect(result.meetingUrl).toBe('https://us06web.zoom.us/j/83456789012?pwd=abc123def456');
    expect(result.meetingId).toBe('83456789012');
    expect(result.passcode).toBe('123456');
    expect(result.topic).toBe('AI Foundations for Business - Session 1');
    expect(result.dateTime).toBe('Mar 5, 2026 06:00 PM Hawaii');
  });

  it('parses invite without topic line', () => {
    const invite = `Join Zoom Meeting
https://zoom.us/j/123456789?pwd=xyz

Meeting ID: 123 456 789
Passcode: abcdef`;

    const result = parseZoomInvite(invite);
    expect(result.meetingUrl).toBe('https://zoom.us/j/123456789?pwd=xyz');
    expect(result.meetingId).toBe('123456789');
    expect(result.passcode).toBe('abcdef');
    expect(result.topic).toBeNull();
    expect(result.dateTime).toBeNull();
  });

  it('parses invite without time line', () => {
    const invite = `Topic: Weekly Standup

Join Zoom Meeting
https://us02web.zoom.us/j/999888777

Meeting ID: 999 888 777
Passcode: stand`;

    const result = parseZoomInvite(invite);
    expect(result.meetingUrl).toBe('https://us02web.zoom.us/j/999888777');
    expect(result.dateTime).toBeNull();
    expect(result.topic).toBe('Weekly Standup');
  });

  it('parses a plain Zoom URL', () => {
    const result = parseZoomInvite('https://us06web.zoom.us/j/83456789012?pwd=abc123');
    expect(result.meetingUrl).toBe('https://us06web.zoom.us/j/83456789012?pwd=abc123');
    expect(result.meetingId).toBeNull();
    expect(result.passcode).toBeNull();
    expect(result.topic).toBeNull();
    expect(result.dateTime).toBeNull();
  });

  it('parses URL without pwd query parameter', () => {
    const result = parseZoomInvite('https://zoom.us/j/123456789');
    expect(result.meetingUrl).toBe('https://zoom.us/j/123456789');
  });

  it('handles "Password" instead of "Passcode"', () => {
    const invite = `Join Zoom Meeting
https://zoom.us/j/111222333

Meeting ID: 111 222 333
Password: secret99`;

    const result = parseZoomInvite(invite);
    expect(result.passcode).toBe('secret99');
  });

  it('handles meeting ID without spaces', () => {
    const invite = `Join Zoom Meeting
https://zoom.us/j/111222333

Meeting ID: 111222333
Passcode: 000`;

    const result = parseZoomInvite(invite);
    expect(result.meetingId).toBe('111222333');
  });

  it('returns all nulls for empty string', () => {
    const result = parseZoomInvite('');
    expect(result.meetingUrl).toBeNull();
    expect(result.meetingId).toBeNull();
    expect(result.passcode).toBeNull();
    expect(result.topic).toBeNull();
    expect(result.dateTime).toBeNull();
  });

  it('returns all nulls for non-Zoom text', () => {
    const result = parseZoomInvite('Hello, this is just a regular message with no Zoom link.');
    expect(result.meetingUrl).toBeNull();
    expect(result.meetingId).toBeNull();
    expect(result.passcode).toBeNull();
  });

  it('returns null meetingUrl for non-Zoom URL', () => {
    const result = parseZoomInvite('https://meet.google.com/abc-defg-hij');
    expect(result.meetingUrl).toBeNull();
  });

  it('handles whitespace-only input', () => {
    const result = parseZoomInvite('   \n\n  ');
    expect(result.meetingUrl).toBeNull();
  });

  it('handles invite with multi-line time', () => {
    const invite = `Topic: Team Meeting
Time: Feb 24, 2026 10:00 AM Pacific Time (US and Canada)

Join Zoom Meeting
https://us04web.zoom.us/j/555666777?pwd=longpwd123

Meeting ID: 555 666 777
Passcode: team`;

    const result = parseZoomInvite(invite);
    expect(result.dateTime).toBe('Feb 24, 2026 10:00 AM Pacific Time (US and Canada)');
    expect(result.meetingUrl).toBe('https://us04web.zoom.us/j/555666777?pwd=longpwd123');
  });
});
