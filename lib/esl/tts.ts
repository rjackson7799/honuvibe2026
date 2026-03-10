import { createClient } from '@supabase/supabase-js';
import type { ESLLessonWithAudio, ESLAudio, VocabularyItem, GrammarPoint } from './types';

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase service role credentials not configured');
  }
  return createClient(url, serviceKey);
}

interface TTSOptions {
  model?: 'tts-1' | 'tts-1-hd';
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

async function generateSingleAudio(
  text: string,
  referenceKey: string,
  storagePath: string,
  options: TTSOptions = {},
): Promise<{ publicUrl: string; durationSeconds: number | null }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const { model = 'tts-1', voice = 'nova', speed = 0.9 } = options;

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: 'mp3',
      speed,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS error: ${response.status} — ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const supabase = getStorageClient();

  const { error: uploadError } = await supabase.storage
    .from('esl-audio')
    .upload(storagePath, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload error: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('esl-audio')
    .getPublicUrl(storagePath);

  // Estimate duration from buffer size (128kbps mp3 ≈ 16KB/sec)
  const estimatedDuration = audioBuffer.byteLength / 16000;

  return {
    publicUrl: urlData.publicUrl,
    durationSeconds: Math.round(estimatedDuration * 10) / 10,
  };
}

// Concurrency limiter
async function withConcurrency<T>(
  items: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = item()
      .then((value) => {
        results.push({ status: 'fulfilled', value });
      })
      .catch((reason) => {
        results.push({ status: 'rejected', reason });
      })
      .finally(() => {
        executing.splice(executing.indexOf(p), 1);
      });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

export async function generateAllAudioForLesson(
  eslLesson: ESLLessonWithAudio,
  courseId: string,
  weekId: string,
  ttsVoice: TTSOptions['voice'] = 'nova',
): Promise<ESLAudio[]> {
  const supabase = getStorageClient();
  const basePath = `${courseId}/${weekId}`;
  const audioRecords: ESLAudio[] = [];

  // Collect all text items to generate audio for
  const tasks: (() => Promise<void>)[] = [];

  const vocabulary = (eslLesson.vocabulary_json ?? []) as VocabularyItem[];
  const grammar = (eslLesson.grammar_json ?? []) as GrammarPoint[];

  // Vocabulary words
  for (const vocab of vocabulary) {
    const wordKey = vocab.audio_keys.word;
    tasks.push(async () => {
      const { publicUrl, durationSeconds } = await generateSingleAudio(
        vocab.term_en,
        wordKey,
        `${basePath}/${wordKey}.mp3`,
        { voice: ttsVoice },
      );
      const { data } = await supabase
        .from('esl_audio')
        .insert({
          esl_lesson_id: eslLesson.id,
          reference_key: wordKey,
          storage_path: `${basePath}/${wordKey}.mp3`,
          public_url: publicUrl,
          duration_seconds: durationSeconds,
        })
        .select()
        .single();
      if (data) audioRecords.push(data as ESLAudio);
    });

    // Vocabulary usage sentences
    for (const sentenceKey of vocab.audio_keys.sentences) {
      const sentenceIndex = parseInt(sentenceKey.split('_').pop() ?? '0', 10);
      const sentence = vocab.usage_sentences[sentenceIndex];
      if (!sentence) continue;

      tasks.push(async () => {
        const { publicUrl, durationSeconds } = await generateSingleAudio(
          sentence.sentence_en,
          sentenceKey,
          `${basePath}/${sentenceKey}.mp3`,
          { voice: ttsVoice },
        );
        const { data } = await supabase
          .from('esl_audio')
          .insert({
            esl_lesson_id: eslLesson.id,
            reference_key: sentenceKey,
            storage_path: `${basePath}/${sentenceKey}.mp3`,
            public_url: publicUrl,
            duration_seconds: durationSeconds,
          })
          .select()
          .single();
        if (data) audioRecords.push(data as ESLAudio);
      });
    }
  }

  // Grammar examples
  for (const point of grammar) {
    for (const exampleKey of point.audio_keys.examples) {
      const exampleIndex = parseInt(exampleKey.split('_').pop() ?? '0', 10);
      const example = point.examples[exampleIndex];
      if (!example) continue;

      tasks.push(async () => {
        const { publicUrl, durationSeconds } = await generateSingleAudio(
          example.sentence_en,
          exampleKey,
          `${basePath}/${exampleKey}.mp3`,
          { voice: ttsVoice },
        );
        const { data } = await supabase
          .from('esl_audio')
          .insert({
            esl_lesson_id: eslLesson.id,
            reference_key: exampleKey,
            storage_path: `${basePath}/${exampleKey}.mp3`,
            public_url: publicUrl,
            duration_seconds: durationSeconds,
          })
          .select()
          .single();
        if (data) audioRecords.push(data as ESLAudio);
      });
    }
  }

  // Run with concurrency limit of 3
  await withConcurrency(tasks, 3);

  return audioRecords;
}
