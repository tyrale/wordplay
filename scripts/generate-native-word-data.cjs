#!/usr/bin/env node
/**
 * Generates the word-list data assets consumed by apps/native's dictionary
 * adapter (src/adapters/nativeAdapter.ts).
 *
 * apps/web's browser adapter fetches these files over HTTP at runtime from
 * apps/web/public/ (enable1.txt + data/*.json). React Native has no
 * static-file HTTP server to fetch from at runtime, so the native app needs
 * these bundled as importable JS/JSON modules instead - Metro bundles
 * `require()`d .json files directly, no runtime file I/O needed.
 *
 * apps/web/public/ remains the single source of truth for the word lists;
 * this script regenerates apps/native/assets/data/ from it. Re-run this
 * whenever the source word lists change:
 *
 *   node scripts/generate-native-word-data.cjs
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const WEB_PUBLIC_DIR = path.join(REPO_ROOT, 'apps/web/public');
const NATIVE_DATA_DIR = path.join(REPO_ROOT, 'apps/native/assets/data');

fs.mkdirSync(NATIVE_DATA_DIR, { recursive: true });

// enable1.txt -> enable1-words.json (array of uppercase words). Converting
// to JSON up front (rather than shipping the raw .txt and parsing it at
// runtime) keeps the native adapter's startup path simple: one
// `require()`, no text-splitting on every cold start.
const enableText = fs.readFileSync(path.join(WEB_PUBLIC_DIR, 'enable1.txt'), 'utf-8');
const enableWords = enableText
  .split('\n')
  .map(word => word.trim().toUpperCase())
  .filter(word => word.length > 0);

fs.writeFileSync(
  path.join(NATIVE_DATA_DIR, 'enable1-words.json'),
  JSON.stringify(enableWords)
);
console.log(`Wrote enable1-words.json (${enableWords.length} words)`);

// The remaining word lists are already JSON with the same `{ "words": [...] }`
// shape the browser adapter expects - copy them through as-is (re-serialized
// to drop any source formatting/whitespace differences).
const jsonDataFiles = [
  'common-proper-nouns.json',
  'profanity-words.json',
  'seuss-words-canonical.json',
  'seuss-words-invented.json',
  'slang-words.json'
];

for (const filename of jsonDataFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(WEB_PUBLIC_DIR, 'data', filename), 'utf-8'));
  fs.writeFileSync(path.join(NATIVE_DATA_DIR, filename), JSON.stringify(data));
  console.log(`Wrote ${filename} (${(data.words || []).length} words)`);
}

console.log(`\nDone. Native word data written to ${path.relative(REPO_ROOT, NATIVE_DATA_DIR)}/`);
