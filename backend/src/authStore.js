import { getDb, withTransaction } from './db.js';

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

export async function initAuthStore() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS auth_credentials (
      email TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      password TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      password_salt TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT 'local',
      google_sub TEXT,
      username TEXT NOT NULL DEFAULT '',
      birth_date TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT '',
      password_updated_at TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth_verifications (
      email TEXT PRIMARY KEY,
      password TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      password_salt TEXT NOT NULL DEFAULT '',
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      username TEXT NOT NULL DEFAULT '',
      birth_date TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT '',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_password_resets (
      email TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      used_at TEXT
    );
  `);

  return true;
}

export async function getCredential(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const db = await getDb();
  const row = await db.get('SELECT * FROM auth_credentials WHERE email = ?', [normalizedEmail]);
  if (!row) return null;

  return {
    userId: row.user_id,
    password: row.password,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    provider: row.provider,
    googleSub: row.google_sub,
    username: row.username,
    birthDate: row.birth_date,
    gender: row.gender,
    email: row.email,
    passwordUpdatedAt: row.password_updated_at,
    verifiedAt: row.verified_at
  };
}

export async function getCredentialByUserId(userId) {
  if (!userId) return null;

  const db = await getDb();
  const row = await db.get('SELECT * FROM auth_credentials WHERE user_id = ? LIMIT 1', [userId]);
  if (!row) return null;

  return {
    userId: row.user_id,
    password: row.password,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    provider: row.provider,
    googleSub: row.google_sub,
    username: row.username,
    birthDate: row.birth_date,
    gender: row.gender,
    email: row.email,
    passwordUpdatedAt: row.password_updated_at,
    verifiedAt: row.verified_at
  };
}

export async function updateCredentialByUserId(userId, payload) {
  if (!userId || !payload || typeof payload !== 'object') return null;

  const current = await getCredentialByUserId(userId);
  if (!current) return null;

  const targetEmail = normalizeEmail(payload.email || current.email);
  if (!targetEmail) {
    throw new Error('Email is required');
  }

  const next = {
    userId,
    password: typeof payload.password === 'string' ? payload.password : current.password || '',
    passwordHash: typeof payload.passwordHash === 'string' ? payload.passwordHash : current.passwordHash || '',
    passwordSalt: typeof payload.passwordSalt === 'string' ? payload.passwordSalt : current.passwordSalt || '',
    provider: payload.provider || current.provider || 'local',
    googleSub: payload.googleSub ?? current.googleSub ?? null,
    username: typeof payload.username === 'string' ? payload.username : current.username || '',
    birthDate: typeof payload.birthDate === 'string' ? payload.birthDate : current.birthDate || '',
    gender: typeof payload.gender === 'string' ? payload.gender : current.gender || '',
    email: targetEmail,
    passwordUpdatedAt: payload.passwordUpdatedAt || current.passwordUpdatedAt || null,
    verifiedAt: payload.verifiedAt || current.verifiedAt || new Date().toISOString()
  };

  const db = await getDb();
  await db.run('DELETE FROM auth_credentials WHERE user_id = ?', [userId]);
  await db.run(
    `INSERT INTO auth_credentials (
      email, user_id, password, password_hash, password_salt, provider, google_sub,
      username, birth_date, gender, password_updated_at, verified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      next.email,
      next.userId,
      next.password,
      next.passwordHash,
      next.passwordSalt,
      next.provider,
      next.googleSub,
      next.username,
      next.birthDate,
      next.gender,
      next.passwordUpdatedAt,
      next.verifiedAt
    ]
  );

  return next;
}

