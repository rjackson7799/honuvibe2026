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
  reason: string;
}) {
  trackEvent('community_post_reported', props);
}

export function trackCommunityPaywallViewed(props: { referrer_path: string }) {
  trackEvent('community_paywall_viewed', props);
}

export function trackCommunityPaywallCtaClicked(props: {
  cta: 'community_tier' | 'vault_tier' | 'course';
}) {
  trackEvent('community_paywall_cta_clicked', props);
}

export function trackLineJoinCardClicked(props: { partner_scope: 'main' | string }) {
  trackEvent('line_join_card_clicked', props);
}
