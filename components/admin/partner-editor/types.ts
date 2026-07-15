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

/** Narrows each section's write access to a single typed field of the form. */
export type PatchFn = <K extends keyof PartnerFormData>(
  key: K,
  value: PartnerFormData[K],
) => void;
