// Self-Study Path types (Phase 2C)
// DB row types + input/output types for generation pipeline

export type PathStatus = 'active' | 'completed' | 'archived' | 'regenerating';
export type DifficultyPreference = 'beginner' | 'intermediate' | 'advanced';
export type LanguagePreference = 'en' | 'ja';

export interface StudyPath {
  id: string;
  user_id: string;
  goal_description: string;
  difficulty_preference: DifficultyPreference;
  language_preference: LanguagePreference;
  focus_areas: string[] | null;
  title_en: string | null;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  estimated_hours: number | null;
  total_items: number | null;
  free_items: number | null;
  premium_items: number | null;
  status: PathStatus;
  generation_model: string | null;
  generation_prompt_version: string | null;
  generated_at: string;
  completed_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudyPathItem {
  id: string;
  path_id: string;
  content_item_id: string;
  sort_order: number;
  rationale_en: string | null;
  rationale_jp: string | null;
  learning_focus_en: string | null;
  learning_focus_jp: string | null;
  is_completed: boolean;
  completed_at: string | null;
  // Denormalized fields
  item_title_en: string | null;
  item_content_type: string | null;
  item_access_tier: string | null;
  item_duration_minutes: number | null;
  item_url: string | null;
  item_embed_url: string | null;
  created_at: string;
}

export interface StudyPathWithProgress extends StudyPath {
  completed_items: number;
}

export interface StudyPathWithItems extends StudyPath {
  items: StudyPathItem[];
}

export interface AdminStudyPath extends StudyPath {
  user_email: string | null;
  user_name: string | null;
}

export interface PathGenerationLog {
  id: string;
  path_id: string | null;
  user_id: string | null;
  goal_description: string | null;
  preferences: {
    difficulty: DifficultyPreference;
    language: LanguagePreference;
    focus_areas: string[];
  } | null;
  content_catalog_size: number | null;
  prompt_version: string | null;
  raw_response: string | null;
  parsed_successfully: boolean | null;
  items_generated: number | null;
  generation_time_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Input / Output types for generation pipeline
// ---------------------------------------------------------------------------

export interface PathIntakeInput {
  goal_description: string;
  difficulty_preference: DifficultyPreference;
  language_preference: LanguagePreference;
  focus_areas: string[];
}

export interface CatalogItem {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  tags: string[];
  duration_minutes: number | null;
  description: string;
  source: string;
  tier: string;
}

export interface ClaudePathItem {
  content_item_id: string;
  sort_order: number;
  rationale_en: string;
  rationale_jp: string;
  learning_focus_en: string;
  learning_focus_jp: string;
}

export interface ClaudePathResponse {
  title_en: string;
  title_jp: string;
  description_en: string;
  description_jp: string;
  estimated_hours: number;
  items: ClaudePathItem[];
  gaps: string | null;
}

export interface PathGenerationResult {
  response: ClaudePathResponse;
  generationTimeMs: number;
  inputTokens: number;
  outputTokens: number;
  catalogSize: number;
}

export interface PathStats {
  totalPaths: number;
  activePaths: number;
  completedPaths: number;
  avgItemsPerPath: number;
  avgCompletionRate: number;
  topTopics: { topic: string; count: number }[];
  topContentItems: { title: string; count: number }[];
}
