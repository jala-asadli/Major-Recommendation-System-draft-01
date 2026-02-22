import { getDb } from '../db.js';
import { assertEducationLevel, assertGender, assertNonEmptyString, assertProfile, assertSatisfactionScore, assertScore, assertSubject } from './validators.js';

function validateScores(scores) {
  return {
    R: assertScore(scores?.R, 'R_score'),
    I: assertScore(scores?.I, 'I_score'),
    A: assertScore(scores?.A, 'A_score'),
    S: assertScore(scores?.S, 'S_score'),
    E: assertScore(scores?.E, 'E_score'),
    C: assertScore(scores?.C, 'C_score')
  };
}

function assertFinalizedQuizData(data) {
  const sum = data.scores.R + data.scores.I + data.scores.A + data.scores.S + data.scores.E + data.scores.C;
  if (sum !== 30) {
    throw new Error(`RIASEC score sum must equal 30, received ${sum}`);
  }
  if (!data.riasec_profile) {
    throw new Error('riasec_profile is required when quiz is finalized');
  }
}

function validateUserPayload(payload, { requireFinalizedQuiz = false } = {}) {
  const firstName = assertNonEmptyString(payload?.first_name, 'first_name', 50);
  const lastName = assertNonEmptyString(payload?.last_name, 'last_name', 50);
  const gender = payload?.gender == null || payload?.gender === '' ? null : assertGender(payload?.gender);
  const educationLevel = payload?.education_level == null || payload?.education_level === '' ? null : assertEducationLevel(payload?.education_level);
  const favoriteSubject1 = payload?.favorite_subject_1 == null || payload?.favorite_subject_1 === '' ? null : assertSubject(payload?.favorite_subject_1, 'favorite_subject_1');
  const favoriteSubject2 = assertSubject(payload?.favorite_subject_2, 'favorite_subject_2', { optional: true });
  const hasScores = payload?.scores && typeof payload.scores === 'object';
  const scores = hasScores ? validateScores(payload.scores) : { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const riasecProfile = payload?.riasec_profile ? assertProfile(payload?.riasec_profile) : 'RIASEC';
  const chosenMajor = payload?.chosen_major == null || payload?.chosen_major === '' ? null : assertNonEmptyString(payload?.chosen_major, 'chosen_major', 150);
  const satisfaction = payload?.satisfaction_score == null || payload?.satisfaction_score === '' ? null : assertSatisfactionScore(payload?.satisfaction_score);

  const normalized = {
    first_name: firstName,
    last_name: lastName,
    gender,
    education_level: educationLevel,
    favorite_subject_1: favoriteSubject1,
    favorite_subject_2: favoriteSubject2,
    scores,
    riasec_profile: riasecProfile,
    chosen_major: chosenMajor,
    satisfaction_score: satisfaction
  };

  if (requireFinalizedQuiz) {
    assertFinalizedQuizData(normalized);
  }

  return normalized;
}

export async function createUserRecord(payload, dbClient = null, options = {}) {
  const db = dbClient || (await getDb());
  const data = validateUserPayload(payload, options);
  const userId = assertNonEmptyString(payload?.user_id, 'user_id', 128);

  await db.run(
    `INSERT INTO users (
      user_id, first_name, last_name, gender, education_level, favorite_subject_1, favorite_subject_2,
      R_score, I_score, A_score, S_score, E_score, C_score, riasec_profile, chosen_major, satisfaction_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.first_name,
      data.last_name,
      data.gender,
      data.education_level,
      data.favorite_subject_1,
      data.favorite_subject_2,
      data.scores.R,
      data.scores.I,
      data.scores.A,
      data.scores.S,
      data.scores.E,
      data.scores.C,
      data.riasec_profile,
      data.chosen_major,
      data.satisfaction_score
    ]
  );

  return getUserRecordById(userId, db);
}

export async function getUserRecordById(userId, dbClient = null) {
  const db = dbClient || (await getDb());
  const normalizedUserId = assertNonEmptyString(userId, 'user_id', 128);

  return db.get('SELECT * FROM users WHERE user_id = ?', [normalizedUserId]);
}

export async function listUserRecords({ limit = 100, offset = 0 } = {}, dbClient = null) {
  const db = dbClient || (await getDb());
  const safeLimit = Math.max(1, Math.min(500, Number.parseInt(String(limit), 10) || 100));
  const safeOffset = Math.max(0, Number.parseInt(String(offset), 10) || 0);

  return db.all('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', [safeLimit, safeOffset]);
}

export async function updateUserRecord(userId, updates, dbClient = null) {
  const db = dbClient || (await getDb());
  const existing = await getUserRecordById(userId, db);
  if (!existing) {
    throw new Error('User record not found');
  }

  const mergedPayload = {
    first_name: updates?.first_name ?? existing.first_name,
    last_name: updates?.last_name ?? existing.last_name,
    gender: updates?.gender ?? existing.gender,
    education_level: updates?.education_level ?? existing.education_level,
    favorite_subject_1: updates?.favorite_subject_1 ?? existing.favorite_subject_1,
    favorite_subject_2: updates?.favorite_subject_2 ?? existing.favorite_subject_2,
    scores: {
      R: updates?.scores?.R ?? updates?.R_score ?? existing.R_score,
      I: updates?.scores?.I ?? updates?.I_score ?? existing.I_score,
      A: updates?.scores?.A ?? updates?.A_score ?? existing.A_score,
      S: updates?.scores?.S ?? updates?.S_score ?? existing.S_score,
      E: updates?.scores?.E ?? updates?.E_score ?? existing.E_score,
      C: updates?.scores?.C ?? updates?.C_score ?? existing.C_score
    },
    riasec_profile: updates?.riasec_profile ?? existing.riasec_profile,
    chosen_major: updates?.chosen_major ?? existing.chosen_major,
    satisfaction_score: updates?.satisfaction_score ?? existing.satisfaction_score
  };

  const shouldRequireFinalizedQuiz = mergedPayload.riasec_profile != null || mergedPayload.chosen_major != null || mergedPayload.satisfaction_score != null;
  const data = validateUserPayload(mergedPayload, { requireFinalizedQuiz: shouldRequireFinalizedQuiz });

  await db.run(
    `UPDATE users SET
      first_name = ?,
      last_name = ?,
      gender = ?,
      education_level = ?,
      favorite_subject_1 = ?,
      favorite_subject_2 = ?,
      R_score = ?,
      I_score = ?,
      A_score = ?,
      S_score = ?,
      E_score = ?,
      C_score = ?,
      riasec_profile = ?,
      chosen_major = ?,
      satisfaction_score = ?
     WHERE user_id = ?`,
    [
      data.first_name,
      data.last_name,
      data.gender,
      data.education_level,
      data.favorite_subject_1,
      data.favorite_subject_2,
      data.scores.R,
      data.scores.I,
      data.scores.A,
      data.scores.S,
      data.scores.E,
      data.scores.C,
      data.riasec_profile,
      data.chosen_major,
      data.satisfaction_score,
      existing.user_id
    ]
  );

  return getUserRecordById(existing.user_id, db);
}

export async function deleteUserRecord(userId, dbClient = null) {
  const db = dbClient || (await getDb());
  const normalizedUserId = assertNonEmptyString(userId, 'user_id', 128);

  const result = await db.run('DELETE FROM users WHERE user_id = ?', [normalizedUserId]);
  return result.changes > 0;
}

export async function countUserRecords(dbClient = null) {
  const db = dbClient || (await getDb());
  const row = await db.get('SELECT COUNT(*) AS total FROM users');
  return row?.total || 0;
}
