import { getDb } from '../db.js';
import { assertChosenCodeInOptions, assertChosenPosition, assertOptionsString, assertQuestionId, assertResponseTimeSec } from './validators.js';

function normalizeUserId(userId) {
  const normalized = String(userId || '').trim();
  if (!normalized) {
    throw new Error('user_id is required');
  }
  return normalized;
}

function normalizeResponseId(responseId) {
  const normalized = String(responseId || '').trim();
  if (!normalized) {
    throw new Error('response_id is required');
  }
  return normalized;
}

function validateResponsePayload(payload) {
  const options = assertOptionsString(payload?.options);
  const chosenPosition = assertChosenPosition(payload?.chosen_position);
  const chosenCode = assertChosenCodeInOptions(payload?.chosen_code, options);

  const optionsArray = options.split(',');
  const expectedCode = optionsArray[chosenPosition - 1];
  if (expectedCode !== chosenCode) {
    throw new Error('chosen_position does not match chosen_code within options');
  }

  return {
    response_id: normalizeResponseId(payload?.response_id),
    user_id: normalizeUserId(payload?.user_id),
    question_id: assertQuestionId(payload?.question_id),
    options,
    chosen_code: chosenCode,
    chosen_position: chosenPosition,
    response_time_sec: assertResponseTimeSec(payload?.response_time_sec)
  };
}

export async function createResponse(payload, dbClient = null) {
  const db = dbClient || (await getDb());
  const data = validateResponsePayload(payload);

  await db.run(
    `INSERT INTO user_item_responses (
      response_id, user_id, question_id, options, chosen_code, chosen_position, response_time_sec
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.response_id, data.user_id, data.question_id, data.options, data.chosen_code, data.chosen_position, data.response_time_sec]
  );

  return getResponseById(data.response_id, db);
}

export async function createResponsesBulk(rows, dbClient = null) {
  const db = dbClient || (await getDb());
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const created = [];
  for (const row of rows) {
    const inserted = await createResponse(row, db);
    created.push(inserted);
  }
  return created;
}

export async function getResponseById(responseId, dbClient = null) {
  const db = dbClient || (await getDb());
  const normalized = normalizeResponseId(responseId);
  return db.get('SELECT * FROM user_item_responses WHERE response_id = ?', [normalized]);
}

export async function listResponsesByUserId(userId, dbClient = null) {
  const db = dbClient || (await getDb());
  const normalizedUserId = normalizeUserId(userId);
  return db.all('SELECT * FROM user_item_responses WHERE user_id = ? ORDER BY created_at DESC, question_id ASC', [normalizedUserId]);
}

export async function updateResponse(responseId, updates, dbClient = null) {
  const db = dbClient || (await getDb());
  const existing = await getResponseById(responseId, db);
  if (!existing) {
    throw new Error('Response not found');
  }

  const data = validateResponsePayload({
    response_id: existing.response_id,
    user_id: existing.user_id,
    question_id: existing.question_id,
    options: updates?.options ?? existing.options,
    chosen_code: updates?.chosen_code ?? existing.chosen_code,
    chosen_position: updates?.chosen_position ?? existing.chosen_position,
    response_time_sec: updates?.response_time_sec ?? existing.response_time_sec
  });

  await db.run(
    `UPDATE user_item_responses
     SET options = ?, chosen_code = ?, chosen_position = ?, response_time_sec = ?
     WHERE response_id = ?`,
    [data.options, data.chosen_code, data.chosen_position, data.response_time_sec, data.response_id]
  );

  return getResponseById(data.response_id, db);
}

export async function deleteResponse(responseId, dbClient = null) {
  const db = dbClient || (await getDb());
  const normalized = normalizeResponseId(responseId);
  const result = await db.run('DELETE FROM user_item_responses WHERE response_id = ?', [normalized]);
  return result.changes > 0;
}
