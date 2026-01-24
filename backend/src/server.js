import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { riasecItems } from './riasecItems.js';
import { loadMajorsFromWorkbook, getAllMajors, getRecommendations } from './majorService.js';
import { initUserStore, getOrCreateUser, getUserResults, recordUserResult } from './userStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5001;

loadMajorsFromWorkbook();
initUserStore();

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
    const { name, surname } = req.body || {};
    const user = getOrCreateUser(name, surname);
    const results = getUserResults(user.id);
    res.json({ user: { id: user.id, name: user.name, surname: user.surname }, results });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Unable to login' });
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
