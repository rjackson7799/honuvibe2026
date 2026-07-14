declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

export function trackEvent(name: string, props?: Record<string, string>) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(name, { props });
  }
}

// --- Conversion funnel spine ----------------------------------------------
// See docs/analytics-events.md. Props are non-PII, string-valued only.
// Note: these fire on client navigations (router.push), which do NOT tear the
// page down synchronously, so the event delivers reliably. For events fired on
// a true outbound navigation / full unload, prefer navigator.sendBeacon — the
// current CTAs use client routing, so trackEvent is sufficient.

export function trackCourseEnrollCtaClick(props: {
  course_slug: string;
  is_paid: boolean;
  locale: string;
}) {
  trackEvent('course_enroll_cta_click', {
    course_slug: props.course_slug,
    is_paid: String(props.is_paid),
    locale: props.locale,
  });
}

export function trackFreeSampleStarted(props: {
  lesson_slug: string;
  locale: string;
}) {
  // Carries lesson_slug + locale ONLY — never the captured email.
  trackEvent('free_sample_started', props);
}

export function trackEventRsvp(props: {
  event_slug: string;
  locale: string;
}) {
  // Carries event_slug + locale ONLY — never the captured email.
  trackEvent('event_rsvp', props);
}

// --- Sandbox events ---------------------------------------------------------
// Demo LAUNCHES are deliberately not click-tracked: landing → demo is a full
// document load (separate root layouts), so the demo's own pageview is the
// launch signal. Only coming-soon interest is a client-side event.

export function trackSandboxDemoInterest(props: {
  demo_slug: string;
  locale: string;
}) {
  trackEvent('sandbox_demo_interest', props);
}

// --- Community feed events ------------------------------------------------
// All values stringified because Plausible only accepts string-valued props.

export function trackCommunityPostCreated(props: {
  partner_scope: 'main' | string;
  category: string;
  body_length: number;
  has_link_preview: boolean;
}) {
  trackEvent('community_post_created', {
    partner_scope: props.partner_scope,
    category: props.category,
    body_length: String(props.body_length),
    has_link_preview: String(props.has_link_preview),
  });
}

export function trackCommunityCommentCreated(props: {
  partner_scope: 'main' | string;
  post_id: string;
}) {
  trackEvent('community_comment_created', props);
}

export function trackCommunityPostLiked(props: { partner_scope: 'main' | string }) {
  trackEvent('community_post_liked', props);
}

export function trackCommunityPostReported(props: {
  partner_scope: 'main' | string;
  target_type: 'post' | 'comment';
  reason: string;
}) {
  trackEvent('community_post_reported', {
    partner_scope: props.partner_scope,
    target_type: props.target_type,
    reason: props.reason,
  });
}

export function trackCommunityPaywallViewed(props: { referrer_path: string }) {
  trackEvent('community_paywall_viewed', props);
}

export function trackCommunityPaywallCtaClicked(props: {
  cta: 'community_tier' | 'vault_tier' | 'courses';
}) {
  trackEvent('community_paywall_cta_clicked', props);
}

export function trackLineJoinCardClicked(props: { partner_scope: 'main' | string }) {
  trackEvent('line_join_card_clicked', props);
}
