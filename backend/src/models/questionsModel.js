import { getDb } from '../db.js';
import { assertOptionsString, assertQuestionId } from './validators.js';

export async function createQuestion({ questionId, options }, dbClient = null) {
  const db = dbClient || (await getDb());
  const normalizedQuestionId = assertQuestionId(questionId);
  const normalizedOptions = assertOptionsString(options);

  await db.run('INSERT INTO questions (question_id, options) VALUES (?, ?)', [normalizedQuestionId, normalizedOptions]);
  return getQuestionById(normalizedQuestionId, db);
}

export async function upsertQuestion({ questionId, options }, dbClient = null) {
  const db = dbClient || (await getDb());
  const normalizedQuestionId = assertQuestionId(questionId);
  const normalizedOptions = assertOptionsString(options);

  await db.run(
    `INSERT INTO questions (question_id, options)
     VALUES (?, ?)
     ON CONFLICT(question_id) DO UPDATE SET options = excluded.options`,
    [normalizedQuestionId, normalizedOptions]
  );

  return getQuestionById(normalizedQuestionId, db);
}

export async function getQuestionById(questionId, dbClient = null) {
  const db = dbClient || (await getDb());
  const normalizedQuestionId = assertQuestionId(questionId);
  return db.get('SELECT question_id, options FROM questions WHERE question_id = ?', [normalizedQuestionId]);
}

export async function listQuestions(dbClient = null) {
  const db = dbClient || (await getDb());
  return db.all('SELECT question_id, options FROM questions ORDER BY question_id ASC');
}

export async function updateQuestionOptions(questionId, options, dbClient = null) {
  const db = dbClient || (await getDb());
  const normalizedQuestionId = assertQuestionId(questionId);
  const normalizedOptions = assertOptionsString(options);

  const result = await db.run('UPDATE questions SET options = ? WHERE question_id = ?', [normalizedOptions, normalizedQuestionId]);
  if (!result.changes) {
    throw new Error(`Question ${normalizedQuestionId} not found`);
  }
  return getQuestionById(normalizedQuestionId, db);
}

export async function deleteQuestion(questionId, dbClient = null) {
  const db = dbClient || (await getDb());
  const normalizedQuestionId = assertQuestionId(questionId);
  const result = await db.run('DELETE FROM questions WHERE question_id = ?', [normalizedQuestionId]);
  return result.changes > 0;
}

export async function seedQuestionsFromCategoryMatrix(categoryMatrix, dbClient = null) {
  if (!Array.isArray(categoryMatrix) || categoryMatrix.length === 0) {
    throw new Error('categoryMatrix must be a non-empty array');
  }

  const db = dbClient || (await getDb());
  for (let i = 0; i < categoryMatrix.length; i += 1) {
    const row = categoryMatrix[i];
    if (!Array.isArray(row) || row.length !== 3) {
      throw new Error(`Invalid CATEGORY_MATRIX row at index ${i}`);
    }
    const questionId = `Q${String(i + 1).padStart(2, '0')}`;
    const options = row.map((item) => String(item || '').trim().toUpperCase()).join(',');
    await upsertQuestion({ questionId, options }, db);
  }

  return listQuestions(db);
}
