import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'auth.json');

let cache = {
  credentials: {},
  verifications: {},
  passwordResets: {}
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2));
    return;
  }
  try {
    const fileData = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(fileData);
    if (parsed && typeof parsed === 'object') {
      cache.credentials = parsed.credentials && typeof parsed.credentials === 'object' ? parsed.credentials : {};
      cache.verifications = parsed.verifications && typeof parsed.verifications === 'object' ? parsed.verifications : {};
      cache.passwordResets = parsed.passwordResets && typeof parsed.passwordResets === 'object' ? parsed.passwordResets : {};
    }
  } catch (err) {
    console.warn('Unable to load auth store, starting fresh.', err);
  }
}

function persistStore() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2));
}

export function initAuthStore() {
  ensureStore();
  return cache;
}

export function getCredential(email) {
  return cache.credentials[email] || null;
}

export function getCredentialByUserId(userId) {
  if (!userId) return null;
  for (const credential of Object.values(cache.credentials)) {
    if (credential?.userId === userId) {
      return credential;
    }
  }
  return null;
}

export function updateCredentialByUserId(userId, payload) {
  if (!userId || !payload || typeof payload !== 'object') return null;

  let currentEmailKey = null;
  let currentCredential = null;
  for (const [emailKey, credential] of Object.entries(cache.credentials)) {
    if (credential?.userId === userId) {
      currentEmailKey = emailKey;
      currentCredential = credential;
      break;
    }
  }

  if (!currentEmailKey || !currentCredential) {
    return null;
  }

  const targetEmail =
    typeof payload.email === 'string' && payload.email.trim()
      ? payload.email.trim()
      : currentCredential.email || currentEmailKey;

  const merged = {
    ...currentCredential,
    ...payload,
    email: targetEmail
  };

  if (targetEmail !== currentEmailKey) {
    delete cache.credentials[currentEmailKey];
  }
  cache.credentials[targetEmail] = merged;
  persistStore();
  return cache.credentials[targetEmail];
}

export function saveCredential(email, payload) {
  const existing = cache.credentials[email] || {};
  cache.credentials[email] = {
    userId: payload.userId,
    password: typeof payload.password === 'string' ? payload.password : existing.password || '',
    passwordHash: typeof payload.passwordHash === 'string' ? payload.passwordHash : existing.passwordHash || '',
    passwordSalt: typeof payload.passwordSalt === 'string' ? payload.passwordSalt : existing.passwordSalt || '',
    provider: payload.provider || existing.provider || 'local',
    googleSub: payload.googleSub || existing.googleSub || null,
    username: typeof payload.username === 'string' ? payload.username : existing.username || '',
    birthDate: typeof payload.birthDate === 'string' ? payload.birthDate : existing.birthDate || '',
    gender: typeof payload.gender === 'string' ? payload.gender : existing.gender || '',
    email: typeof payload.email === 'string' ? payload.email : existing.email || email,
    passwordUpdatedAt: payload.passwordUpdatedAt || existing.passwordUpdatedAt || null,
    verifiedAt: payload.verifiedAt || existing.verifiedAt || new Date().toISOString()
  };
  persistStore();
  return cache.credentials[email];
}

export function getVerification(email) {
  return cache.verifications[email] || null;
}

export function saveVerification(email, payload) {
  cache.verifications[email] = {
    password: payload.password || '',
    passwordHash: payload.passwordHash || '',
    passwordSalt: payload.passwordSalt || '',
    codeHash: payload.codeHash,
    expiresAt: payload.expiresAt,
    firstName: payload.firstName || '',
    lastName: payload.lastName || '',
    username: payload.username || '',
    birthDate: payload.birthDate || '',
    gender: payload.gender || '',
    email: payload.email || email,
    attemptCount: payload.attemptCount ?? 0,
    createdAt: payload.createdAt || new Date().toISOString()
  };
  persistStore();
  return cache.verifications[email];
}

export function incrementVerificationAttempt(email) {
  const current = cache.verifications[email];
  if (!current) return null;
  current.attemptCount = (current.attemptCount || 0) + 1;
  persistStore();
  return current;
}

export function clearVerification(email) {
  if (cache.verifications[email]) {
    delete cache.verifications[email];
    persistStore();
  }
}

export function getPasswordReset(email) {
  return cache.passwordResets[email] || null;
}

export function savePasswordReset(email, payload) {
  cache.passwordResets[email] = {
    tokenHash: payload.tokenHash,
    expiresAt: payload.expiresAt,
    createdAt: payload.createdAt || new Date().toISOString(),
    usedAt: payload.usedAt || null
  };
  persistStore();
  return cache.passwordResets[email];
}

export function clearPasswordReset(email) {
  if (cache.passwordResets[email]) {
    delete cache.passwordResets[email];
    persistStore();
  }
}
