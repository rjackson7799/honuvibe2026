/**
 * Template-based discussion question generation and vocabulary extraction
 * for teacher prep materials. No AI/LLM calls — instant and predictable.
 */

const questionTemplatesEn = [
  (topic: string) => `What are the key challenges students might face when learning about ${topic}?`,
  (topic: string) => `How does ${topic} relate to real-world applications?`,
  (topic: string) => `What common misconceptions should you watch for when teaching ${topic}?`,
  (topic: string) => `How can you check student understanding of ${topic} during the session?`,
  (topic: string) => `What examples or demonstrations would best illustrate ${topic}?`,
];

const questionTemplatesJa = [
  (topic: string) => `${topic}を学ぶ際に、学生が直面する主な課題は何ですか？`,
  (topic: string) => `${topic}は実際の応用とどのように関連していますか？`,
  (topic: string) => `${topic}を教える際に注意すべきよくある誤解は何ですか？`,
  (topic: string) => `セッション中に${topic}の理解度をどのように確認できますか？`,
  (topic: string) => `${topic}を最もよく説明する例やデモンストレーションは何ですか？`,
];

/**
 * Generate 2-3 discussion questions for a topic based on its title and subtopics.
 * Rotates through templates based on topic index to ensure variety across sessions.
 */
export function getDiscussionQuestions(
  topicTitle: string,
  subtopics: string[],
  topicIndex: number,
  locale: string,
): string[] {
  const templates = locale === 'ja' ? questionTemplatesJa : questionTemplatesEn;
  const count = subtopics.length > 2 ? 3 : 2;
  const questions: string[] = [];

  for (let i = 0; i < count; i++) {
    const templateIndex = (topicIndex * 2 + i) % templates.length;
    // Use topic title for first question, a subtopic for subsequent ones if available
    const subject = i === 0 || subtopics.length === 0
      ? topicTitle
      : subtopics[i % subtopics.length];
    questions.push(templates[templateIndex](subject));
  }

  return questions;
}

/**
 * Extract key vocabulary terms from topic titles and subtopics.
 * Identifies terms that are likely technical or domain-specific
 * (multi-word proper nouns, terms with special characters, acronyms, etc.)
 */
export function extractKeyVocabulary(
  topics: { title: string; subtopics: string[] }[],
): string[] {
  const terms = new Set<string>();

  for (const topic of topics) {
    // Add topic title itself as a key term
    terms.add(topic.title);

    for (const sub of topic.subtopics) {
      // Extract terms that look technical:
      // - Contain uppercase letters mid-word (camelCase, API, etc.)
      // - Contain special characters (., /, -)
      // - Are quoted
      const quoted = sub.match(/"([^"]+)"|'([^']+)'/g);
      if (quoted) {
        for (const q of quoted) {
          terms.add(q.replace(/['"]/g, ''));
        }
      }

      // Extract acronyms (2+ uppercase letters)
      const acronyms = sub.match(/\b[A-Z]{2,}\b/g);
      if (acronyms) {
        for (const a of acronyms) terms.add(a);
      }

      // Terms with technical indicators
      const techTerms = sub.match(/\b\w+(?:\.\w+)+\b/g); // dotted notation like next.js
      if (techTerms) {
        for (const t of techTerms) terms.add(t);
      }
    }
  }

  return Array.from(terms).slice(0, 15); // Cap at 15 terms
}
