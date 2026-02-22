import { withTransaction } from '../db.js';
import { createResponsesBulk } from '../models/responsesModel.js';
import { createUserRecord, getUserRecordById, updateUserRecord } from '../models/usersModel.js';
import { CATEGORY_MATRIX } from '../riasecItems.js';
import { getAllMajors, scoreMajor } from '../majorService.js';

const LETTERS = new Set(['R', 'I', 'A', 'S', 'E', 'C']);

function toUpperLetter(value) {
  const letter = String(value || '')
    .trim()
    .toUpperCase();
  return LETTERS.has(letter) ? letter : '';
}

function extractPositionFromOptionId(optionId) {
  const suffix = String(optionId || '').trim().toLowerCase().slice(-1);
  const position = { a: 1, b: 2, c: 3 }[suffix];
  if (!position) {
    throw new Error(`Invalid option id: ${optionId}`);
  }
  return position;
}

function getAnswerForQuestion(answers, numericQuestionId) {
  const byNumeric = answers[numericQuestionId];
  const byStringNumeric = answers[String(numericQuestionId)];
  const byQKey = answers[`Q${String(numericQuestionId).padStart(2, '0')}`];
  return byNumeric ?? byStringNumeric ?? byQKey ?? null;
}

function getResponseTime(responseTimesSec, questionNumericId) {
  if (!responseTimesSec || typeof responseTimesSec !== 'object') {
    return 0;
  }

  const byNumeric = responseTimesSec[questionNumericId];
  const byQKey = responseTimesSec[`Q${String(questionNumericId).padStart(2, '0')}`];
  const byStringNumeric = responseTimesSec[String(questionNumericId)];
  const candidate = byNumeric ?? byQKey ?? byStringNumeric;
  if (candidate == null) return 0;
  const parsed = Number.parseFloat(String(candidate));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Number(parsed.toFixed(2));
}

