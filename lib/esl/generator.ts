import type { GeneratedESLContent, WeekESLContext } from './types';
import { generatedESLContentSchema } from './schemas';

const ESL_GENERATION_SYSTEM_PROMPT = `You are an expert ESL (English as a Second Language) curriculum designer specializing in creating English learning materials for Japanese-speaking professionals. You have deep expertise in both English linguistics and Japanese language, and you understand the specific challenges Japanese speakers face when learning English.

Your task is to analyze AI course lesson content and extract/generate supplemental English learning materials.

REQUIREMENTS:

1. VOCABULARY:
   - Extract key technical terms, professional vocabulary, and high-value English words/phrases from the lesson content
   - Prioritize words that are: (a) essential for understanding the AI content, (b) useful in professional English contexts, (c) commonly challenging for Japanese speakers
   - For each term, provide:
     - Accurate IPA phonetic transcription in the reading_en field
     - Clear English definition in the context of the lesson
     - Natural Japanese translation (use katakana for loanwords where standard, kanji/hiragana for native equivalents)
     - Part of speech
     - 2-3 natural usage sentences that connect to the lesson topic
     - Japanese translation of each usage sentence
     - highlight_indices as [start, end] char positions of the term in sentence_en
     - Optional notes on nuance, common misuse, or register for Japanese speakers
   - Assign sequential IDs: vocab_0, vocab_1, etc.
   - Assign audio_keys: word key as "vocab_N_word", sentence keys as "vocab_N_sentence_0", "vocab_N_sentence_1", etc.

2. GRAMMAR POINTS:
   - Identify English grammar patterns that appear in the lesson content
   - Focus on patterns that: (a) are commonly difficult for Japanese speakers, (b) are important for professional English communication, (c) appear naturally in AI/tech discussion
   - For each point, provide:
     - Clear structural pattern
     - Plain English + Japanese explanation
     - 2-3 example sentences from or inspired by the lesson with Japanese translations
     - Optional annotation_jp for each example explaining the grammar in action
     - Common mistakes Japanese speakers make with this pattern
   - Assign sequential IDs: grammar_0, grammar_1, etc.
   - Assign audio_keys: example keys as "grammar_N_example_0", "grammar_N_example_1", etc.

3. CULTURAL/PROFESSIONAL NOTES (2-3 items):
   - Notes on how the English used in this lesson reflects American professional culture
   - Differences between how these concepts are discussed in American vs. Japanese professional contexts
   - Practical tips for Japanese professionals communicating about AI in English
   - Assign sequential IDs: culture_0, culture_1, etc.

4. COMPREHENSION CHECK (4-6 items):
   - Mix of vocabulary_match, fill_in_blank, sentence_order, and translation exercises
   - All exercises must be based on vocabulary and grammar from THIS lesson
   - Provide Japanese explanations for correct answers
   - For multiple choice, provide 3-4 options
   - correct_answer should be the text of the correct option (for multiple choice) or the correct text (for fill_in_blank/translation)
   - Assign sequential IDs: check_0, check_1, etc.

QUALITY STANDARDS:
- Japanese translations must be natural and accurate — not machine-translation quality
- Phonetic transcriptions must use IPA notation
- Usage sentences must sound natural and professional, not constructed for language learning
- Grammar explanations should acknowledge and address Japanese L1 interference patterns
- Cultural notes should be respectful and genuinely useful, not stereotyping
- All IDs must be sequential as specified above
- All audio_keys must follow the naming convention exactly

Call the submit_esl_content tool with your generated content.`;

