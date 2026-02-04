import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { riasecItems } from './riasecItems.js';
import { loadMajorsFromWorkbook, getAllMajors, getRecommendations } from './majorService.js';
import { initUserStore, getOrCreateUser, getUserById, getUserResults, recordUserResult } from './userStore.js';
import {
  initAuthStore,
  getCredential,
  saveCredential
} from './authStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5001;

loadMajorsFromWorkbook();
initUserStore();
initAuthStore();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isStrongPassword = (value) => {
  return (
    typeof value === 'string' &&
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
};

const normalizeEmail = (email) => email.toString().trim().toLowerCase();

const toNameParts = (email) => {
  const [localPart = 'User'] = email.split('@');
  const normalized = localPart.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  const name = parts[0] || 'User';
  const surname = parts.slice(1).join(' ') || 'Account';
  return { name, surname };
};

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/images', express.static(path.resolve(__dirname, '../assets/images')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/questions', (req, res) => {
  res.json({ total: riasecItems.length, questions: riasecItems });
});

app.get('/api/majors/all', (req, res) => {
  const majors = getAllMajors();
  res.json({ total: majors.length, majors });
});

app.post('/api/login', (req, res) => {
  try {
    const { name, surname, email, password } = req.body || {};
    if (email && password) {
      const normalizedEmail = normalizeEmail(email);
      const account = getCredential(normalizedEmail);
      if (!account || account.password !== password) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const user = getUserById(account.userId);
      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }
      const results = getUserResults(user.id);
      return res.json({ user: { id: user.id, name: user.name, surname: user.surname }, results });
    }

    const user = getOrCreateUser(name, surname);
    const results = getUserResults(user.id);
    res.json({ user: { id: user.id, name: user.name, surname: user.surname }, results });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Unable to login' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email and password are required.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include uppercase, number, and special character.'
      });
    }

    const normalizedEmail = normalizeEmail(email);
    if (getCredential(normalizedEmail)) {
      return res.status(409).json({ error: 'This email is already registered.' });
    }

    const { name, surname } = toNameParts(normalizedEmail);
    const user = getOrCreateUser(name, surname);
    saveCredential(normalizedEmail, { userId: user.id, password });
    const results = getUserResults(user.id);
    res.json({ ok: true, user: { id: user.id, name: user.name, surname: user.surname }, results });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Unable to register' });
  }
});

app.get('/api/users/:userId/results', (req, res) => {
  try {
    const { userId } = req.params;
    const results = getUserResults(userId);
    res.json({ results });
  } catch (err) {
    res.status(404).json({ error: err.message || 'Unable to load results' });
  }
});

app.post('/api/users/:userId/results', (req, res) => {
  try {
    const { userId } = req.params;
    const { profile, scores, answers, recommendations } = req.body || {};
    if (!profile || typeof profile !== 'string') {
      return res.status(400).json({ error: 'profile is required' });
    }
    if (!scores || typeof scores !== 'object') {
      return res.status(400).json({ error: 'scores object is required' });
    }
    if (!Array.isArray(recommendations)) {
      return res.status(400).json({ error: 'recommendations array is required' });
    }
    const stored = recordUserResult(userId, {
      profile,
      scores,
      answers: answers && typeof answers === 'object' ? answers : {},
      recommendations
    });
    res.json({ result: stored });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Unable to save result' });
  }
});

app.post('/api/recommend', (req, res) => {
  const { profile, limit = 15 } = req.body || {};
  console.log("Received profile from frontend:", profile);
  if (!profile || typeof profile !== 'string') {
    return res.status(400).json({ error: 'profile string is required' });
  }
  const formattedProfile = profile.toUpperCase().replace(/[^RIASEC]/g, '').slice(0, 6);
  if (!formattedProfile) {
    return res.status(400).json({ error: 'profile must contain RIASEC letters' });
  }

  const recommendations = getRecommendations(formattedProfile, limit);
  res.json({ profile: formattedProfile, recommendations });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`RIASEC backend running on port ${PORT}`);
});
