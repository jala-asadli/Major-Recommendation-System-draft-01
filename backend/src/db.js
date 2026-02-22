import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'riasec.db');
const SCHEMA_FILE = path.resolve(__dirname, '../db/schema.sql');

let dbPromise = null;
let transactionQueue = Promise.resolve();

export async function getDb() {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}

async function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

async function ensureUsersRiasecProfileNullable(db) {
  const usersTable = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'");
  if (!usersTable) return;

  const usersColumns = await db.all('PRAGMA table_info(users)');
  const riasecColumn = usersColumns.find((column) => column.name === 'riasec_profile');
  if (!riasecColumn || Number(riasecColumn.notnull || 0) === 0) {
    return;
  }

  await db.exec('PRAGMA foreign_keys = OFF;');
  await db.exec('BEGIN');
  try {
    await db.exec(`
      CREATE TABLE users__new (
        user_id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        gender TEXT,
        education_level TEXT,
        favorite_subject_1 TEXT,
        favorite_subject_2 TEXT,
        R_score INTEGER CHECK (R_score >= 0),
        I_score INTEGER CHECK (I_score >= 0),
        A_score INTEGER CHECK (A_score >= 0),
        S_score INTEGER CHECK (S_score >= 0),
        E_score INTEGER CHECK (E_score >= 0),
        C_score INTEGER CHECK (C_score >= 0),
        riasec_profile TEXT,
        chosen_major TEXT,
        satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.exec(`
      INSERT INTO users__new (
        user_id, first_name, last_name, gender, education_level, favorite_subject_1, favorite_subject_2,
        R_score, I_score, A_score, S_score, E_score, C_score, riasec_profile, chosen_major, satisfaction_score, created_at
      )
      SELECT
        user_id, first_name, last_name, gender, education_level, favorite_subject_1, favorite_subject_2,
        R_score, I_score, A_score, S_score, E_score, C_score, riasec_profile, chosen_major, satisfaction_score, created_at
      FROM users;
    `);

    await db.exec('DROP TABLE users;');
    await db.exec('ALTER TABLE users__new RENAME TO users;');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_users_riasec ON users(riasec_profile);');
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  } finally {
    await db.exec('PRAGMA foreign_keys = ON;');
  }
}

export async function runMigrations() {
  const db = await getDb();
  const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
  await db.exec(schemaSql);
  await ensureUsersRiasecProfileNullable(db);
}

export async function withTransaction(task) {
  const runTransaction = async () => {
    const db = await getDb();
    await db.exec('BEGIN');
    try {
      const result = await task(db);
      await db.exec('COMMIT');
      return result;
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  };

  const execution = transactionQueue.then(runTransaction, runTransaction);
  transactionQueue = execution.catch(() => {});
  return execution;
}

export { DB_FILE };
