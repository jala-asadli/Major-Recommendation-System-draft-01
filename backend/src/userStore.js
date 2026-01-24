import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

let cache = { users: [] };

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
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.users)) {
      cache.users = parsed.users;
    }
  } catch (err) {
    console.warn('Unable to load user store, starting fresh.', err);
  }
}

function persistStore() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2));
}

function normalizeName(value = '') {
  return value.toString().trim();
}

function normalizeKey(name, surname) {
  return `${normalizeName(name).toLowerCase()}|${normalizeName(surname).toLowerCase()}`;
}

export function initUserStore() {
  ensureStore();
  return cache;
}

export function getOrCreateUser(rawName, rawSurname) {
  const name = normalizeName(rawName);
  const surname = normalizeName(rawSurname);
  if (!name || !surname) {
    throw new Error('Both name and surname are required');
  }

  const key = normalizeKey(name, surname);
  let user = cache.users.find((entry) => normalizeKey(entry.name, entry.surname) === key);
  if (!user) {
    user = {
      id: randomUUID(),
      name,
      surname,
      createdAt: new Date().toISOString(),
      results: []
    };
    cache.users.push(user);
    persistStore();
  }

  return { ...user, results: [...(user.results || [])] };
}

export function getUserById(userId) {
  return cache.users.find((user) => user.id === userId);
}

export function getUserResults(userId) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return [...(user.results || [])];
}

export function recordUserResult(userId, payload) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  const storedResult = {
    id: randomUUID(),
    profile: payload.profile,
    scores: payload.scores,
    answers: payload.answers,
    recommendations: payload.recommendations,
    createdAt: new Date().toISOString()
  };
  if (Array.isArray(user.results)) {
    user.results.unshift(storedResult);
  } else {
    user.results = [storedResult];
  }
  persistStore();
  return storedResult;
}
