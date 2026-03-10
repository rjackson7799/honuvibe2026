// ============================================================
// ESL Content Types (stored as JSONB in esl_lessons)
// ============================================================

export interface UsageSentence {
  sentence_en: string;
  sentence_jp: string;
  highlight_indices: [number, number];
}

export interface VocabularyItem {
  id: string; // e.g. "vocab_0"
  term_en: string;
  reading_en: string; // IPA phonetic transcription
  definition_en: string;
  definition_jp: string;
  term_jp: string;
  part_of_speech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase';
  difficulty: 'essential' | 'intermediate' | 'advanced';
  usage_sentences: UsageSentence[];
  notes_jp?: string;
  audio_keys: {
    word: string; // e.g. "vocab_0_word"
    sentences: string[]; // e.g. ["vocab_0_sentence_0", "vocab_0_sentence_1"]
  };
}

export interface GrammarExample {
  sentence_en: string;
  sentence_jp: string;
  annotation_jp?: string;
}

export interface GrammarPoint {
  id: string; // e.g. "grammar_0"
  title_en: string;
  title_jp: string;
  explanation_en: string;
  explanation_jp: string;
  pattern: string;
  examples: GrammarExample[];
  common_mistakes_jp?: string;
  audio_keys: {
    examples: string[]; // e.g. ["grammar_0_example_0"]
  };
}

export interface CulturalNote {
  id: string; // e.g. "culture_0"
  title_en: string;
  title_jp: string;
  content_en: string;
  content_jp: string;
  category: 'professional' | 'cultural' | 'linguistic';
  tip_jp?: string;
}

export type ComprehensionType =
  | 'vocabulary_match'
  | 'fill_in_blank'
  | 'sentence_order'
  | 'translation';

export interface ComprehensionItem {
  id: string; // e.g. "check_0"
  type: ComprehensionType;
  question_en: string;
  question_jp: string;
  options?: string[];
  correct_answer: string | number;
  explanation_jp: string;
}

// Generated ESL content from Claude API
export interface GeneratedESLContent {
  vocabulary: VocabularyItem[];
  grammar: GrammarPoint[];
  cultural_notes: CulturalNote[];
  comprehension: ComprehensionItem[];
}

// ============================================================
// ESL Settings (stored in courses.esl_settings_json)
// ============================================================

export type VocabDepth = 'essential' | 'comprehensive';

export interface ESLSettings {
  target_language: 'ja';
  vocab_depth: VocabDepth;
  grammar_count: number;
  include_cultural: boolean;
  generate_audio: boolean;
  tts_voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}

export const DEFAULT_ESL_SETTINGS: ESLSettings = {
  target_language: 'ja',
  vocab_depth: 'comprehensive',
  grammar_count: 3,
  include_cultural: true,
  generate_audio: true,
  tts_voice: 'nova',
};

// ============================================================
// Database Row Types
// ============================================================

export type ESLStatus = 'generating' | 'review' | 'published' | 'failed';

export interface ESLLesson {
  id: string;
  course_id: string;
  week_id: string;
  status: ESLStatus;
  vocabulary_json: VocabularyItem[] | null;
  grammar_json: GrammarPoint[] | null;
  cultural_notes_json: CulturalNote[] | null;
  comprehension_json: ComprehensionItem[] | null;
  generation_error: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ESLAudio {
  id: string;
  esl_lesson_id: string;
  reference_key: string;
  storage_path: string;
  public_url: string;
  duration_seconds: number | null;
  created_at: string;
}

export interface ESLProgress {
  id: string;
  user_id: string;
  esl_lesson_id: string;
  vocabulary_completed: number[];
  comprehension_score: number | null;
  flashcard_known: number[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ESLPurchase {
  id: string;
  user_id: string;
  course_id: string;
  stripe_checkout_session_id: string | null;
  amount_paid: number;
  currency: string;
  purchased_at: string;
}

// ============================================================
// Composite Types
// ============================================================

export interface ESLLessonWithAudio extends ESLLesson {
  audio: ESLAudio[];
}

// Context passed to the generation pipeline
export interface WeekESLContext {
  course_id: string;
  week_id: string;
  week_number: number;
  week_title_en: string;
  week_title_jp: string | null;
  session_titles: string[];
  session_topics: string[];
  course_vocabulary: { term_en: string; term_jp: string }[];
  course_level: string;
  course_description_en: string;
  esl_settings: ESLSettings;
}

// Access check result
export interface ESLAccessResult {
  hasAccess: boolean;
  source: 'included' | 'purchased' | 'admin' | null;
}