export async function saveCredential(email, payload) {
  const normalizedEmail = normalizeEmail(email);
  const existing = (await getCredential(normalizedEmail)) || {};

  const next = {
    userId: payload.userId,
    password: typeof payload.password === 'string' ? payload.password : existing.password || '',
    passwordHash: typeof payload.passwordHash === 'string' ? payload.passwordHash : existing.passwordHash || '',
    passwordSalt: typeof payload.passwordSalt === 'string' ? payload.passwordSalt : existing.passwordSalt || '',
    provider: payload.provider || existing.provider || 'local',
    googleSub: payload.googleSub || existing.googleSub || null,
    username: typeof payload.username === 'string' ? payload.username : existing.username || '',
    birthDate: typeof payload.birthDate === 'string' ? payload.birthDate : existing.birthDate || '',
    gender: typeof payload.gender === 'string' ? payload.gender : existing.gender || '',
    email: typeof payload.email === 'string' ? normalizeEmail(payload.email) : existing.email || normalizedEmail,
    passwordUpdatedAt: payload.passwordUpdatedAt || existing.passwordUpdatedAt || null,
    verifiedAt: payload.verifiedAt || existing.verifiedAt || new Date().toISOString()
  };

  const firstName = String(payload?.firstName || '').trim() || 'Unknown';
  const lastName = String(payload?.lastName || '').trim() || 'Unknown';
  const normalizedUserGender = String(next.gender || '').trim() || null;

  await withTransaction(async (db) => {
    await db.run(
      `INSERT INTO auth_credentials (
        email, user_id, password, password_hash, password_salt, provider, google_sub,
        username, birth_date, gender, password_updated_at, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        user_id = excluded.user_id,
        password = excluded.password,
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt,
        provider = excluded.provider,
        google_sub = excluded.google_sub,
        username = excluded.username,
        birth_date = excluded.birth_date,
        gender = excluded.gender,
        password_updated_at = excluded.password_updated_at,
        verified_at = excluded.verified_at`,
      [
        next.email,
        next.userId,
        next.password,
        next.passwordHash,
        next.passwordSalt,
        next.provider,
        next.googleSub,
        next.username,
        next.birthDate,
        next.gender,
        next.passwordUpdatedAt,
        next.verifiedAt
      ]
    );

    await db.run(
      `INSERT INTO users (
        user_id, first_name, last_name, gender,
        R_score, I_score, A_score, S_score, E_score, C_score,
        riasec_profile, chosen_major, satisfaction_score
      ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL)
      ON CONFLICT (user_id) DO UPDATE SET
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        gender = COALESCE(excluded.gender, users.gender)`,
      [next.userId, firstName, lastName, normalizedUserGender]
    );
  });

  return next;
}

export async function getVerification(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const db = await getDb();
  const row = await db.get('SELECT * FROM auth_verifications WHERE email = ?', [normalizedEmail]);
  if (!row) return null;

  return {
    password: row.password,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    birthDate: row.birth_date,
    gender: row.gender,
    email: row.email,
    attemptCount: row.attempt_count,
    createdAt: row.created_at
  };
}

export async function saveVerification(email, payload) {
  const normalizedEmail = normalizeEmail(email);
  const next = {
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
    email: payload.email ? normalizeEmail(payload.email) : normalizedEmail,
    attemptCount: Number.isInteger(payload.attemptCount) ? payload.attemptCount : 0,
    createdAt: payload.createdAt || new Date().toISOString()
  };

  const db = await getDb();
  await db.run(
    `INSERT INTO auth_verifications (
      email, password, password_hash, password_salt, code_hash, expires_at,
      first_name, last_name, username, birth_date, gender, attempt_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      password = excluded.password,
      password_hash = excluded.password_hash,
      password_salt = excluded.password_salt,
      code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      username = excluded.username,
      birth_date = excluded.birth_date,
      gender = excluded.gender,
      attempt_count = excluded.attempt_count,
      created_at = excluded.created_at`,
    [
      next.email,
      next.password,
      next.passwordHash,
      next.passwordSalt,
      next.codeHash,
      next.expiresAt,
      next.firstName,
      next.lastName,
      next.username,
      next.birthDate,
      next.gender,
      next.attemptCount,
      next.createdAt
    ]
  );

  return next;
}

export async function incrementVerificationAttempt(email) {
  const normalizedEmail = normalizeEmail(email);
  const db = await getDb();
  await db.run('UPDATE auth_verifications SET attempt_count = attempt_count + 1 WHERE email = ?', [normalizedEmail]);
  return getVerification(normalizedEmail);
}

export async function clearVerification(email) {
  const normalizedEmail = normalizeEmail(email);
  const db = await getDb();
  await db.run('DELETE FROM auth_verifications WHERE email = ?', [normalizedEmail]);
}

export async function getPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const db = await getDb();
  const row = await db.get('SELECT * FROM auth_password_resets WHERE email = ?', [normalizedEmail]);
  if (!row) return null;

  return {
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    usedAt: row.used_at
  };
}

export async function savePasswordReset(email, payload) {
  const normalizedEmail = normalizeEmail(email);
  const next = {
    tokenHash: payload.tokenHash,
    expiresAt: payload.expiresAt,
    createdAt: payload.createdAt || new Date().toISOString(),
    usedAt: payload.usedAt || null
  };

  const db = await getDb();
  await db.run(
    `INSERT INTO auth_password_resets (email, token_hash, expires_at, created_at, used_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       token_hash = excluded.token_hash,
       expires_at = excluded.expires_at,
       created_at = excluded.created_at,
       used_at = excluded.used_at`,
    [normalizedEmail, next.tokenHash, next.expiresAt, next.createdAt, next.usedAt]
  );

  return next;
}

export async function clearPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);
  const db = await getDb();
  await db.run('DELETE FROM auth_password_resets WHERE email = ?', [normalizedEmail]);
}
