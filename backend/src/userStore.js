import { randomBytes } from 'crypto';
import { getDb } from './db.js';

function normalizeName(value = '') {
  return value.toString().trim();
}

function normalizeKey(name, surname) {
  return `${normalizeName(name).toLowerCase()}|${normalizeName(surname).toLowerCase()}`;
}

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.user_id,
    name: row.first_name,
    surname: row.last_name,
    createdAt: row.created_at
  };
}

function generateUserId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export async function initUserStore() {
  return true;
}

export async function getOrCreateUser(rawName, rawSurname) {
  const name = normalizeName(rawName);
  const surname = normalizeName(rawSurname);
  if (!name || !surname) {
    throw new Error('Both name and surname are required');
  }

  const db = await getDb();
  const users = await db.all('SELECT user_id, first_name, last_name, created_at FROM users');
  const key = normalizeKey(name, surname);
  const existing = users.find((entry) => normalizeKey(entry.first_name, entry.last_name) === key);
  if (existing) {
    return {
      id: existing.user_id,
      name: existing.first_name,
      surname: existing.last_name,
      createdAt: existing.created_at,
      results: await getUserResults(existing.user_id)
    };
  }

  let userId = generateUserId();
  while (await db.get('SELECT user_id FROM users WHERE user_id = ?', [userId])) {
    userId = generateUserId();
  }

  const createdAt = new Date().toISOString();
  await db.run(
    `INSERT INTO users (
      user_id, first_name, last_name,
      R_score, I_score, A_score, S_score, E_score, C_score,
      riasec_profile, chosen_major, created_at
    ) VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 'RIASEC', NULL, ?)`,
    [userId, name, surname, createdAt]
  );

  return { id: userId, name, surname, createdAt, results: [] };
}

export async function getUserById(userId) {
  const db = await getDb();
  const row = await db.get('SELECT user_id, first_name, last_name, created_at FROM users WHERE user_id = ?', [userId]);
  return mapUserRow(row);
}

export async function getUserResults(userId) {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const db = await getDb();
  const userRow = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);
  const recommendations = await db.all(
    `SELECT recommendation_rank, recommendation_score, created_at, major_name
     FROM user_major_recommendations
     WHERE user_id = ?
     ORDER BY recommendation_rank ASC`,
    [userId]
  );

  if (!recommendations.length) {
    return [];
  }

  const createdAt = recommendations[0]?.created_at || userRow?.created_at;
  const result = {
    id: `${userId}-${Date.parse(String(createdAt || Date.now()))}`,
    profile: userRow?.riasec_profile || 'RIASEC',
    scores: {
      R: Number(userRow?.R_score ?? 0),
      I: Number(userRow?.I_score ?? 0),
      A: Number(userRow?.A_score ?? 0),
      S: Number(userRow?.S_score ?? 0),
      E: Number(userRow?.E_score ?? 0),
      C: Number(userRow?.C_score ?? 0)
    },
    answers: {},
    recommendations: recommendations.map((row) => ({
      major: row.major_name,
      code: [],
      score: Number(row.recommendation_score || 0)
    })),
    topMatch: recommendations[0]?.major_name || null,
    chosenMajor: userRow?.chosen_major || null,
    satisfactionScore: userRow?.satisfaction_score == null ? null : Number(userRow.satisfaction_score),
    createdAt
  };

  return [result];
}

export async function updateUserProfile(userId, payload) {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const nextName = typeof payload?.name === 'string' ? normalizeName(payload.name) : user.name;
  const nextSurname = typeof payload?.surname === 'string' ? normalizeName(payload.surname) : user.surname;

  if (!nextName) {
    throw new Error('Name is required');
  }
  if (!nextSurname) {
    throw new Error('Surname is required');
  }

  const db = await getDb();
  await db.run('UPDATE users SET first_name = ?, last_name = ? WHERE user_id = ?', [nextName, nextSurname, userId]);

  return {
    ...user,
    name: nextName,
    surname: nextSurname,
    results: await getUserResults(userId)
  };
}

export async function recordUserResult(userId, payload) {
  const results = await getUserResults(userId);
  if (results[0]) {
    return results[0];
  }

  const snapshot = payload?.userSnapshot || {};
  return {
    id: `${userId}-${Date.now()}`,
    profile: String(snapshot.riasec_profile || 'RIASEC'),
    scores: {
      R: Number(snapshot.R_score || 0),
      I: Number(snapshot.I_score || 0),
      A: Number(snapshot.A_score || 0),
      S: Number(snapshot.S_score || 0),
      E: Number(snapshot.E_score || 0),
      C: Number(snapshot.C_score || 0)
    },
    answers: payload?.answers || {},
    recommendations: payload?.recommendations || [],
    topMatch: payload?.recommendations?.[0]?.major || null,
    chosenMajor: snapshot?.chosen_major || null,
    satisfactionScore: snapshot.satisfaction_score == null ? null : Number(snapshot.satisfaction_score),
    createdAt: new Date().toISOString()
  };
}

export async function getTotalResultsCount() {
  const db = await getDb();
  const row = await db.get('SELECT COUNT(DISTINCT user_id) AS total FROM user_major_recommendations');
  return Number(row?.total || 0);
}
