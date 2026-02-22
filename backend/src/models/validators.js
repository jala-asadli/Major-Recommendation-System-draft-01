const LETTERS = new Set(['R', 'I', 'A', 'S', 'E', 'C']);
const GENDERS = new Set(['male', 'female', 'other', 'prefer_not']);
const EDUCATION_LEVELS = new Set([
  'middle_school',
  'high_school',
  'associate',
  'bachelor',
  'master',
  'doctorate',
  'other',
  'unknown',
  'ibtidai təhsil',
  'orta təhsil',
  'tam orta təhsil',
  'subbakalavr',
  'bakalavr',
  'magistr'
]);
const SUBJECT_PATTERN = /^\p{L}[\p{L}\s-]*$/u;

export function assertNonEmptyString(value, field, maxLength) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  if (maxLength && normalized.length > maxLength) {
    throw new Error(`${field} must be <= ${maxLength} characters`);
  }
  return normalized;
}

export function assertScore(value, field) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return parsed;
}

export function assertProfile(value) {
  const profile = String(value || '')
    .trim()
    .toUpperCase();

  if (profile.length !== 6) {
    throw new Error('riasec_profile must contain exactly 6 letters');
  }
  for (const letter of profile) {
    if (!LETTERS.has(letter)) {
      throw new Error('riasec_profile may only contain R, I, A, S, E, C');
    }
  }
  if (new Set(profile.split('')).size !== 6) {
    throw new Error('riasec_profile must include each of R, I, A, S, E, C exactly once');
  }
  return profile;
}

export function assertOptionsString(value) {
  const normalized = assertNonEmptyString(value, 'options', 10).toUpperCase();
  const parts = normalized.split(',');
  if (parts.length !== 3) {
    throw new Error('options must have exactly 3 comma-separated letters');
  }
  for (const part of parts) {
    if (!LETTERS.has(part)) {
      throw new Error('options may only contain R, I, A, S, E, C letters');
    }
  }
  if (new Set(parts).size !== 3) {
    throw new Error('options must contain 3 distinct letters');
  }
  return parts.join(',');
}

export function assertQuestionId(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!/^Q\d{2}$/.test(normalized)) {
    throw new Error('question_id must match Q01..Q30 format');
  }
  const ordinal = Number.parseInt(normalized.slice(1), 10);
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 30) {
    throw new Error('question_id must be between Q01 and Q30');
  }
  return normalized;
}

export function assertChosenPosition(value) {
  const position = Number.parseInt(String(value), 10);
  if (!Number.isInteger(position) || position < 1 || position > 3) {
    throw new Error('chosen_position must be an integer between 1 and 3');
  }
  return position;
}

export function assertResponseTimeSec(value) {
  const num = Number.parseFloat(String(value));
  if (!Number.isFinite(num) || num < 0 || num > 600) {
    throw new Error('response_time_sec must be a number between 0 and 600');
  }
  return Number(num.toFixed(2));
}

export function assertChosenCodeInOptions(chosenCode, options) {
  const code = String(chosenCode || '')
    .trim()
    .toUpperCase();
  if (!LETTERS.has(code)) {
    throw new Error('chosen_code must be one of R, I, A, S, E, C');
  }
  const parts = options.split(',');
  if (!parts.includes(code)) {
    throw new Error('chosen_code must be one of the options');
  }
  return code;
}

export function assertGender(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (!GENDERS.has(normalized)) {
    throw new Error(`gender must be one of: ${Array.from(GENDERS).join(', ')}`);
  }
  return normalized;
}

export function assertEducationLevel(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    throw new Error(`education_level must be one of: ${Array.from(EDUCATION_LEVELS).join(', ')}`);
  }
  const normalized = raw.toLowerCase();
  if (!EDUCATION_LEVELS.has(normalized)) {
    throw new Error(`education_level must be one of: ${Array.from(EDUCATION_LEVELS).join(', ')}`);
  }
  return raw;
}

export function assertSubject(value, field, { optional = false } = {}) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    if (optional) return null;
    throw new Error(`${field} is required`);
  }
  if (normalized.length > 30) {
    throw new Error(`${field} must be <= 30 characters`);
  }
  if (!SUBJECT_PATTERN.test(normalized)) {
    throw new Error(`${field} must contain only letters, spaces, or hyphen`);
  }
  return normalized;
}

export function assertSatisfactionScore(value) {
  const score = Number.parseInt(String(value), 10);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error('satisfaction_score must be an integer between 1 and 5');
  }
  return score;
}
