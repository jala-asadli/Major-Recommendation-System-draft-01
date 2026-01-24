import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 36 fully-defined quiz items derived from the required RIASEC code matrix.
// Image filenames follow the convention item-XX-opt-Y.<ext> found in assets/images
// where <ext> is jpg or png depending on the source artwork.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.resolve(__dirname, '../assets/images');

const PROMPTS = [
  'Which scene looks most energizing to you?',
  'Which activity would you volunteer for first?',
  'Which project would you confidently lead?',
  'Which situation best reflects your natural strengths?',
  'Which environment would you happily spend an afternoon in?',
  'Which challenge feels most aligned with you right now?'
];

const RIASEC_ITEMS = [
  { item: 1, codes: ['SR', 'AR', 'IR'] },
  { item: 2, codes: ['CR', 'RR', 'ER'] },
  { item: 3, codes: ['AS', 'IS', 'CS'] },
  { item: 4, codes: ['RS', 'ES', 'SS'] },
  { item: 5, codes: ['IR', 'CR', 'RR'] },
  { item: 6, codes: ['ER', 'SR', 'AR'] },
  { item: 7, codes: ['AS', 'CS', 'ES'] },
  { item: 8, codes: ['SS', 'IS', 'RS'] },
  { item: 9, codes: ['SR', 'AR', 'RR'] },
  { item: 10, codes: ['IR', 'CR', 'ER'] },
  { item: 11, codes: ['SS', 'AS', 'CS'] },
  { item: 12, codes: ['IS', 'RS', 'ES'] },
  { item: 13, codes: ['II', 'SI', 'AI'] },
  { item: 14, codes: ['EI', 'CI', 'RI'] },
  { item: 15, codes: ['CE', 'AE', 'IE'] },
  { item: 16, codes: ['SE', 'RE', 'EE'] },
  { item: 17, codes: ['RI', 'II', 'CI'] },
  { item: 18, codes: ['AI', 'EI', 'SI'] },
  { item: 19, codes: ['EE', 'AE', 'CE'] },
  { item: 20, codes: ['RE', 'SE', 'IE'] },
  { item: 21, codes: ['RI', 'SI', 'AI'] },
  { item: 22, codes: ['EI', 'II', 'CI'] },
  { item: 23, codes: ['CE', 'SE', 'AE'] },
  { item: 24, codes: ['EE', 'IE', 'RE'] },
  { item: 25, codes: ['AA', 'IA', 'SA'] },
  { item: 26, codes: ['RA', 'EA', 'CA'] },
  { item: 27, codes: ['IC', 'CC', 'AC'] },
  { item: 28, codes: ['EC', 'SE', 'RC'] },
  { item: 29, codes: ['CA', 'RA', 'IA'] },
  { item: 30, codes: ['SA', 'AA', 'EA'] },
  { item: 31, codes: ['CC', 'EC', 'AC'] },
  { item: 32, codes: ['IC', 'RC', 'SC'] },
  { item: 33, codes: ['AA', 'RA', 'SA'] },
  { item: 34, codes: ['CA', 'EA', 'IA'] },
  { item: 35, codes: ['AC', 'CC', 'SC'] },
  { item: 36, codes: ['RC', 'EC', 'IC'] }
];

const getOptionId = (item, optionIndex) => `${item}${String.fromCharCode(97 + optionIndex)}`;

const findImageWithExtension = (baseName) => {
  for (const ext of ['jpg', 'png']) {
    const diskPath = path.join(IMAGES_DIR, `${baseName}.${ext}`);
    if (existsSync(diskPath)) {
      return `/images/${baseName}.${ext}`;
    }
  }
  // Default to jpg path to keep API output predictable even if the file is missing.
  return `/images/${baseName}.jpg`;
};

const formatImagePath = (item, optionIndex) => {
  const paddedItem = String(item).padStart(2, '0');
  const humanOption = optionIndex + 1;
  const baseName = `item-${paddedItem}-opt-${humanOption}`;
  return findImageWithExtension(baseName);
};

export const riasecItems = RIASEC_ITEMS.map((entry, idx) => {
  const prompt = `${PROMPTS[idx % PROMPTS.length]} (Item ${entry.item})`;
  const options = entry.codes.map((code, optionIdx) => {
    return {
      id: getOptionId(entry.item, optionIdx),
      imageUrl: formatImagePath(entry.item, optionIdx),
      code,
      description: `Highlights the ${code} strengths`
    };
  });
  return {
    id: entry.item,
    prompt,
    options
  };
});
