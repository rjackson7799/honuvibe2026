/**
 * Seed Sanity with 100 AI glossary terms.
 * Usage: node scripts/seed-glossary.mjs
 */

import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// Parse .env.local manually (avoids dotenv dependency)
function loadEnv() {
  const envPath = resolve(rootDir, '.env.local');
  const env = {};
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      env[key] = value;
    }
  } catch {
    console.error('Could not read .env.local — make sure it exists in the project root.');
    process.exit(1);
  }
  return env;
}

const env = loadEnv();
const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const token = env.SANITY_API_TOKEN;

if (!projectId || !token) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_TOKEN in .env.local');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2026-02-21',
  token,
  useCdn: false,
});

function toSlug(term) {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  const dataPath = resolve(__dirname, 'data', 'glossary-terms.json');
  const terms = JSON.parse(readFileSync(dataPath, 'utf-8'));

  console.log(`Importing ${terms.length} glossary terms into Sanity (${projectId}/${dataset})...\n`);

  // Check for existing terms to avoid duplicates
  const existing = await client.fetch(
    `*[_type == "glossaryTerm"]{ "slug": slug.current, term_en }`
  );
  const existingSlugs = new Set(existing.map((t) => t.slug));

  if (existing.length > 0) {
    console.log(`Found ${existing.length} existing glossary terms. Skipping duplicates.\n`);
  }

  let created = 0;
  let skipped = 0;

  // Batch in groups of 20 to avoid transaction size limits
  const batchSize = 20;
  for (let i = 0; i < terms.length; i += batchSize) {
    const batch = terms.slice(i, i + batchSize);
    const tx = client.transaction();

    for (const term of batch) {
      const slug = toSlug(term.abbreviation || term.term_en);

      if (existingSlugs.has(slug)) {
        skipped++;
        continue;
      }

      const doc = {
        _type: 'glossaryTerm',
        term_en: term.term_en,
        term_jp: term.term_jp || undefined,
        abbreviation: term.abbreviation || undefined,
        reading_jp: term.reading_jp || undefined,
        slug: { _type: 'slug', current: slug },
        definition_short_en: term.definition_short_en,
        definition_short_jp: term.definition_short_jp || undefined,
        why_it_matters_en: term.why_it_matters_en || undefined,
        why_it_matters_jp: term.why_it_matters_jp || undefined,
        example_en: term.example_en || undefined,
        example_jp: term.example_jp || undefined,
        category: term.category,
        difficulty: term.difficulty,
        isPublished: true,
      };

      tx.create(doc);
      created++;
    }

    await tx.commit();
    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: committed ${Math.min(batchSize, terms.length - i)} terms`);
  }

  console.log(`\nDone! Created: ${created}, Skipped (duplicate): ${skipped}`);
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
