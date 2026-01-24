import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAJORS_FILE = path.resolve(__dirname, '../majors_backend.xlsx');

let cachedMajors = [];
const PROFILE_WEIGHTS = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6];

// Parse the Excel sheet once on startup so later API calls are snappy.
export function loadMajorsFromWorkbook() {
  const workbook = XLSX.readFile(MAJORS_FILE);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: false
  });

  cachedMajors = rows
    .slice(1) // Skip the header row.
    .map(parseRow)
    .filter((entry) => entry.major && entry.codes.length > 0);

  return cachedMajors;
}

// Return a copy of majors to avoid accidental mutation from callers.
export function getAllMajors() {
  return cachedMajors.map((entry) => ({ ...entry, codes: [...entry.codes] }));
}

// Apply the weighted scoring logic described in the requirements.
export function scoreMajor(profileString, majorCodes) {
  if (!profileString) return 0;
  const profile = profileString
    .toUpperCase()
    .replace(/[^RIASEC]/g, '')
    .slice(0, PROFILE_WEIGHTS.length)
    .split('');

  if (profile.length === 0) return 0;

  const weightMap = new Map();
  profile.forEach((letter, idx) => {
    const weight = PROFILE_WEIGHTS[idx] ?? 0;
    if (weight > 0) {
      weightMap.set(letter, weight);
    }
  });

  let total = 0;
  majorCodes
    .map((code) => normalizeLetter(code))
    .filter(Boolean)
    .forEach((letter) => {
      const weight = weightMap.get(letter);
      if (weight) {
        total += weight;
      }
    });

  return total;
}

// Generate a sorted list of majors according to the provided profile.
export function getRecommendations(profileString, limit = 15) {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), cachedMajors.length) : Math.min(15, cachedMajors.length);
  const scored = cachedMajors.map((entry) => ({
    major: entry.major,
    code: entry.codes,
    score: scoreMajor(profileString, entry.codes)
  }));
  scored.sort((a, b) => b.score - a.score || a.major.localeCompare(b.major));
  return scored.slice(0, safeLimit);
}

function normalizeLetter(code) {
  if (!code) return '';
  const normalized = code.toString().trim().toUpperCase();
  return normalized ? normalized[0] : '';
}

function parseRow(row) {
  const [majorCell = '', codeCell = ''] = row;
  const major = String(majorCell || '').trim();
  const codeString = String(codeCell || '').trim();
  const codes = codeString
    .split('')
    .map((letter) => normalizeLetter(letter))
    .filter(Boolean);
  return { major, codes };
}