// Tool definition that forces Claude to return structured JSON via tool_use
const ESL_CONTENT_TOOL = {
  name: 'submit_esl_content',
  description: 'Submit the generated ESL learning content for a course week',
  input_schema: {
    type: 'object' as const,
    properties: {
      vocabulary: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            term_en: { type: 'string' as const },
            reading_en: { type: 'string' as const },
            definition_en: { type: 'string' as const },
            definition_jp: { type: 'string' as const },
            term_jp: { type: 'string' as const },
            part_of_speech: { type: 'string' as const, enum: ['noun', 'verb', 'adjective', 'adverb', 'phrase'] },
            difficulty: { type: 'string' as const, enum: ['essential', 'intermediate', 'advanced'] },
            usage_sentences: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                properties: {
                  sentence_en: { type: 'string' as const },
                  sentence_jp: { type: 'string' as const },
                  highlight_indices: { type: 'array' as const, items: { type: 'number' as const } },
                },
                required: ['sentence_en', 'sentence_jp', 'highlight_indices'],
              },
            },
            notes_jp: { type: 'string' as const },
            audio_keys: {
              type: 'object' as const,
              properties: {
                word: { type: 'string' as const },
                sentences: { type: 'array' as const, items: { type: 'string' as const } },
              },
              required: ['word', 'sentences'],
            },
          },
          required: ['id', 'term_en', 'reading_en', 'definition_en', 'definition_jp', 'term_jp', 'part_of_speech', 'difficulty', 'usage_sentences', 'audio_keys'],
        },
      },
      grammar: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            title_en: { type: 'string' as const },
            title_jp: { type: 'string' as const },
            explanation_en: { type: 'string' as const },
            explanation_jp: { type: 'string' as const },
            pattern: { type: 'string' as const },
            examples: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                properties: {
                  sentence_en: { type: 'string' as const },
                  sentence_jp: { type: 'string' as const },
                  annotation_jp: { type: 'string' as const },
                },
                required: ['sentence_en', 'sentence_jp'],
              },
            },
            common_mistakes_jp: { type: 'string' as const },
            audio_keys: {
              type: 'object' as const,
              properties: {
                examples: { type: 'array' as const, items: { type: 'string' as const } },
              },
              required: ['examples'],
            },
          },
          required: ['id', 'title_en', 'title_jp', 'explanation_en', 'explanation_jp', 'pattern', 'examples', 'audio_keys'],
        },
      },
      cultural_notes: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            title_en: { type: 'string' as const },
            title_jp: { type: 'string' as const },
            content_en: { type: 'string' as const },
            content_jp: { type: 'string' as const },
            category: { type: 'string' as const, enum: ['professional', 'cultural', 'linguistic'] },
            tip_jp: { type: 'string' as const },
          },
          required: ['id', 'title_en', 'title_jp', 'content_en', 'content_jp', 'category'],
        },
      },
      comprehension: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            type: { type: 'string' as const, enum: ['vocabulary_match', 'fill_in_blank', 'sentence_order', 'translation'] },
            question_en: { type: 'string' as const },
            question_jp: { type: 'string' as const },
            options: { type: 'array' as const, items: { type: 'string' as const } },
            correct_answer: { oneOf: [{ type: 'string' as const }, { type: 'number' as const }] },
            explanation_jp: { type: 'string' as const },
          },
          required: ['id', 'type', 'question_en', 'question_jp', 'correct_answer', 'explanation_jp'],
        },
      },
    },
    required: ['vocabulary', 'grammar', 'cultural_notes', 'comprehension'],
  },
};

function buildESLUserPrompt(context: WeekESLContext): string {
  const vocabCount =
    context.esl_settings.vocab_depth === 'essential' ? '8-12' : '15-20';
  const grammarCount = context.esl_settings.grammar_count;

  const lines = [
    `Generate ESL learning content from the following AI course week material.`,
    ``,
    `Course: ${context.course_description_en}`,
    `Course Level: ${context.course_level}`,
    ``,
    `Week ${context.week_number}: ${context.week_title_en}`,
  ];

  if (context.week_title_jp) {
    lines.push(`(JP: ${context.week_title_jp})`);
  }

  if (context.session_titles.length > 0) {
    lines.push(``, `Sessions this week:`);
    context.session_titles.forEach((title, i) => {
      lines.push(`  ${i + 1}. ${title}`);
    });
  }

  if (context.session_topics.length > 0) {
    lines.push(``, `Topics covered:`);
    context.session_topics.forEach((topic) => {
      lines.push(`  - ${topic}`);
    });
  }

  if (context.course_vocabulary.length > 0) {
    lines.push(``, `Existing course vocabulary for this week:`);
    context.course_vocabulary.forEach((v) => {
      lines.push(`  - ${v.term_en} / ${v.term_jp}`);
    });
  }

  lines.push(
    ``,
    `Settings:`,
    `- Target language: Japanese`,
    `- Vocabulary items: ${vocabCount}`,
    `- Grammar points: ${grammarCount}`,
    `- Include cultural notes: ${context.esl_settings.include_cultural ? 'Yes' : 'No'}`,
  );

  return lines.join('\n');
}

export async function generateESLForWeek(
  context: WeekESLContext,
): Promise<GeneratedESLContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      system: ESL_GENERATION_SYSTEM_PROMPT,
      tools: [ESL_CONTENT_TOOL],
      tool_choice: { type: 'tool', name: 'submit_esl_content' },
      messages: [
        {
          role: 'user',
          content: buildESLUserPrompt(context),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${errorText}`);
  }

  const result = await response.json();
  const toolUseBlock = result.content?.find(
    (block: { type: string }) => block.type === 'tool_use',
  );

  if (!toolUseBlock?.input) {
    throw new Error('No tool_use response from Claude API');
  }

  // tool_use input is already a parsed object — no JSON.parse needed
  const validated = generatedESLContentSchema.parse(toolUseBlock.input);

  return validated;
}
