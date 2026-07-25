export type PartnerFormData = {
  id: string;
  slug: string;
  name_en: string;
  name_jp: string;
  tagline_en: string;
  tagline_jp: string;
  description_en: string;
  description_jp: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  website_url: string;
  contact_email: string;
  revenue_share_pct: number;
  is_public: boolean;
  is_active: boolean;
};

export type CourseOption = {
  id: string;
  slug: string;
  title_en: string;
  is_published: boolean;
};

/** A block of sponsored/purchased seats, with its live usage count. */
export type SeatBlockRow = {
  id: string;
  label: string;
  seats_total: number;
  seats_used: number;
  granted_tier: 'vault';
  access_starts_at: string;
  access_ends_at: string;
  source: 'sponsored' | 'purchased';
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

/** A join code, with usage counted from the redemption ledger. */
export type JoinCodeRow = {
  id: string;
  code: string;
  seat_block_id: string | null;
  max_uses: number | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  uses: number;
};

export type PartnerBenefitsRow = {
  course_discount_pct: number;
  stripe_coupon_id: string | null;
  included_tier: 'community' | 'vault' | null;
};

/** Narrows each section's write access to a single typed field of the form. */
export type PatchFn = <K extends keyof PartnerFormData>(
  key: K,
  value: PartnerFormData[K],
) => void;
