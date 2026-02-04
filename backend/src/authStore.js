import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'auth.json');

let cache = {
  credentials: {},
  verifications: {}
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

export function saveCredential(email, payload) {
  cache.credentials[email] = {
    userId: payload.userId,
    password: payload.password,
    verifiedAt: payload.verifiedAt || new Date().toISOString()
  };
  persistStore();
  return cache.credentials[email];
}

export function getVerification(email) {
  return cache.verifications[email] || null;
}

export function saveVerification(email, payload) {
  cache.verifications[email] = {
    password: payload.password,
    codeHash: payload.codeHash,
    expiresAt: payload.expiresAt,
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
