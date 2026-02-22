PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS user_item_responses (
  response_id TEXT PRIMARY KEY,
  user_id TEXT,
  question_id TEXT,
  options TEXT,
  chosen_code TEXT CHECK (chosen_code IN ('R','I','A','S','E','C')),
  chosen_position INTEGER CHECK (chosen_position BETWEEN 1 AND 3),
  response_time_sec REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, question_id),
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_major_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  major_name TEXT NOT NULL,
  recommendation_rank INTEGER CHECK (recommendation_rank >= 1),
  recommendation_score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, recommendation_rank),
  UNIQUE(user_id, major_name),
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_riasec ON users(riasec_profile);
CREATE INDEX IF NOT EXISTS idx_user_responses_user ON user_item_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON user_major_recommendations(user_id);
