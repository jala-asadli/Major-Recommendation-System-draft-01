import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 30 quiz items derived from the configured RIASEC category matrix.
// Image files are auto-discovered from assets/images using pattern:
// image_<LETTER><NUMBER>.<ext> where LETTER is one of R,I,A,S,E,C.

const PROMPTS = [
  'Which scene looks most energizing to you?',
  'Which activity would you volunteer for first?',
  'Which project would you confidently lead?',
  'Which situation best reflects your natural strengths?',
  'Which environment would you happily spend an afternoon in?',
  'Which challenge feels most aligned with you right now?'
];

export const CATEGORY_MATRIX = [
  ['R', 'I', 'A'],
  ['S', 'E', 'C'],
  ['R', 'S', 'E'],
  ['I', 'A', 'C'],
  ['R', 'E', 'C'],
  ['I', 'S', 'A'],
  ['R', 'A', 'S'],
  ['I', 'C', 'E'],
  ['R', 'I', 'C'],
  ['A', 'S', 'E'],
  ['R', 'S', 'C'],
  ['I', 'A', 'E'],
  ['R', 'A', 'E'],
  ['I', 'S', 'C'],
  ['R', 'I', 'S'],
  ['A', 'E', 'C'],
  ['R', 'C', 'A'],
  ['I', 'E', 'S'],
  ['R', 'E', 'A'],
  ['I', 'C', 'S'],
  ['R', 'S', 'A'],
  ['I', 'E', 'C'],
  ['R', 'A', 'I'],
  ['S', 'C', 'E'],
  ['R', 'C', 'S'],
  ['I', 'A', 'S'],
  ['R', 'E', 'I'],
  ['A', 'C', 'E'],
  ['R', 'S', 'I'],
  ['A', 'E', 'C']
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.resolve(__dirname, '../assets/images');

function buildImagePools() {
  const pools = { R: [], I: [], A: [], S: [], E: [], C: [] };
  const files = fs.existsSync(IMAGES_DIR) ? fs.readdirSync(IMAGES_DIR) : [];

  for (const filename of files) {
    const match = /^image_([RIASEC])(\d+)\.(jpg|jpeg|png|webp|avif)$/i.exec(filename);
    if (!match) continue;
    const letter = match[1].toUpperCase();
    const numeric = Number.parseInt(match[2], 10);
    pools[letter].push({
      numeric,
      url: `/images/${filename}`
    });
  }

  for (const letter of Object.keys(pools)) {
    pools[letter].sort((a, b) => a.numeric - b.numeric);
    pools[letter] = pools[letter].map((entry) => entry.url);
  }

  return pools;
}

const imagePools = buildImagePools();
const fallbackImageUrl =
  imagePools.R[0] || imagePools.I[0] || imagePools.A[0] || imagePools.S[0] || imagePools.E[0] || imagePools.C[0] || '';

let imageIndexTracker = {
  R: 0,
  I: 0,
  A: 0,
  S: 0,
  E: 0,
  C: 0
};

const getNextImage = (letter) => {
  const pool = imagePools[letter];
  if (!pool || pool.length === 0) {
    return fallbackImageUrl;
  }
  const index = imageIndexTracker[letter];
  imageIndexTracker[letter] += 1;
  return pool[index % pool.length];
};

export const riasecItems = CATEGORY_MATRIX.map((letters, idx) => {
  const itemId = idx + 1;
  return {
    id: itemId,
    prompt: `${PROMPTS[idx % PROMPTS.length]} (Item ${itemId})`,
    options: letters.map((letter, optionIdx) => ({
      id: `${itemId}${String.fromCharCode(97 + optionIdx)}`,
      imageUrl: getNextImage(letter),
      code: letter,
      description: `Represents ${letter} type`
    }))
  };
});