function emptyScoreRecord() {
  return { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
}

function ensureScoreRecordTotalThirty(scores) {
  const total = scores.R + scores.I + scores.A + scores.S + scores.E + scores.C;
  if (total !== 30) {
    throw new Error(`computed scores sum must equal 30, received ${total}`);
  }
}

function buildProfileFromScores(scores) {
  return Object.entries(scores)
    .sort((a, b) => {
      const diff = Number(b[1]) - Number(a[1]);
      if (diff !== 0) return diff;
      return String(a[0]).localeCompare(String(b[0]));
    })
    .map(([letter]) => letter)
    .join('');
}

async function computeScoresFromStoredResponses(db, userId) {
  const rows = await db.all(
    `SELECT chosen_code AS code, COUNT(*) AS total
     FROM user_item_responses
     WHERE user_id = ?
     GROUP BY chosen_code`,
    [userId]
  );

  const computed = emptyScoreRecord();
  for (const row of rows) {
    const letter = toUpperLetter(row?.code);
    if (!letter) continue;
    computed[letter] = Number.parseInt(String(row?.total || 0), 10) || 0;
  }

  ensureScoreRecordTotalThirty(computed);
  return computed;
}

function getQuestionOptionRows() {
  return CATEGORY_MATRIX.map((row, idx) => {
    const questionId = `Q${String(idx + 1).padStart(2, '0')}`;
    const options = row.map((item) => String(item || '').trim().toUpperCase()).join(',');
    return { question_id: questionId, options };
  });
}

function toOptionalText(value, maxLength) {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

export async function saveQuizSubmission({ accountUser, answers, responseTimesSec, userMeta }) {
  const normalizedUserId = String(accountUser?.id || '').trim();
  if (!normalizedUserId) {
    throw new Error('user id is required');
  }

  const fullNameFirst = String(accountUser?.name || '').trim();
  const fullNameLast = String(accountUser?.surname || '').trim();
  const firstName = String(userMeta?.first_name || fullNameFirst || 'Anonymous')
    .trim()
    .slice(0, 50);
  const lastName = String(userMeta?.last_name || fullNameLast || 'User')
    .trim()
    .slice(0, 50);

  const chosenMajor =
    userMeta?.chosen_major == null || String(userMeta.chosen_major).trim() === ''
      ? null
      : String(userMeta.chosen_major).trim().slice(0, 150);

  const satisfaction =
    userMeta?.satisfaction_score == null || userMeta?.satisfaction_score === ''
      ? null
      : Number.parseInt(String(userMeta.satisfaction_score), 10);
  if (satisfaction != null && (!Number.isInteger(satisfaction) || satisfaction < 1 || satisfaction > 5)) {
    throw new Error('satisfaction_score must be an integer between 1 and 5');
  }

  const payloadForUser = {
    user_id: normalizedUserId,
    first_name: firstName,
    last_name: lastName,
    gender: toOptionalText(userMeta?.gender, 10),
    education_level: toOptionalText(userMeta?.education_level, 50),
    favorite_subject_1: toOptionalText(userMeta?.favorite_subject_1, 30),
    favorite_subject_2: toOptionalText(userMeta?.favorite_subject_2, 30),
    riasec_profile: 'RIASEC',
    chosen_major: chosenMajor,
    satisfaction_score: satisfaction
  };

  return withTransaction(async (db) => {
    const existingAttempt = await db.get(
      `SELECT 1 AS has_attempt
       FROM user_major_recommendations
       WHERE user_id = ?
       LIMIT 1`,
      [normalizedUserId]
    );
    if (existingAttempt) {
      const error = new Error('Quiz already completed for this user.');
      error.code = 'QUIZ_ALREADY_COMPLETED';
      throw error;
    }

    const existingUser = await getUserRecordById(payloadForUser.user_id, db);
    const storedUser =
      existingUser ||
      (await createUserRecord(
        {
          user_id: payloadForUser.user_id,
          first_name: payloadForUser.first_name,
          last_name: payloadForUser.last_name,
          gender: payloadForUser.gender,
          education_level: payloadForUser.education_level,
          favorite_subject_1: payloadForUser.favorite_subject_1,
          favorite_subject_2: payloadForUser.favorite_subject_2,
          riasec_profile: 'RIASEC',
          chosen_major: null
        },
        db
      ));

    const questionRows = getQuestionOptionRows();
    const responseRows = [];

    const safeAnswers = answers && typeof answers === 'object' ? answers : {};
    for (const question of questionRows) {
      const questionId = question.question_id;
      const options = question.options;
      const numericQuestionId = Number.parseInt(questionId.slice(1), 10);
      const optionIdRaw = getAnswerForQuestion(safeAnswers, numericQuestionId);
      const optionId = optionIdRaw == null ? '' : String(optionIdRaw);
      const isSkipped = !optionId || optionId.toLowerCase() === 'pass';

      if (!isSkipped) {
        const expectedPrefix = String(numericQuestionId);
        if (!optionId.startsWith(expectedPrefix)) {
          throw new Error(`Answer option id ${optionId} does not belong to ${questionId}`);
        }
      }

      const chosenPosition = isSkipped ? 1 : extractPositionFromOptionId(optionId);
      const choices = options.split(',');
      const chosenCode = toUpperLetter(choices[chosenPosition - 1]);
      if (!chosenCode) {
        throw new Error(`Invalid chosen code for ${questionId}`);
      }

      responseRows.push({
        response_id: `${storedUser.user_id}_${questionId}`,
        user_id: storedUser.user_id,
        question_id: questionId,
        options,
        chosen_code: chosenCode,
        chosen_position: chosenPosition,
        response_time_sec: getResponseTime(responseTimesSec, numericQuestionId)
      });
    }

    if (responseRows.length !== 30) {
      throw new Error(`Expected 30 item responses for a completed quiz, received ${responseRows.length}`);
    }

    await db.run('DELETE FROM user_item_responses WHERE user_id = ?', [storedUser.user_id]);
    const storedResponses = await createResponsesBulk(responseRows, db);
    if (storedResponses.length !== 30) {
      throw new Error(`Expected 30 inserted item responses, inserted ${storedResponses.length}`);
    }

    const computedScores = await computeScoresFromStoredResponses(db, storedUser.user_id);
    const computedProfile = buildProfileFromScores(computedScores);
    const allScoredMajors = getAllMajors().map((entry) => ({
      major: entry.major,
      code: entry.codes,
      score: scoreMajor(computedProfile, entry.codes)
    }));

    allScoredMajors.sort((a, b) => b.score - a.score || a.major.localeCompare(b.major));
    const topRecommendations = allScoredMajors.slice(0, 10);

    await updateUserRecord(
      payloadForUser.user_id,
      {
        ...payloadForUser,
        riasec_profile: computedProfile,
        scores: computedScores
      },
      db
    );

    await db.run('DELETE FROM user_major_recommendations WHERE user_id = ?', [storedUser.user_id]);
    for (let i = 0; i < topRecommendations.length; i += 1) {
      const rec = topRecommendations[i] || {};
      const majorName = String(rec.major || '').trim();
      if (!majorName) continue;

      const rank = i + 1;
      const score = Number.parseFloat(String(rec.score ?? 0));
      await db.run(
        `INSERT INTO user_major_recommendations (user_id, major_name, recommendation_rank, recommendation_score)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, recommendation_rank)
         DO UPDATE SET major_name = excluded.major_name, recommendation_score = excluded.recommendation_score, created_at = CURRENT_TIMESTAMP`,
        [storedUser.user_id, majorName, rank, Number.isFinite(score) ? Number(score.toFixed(2)) : 0]
      );
    }

    const finalizedUser = await getUserRecordById(payloadForUser.user_id, db);

    return {
      user: finalizedUser,
      responses: storedResponses
    };
  });
}
