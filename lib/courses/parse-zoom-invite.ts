/**
 * Parses a Zoom meeting invite text and extracts structured meeting info.
 * Handles full invite blocks, partial invites, and plain URLs.
 */

export interface ParsedZoomInvite {
  meetingUrl: string | null;
  meetingId: string | null;
  passcode: string | null;
  topic: string | null;
  dateTime: string | null;
}

const ZOOM_URL_RE = /https?:\/\/[\w.-]*zoom\.us\/j\/[\d]+(?:\?[^\s)]+)?/i;
const MEETING_ID_RE = /Meeting\s*ID:\s*([\d\s]+)/i;
const PASSCODE_RE = /Pass(?:code|word):\s*(\S+)/i;
const TOPIC_RE = /Topic:\s*(.+)/i;
const TIME_RE = /Time:\s*(.+)/i;

export function parseZoomInvite(text: string): ParsedZoomInvite {
  const trimmed = text.trim();

  if (!trimmed) {
    return { meetingUrl: null, meetingId: null, passcode: null, topic: null, dateTime: null };
  }

  const urlMatch = trimmed.match(ZOOM_URL_RE);
  const idMatch = trimmed.match(MEETING_ID_RE);
  const passcodeMatch = trimmed.match(PASSCODE_RE);
  const topicMatch = trimmed.match(TOPIC_RE);
  const timeMatch = trimmed.match(TIME_RE);

  return {
    meetingUrl: urlMatch ? urlMatch[0] : null,
    meetingId: idMatch ? idMatch[1].replace(/\s/g, '') : null,
    passcode: passcodeMatch ? passcodeMatch[1] : null,
    topic: topicMatch ? topicMatch[1].trim() : null,
    dateTime: timeMatch ? timeMatch[1].trim() : null,
  };
}
