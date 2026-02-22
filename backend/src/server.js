import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { riasecItems } from './riasecItems.js';
import { loadMajorsFromWorkbook, getAllMajors, getRecommendations } from './majorService.js';
import {
  initUserStore,
  getOrCreateUser,
  getUserById,
  getUserResults,
  recordUserResult,
  getTotalResultsCount,
  updateUserProfile
} from './userStore.js';
import { runMigrations, getDb, withTransaction } from './db.js';
import { countUserRecords } from './models/usersModel.js';
import { saveQuizSubmission } from './services/quizPersistenceService.js';
import {
  initAuthStore,
  getCredential,
  getCredentialByUserId,
  updateCredentialByUserId,
  saveCredential,
  getVerification,
  saveVerification,
  incrementVerificationAttempt,
  clearVerification,
  getPasswordReset,
  savePasswordReset,
  clearPasswordReset
} from './authStore.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '127.0.0.1';
const VERIFICATION_TTL_MINUTES = Math.max(1, Number.parseInt(process.env.EMAIL_VERIFICATION_TTL_MINUTES || '10', 10));
const VERIFICATION_MAX_ATTEMPTS = Math.max(1, Number.parseInt(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS || '5', 10));
const PASSWORD_RESET_TTL_MINUTES = Math.max(5, Number.parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || '30', 10));
const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || '';
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = typeof process.env.SMTP_SECURE === 'string' ? process.env.SMTP_SECURE === 'true' : SMTP_PORT === 465;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

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
const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const hashVerificationCode = (email, code) => createHash('sha256').update(`${email}:${code}`).digest('hex');
const hashResetToken = (token) => createHash('sha256').update(token).digest('hex');
const generateVerificationCode = () => randomInt(100000, 1000000).toString();
const generateResetToken = () => randomBytes(32).toString('hex');
const getVerificationExpiry = () => new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000).toISOString();
const getPasswordResetExpiry = () => new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000).toISOString();
const isVerificationExpired = (verification) => {
  if (!verification?.expiresAt) return true;
  return Number.isNaN(Date.parse(verification.expiresAt)) || Date.parse(verification.expiresAt) <= Date.now();
};
const isPasswordResetExpired = (reset) => {
  if (!reset?.expiresAt) return true;
  return Number.isNaN(Date.parse(reset.expiresAt)) || Date.parse(reset.expiresAt) <= Date.now();
};
const isHashMatch = (left, right) => {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};
const hashPassword = (password, salt = randomBytes(16).toString('hex')) => {
  const derived = scryptSync(password, salt, 64).toString('hex');
  return { passwordHash: derived, passwordSalt: salt };
};
const verifyPassword = (password, passwordHash, passwordSalt) => {
  if (!passwordHash || !passwordSalt) return false;
  const derived = scryptSync(password, passwordSalt, 64).toString('hex');
  return isHashMatch(derived, passwordHash);
};

const toNameParts = (email) => {
  const [localPart = 'User'] = email.split('@');
  const normalized = localPart.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  const name = parts[0] || 'User';
  const surname = parts.slice(1).join(' ') || 'Account';
  return { name, surname };
};

const transporterConfig = process.env.SMTP_SERVICE
  ? {
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  : {
      host: process.env.SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

const hasMailerConfig = Boolean(
  SMTP_FROM &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    (process.env.SMTP_SERVICE || process.env.SMTP_HOST)
);

const mailer = hasMailerConfig ? nodemailer.createTransport(transporterConfig) : null;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const sendVerificationEmail = async ({ email, code, expiresAt }) => {
  if (!mailer) {
    const error = new Error(
      'SMTP is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM (or SMTP_SERVICE) in backend/.env.'
    );
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  await mailer.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Email verification code',
    text: `Your verification code is ${code}. It expires at ${new Date(expiresAt).toLocaleString()}.`,
    html: `<p>Your verification code is <strong>${code}</strong>.</p><p>This code expires in ${VERIFICATION_TTL_MINUTES} minutes.</p>`
  });
};

const sendPasswordResetEmail = async ({ email, resetLink, expiresAt }) => {
  if (!mailer) {
    const error = new Error(
      'SMTP is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM (or SMTP_SERVICE) in backend/.env.'
    );
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  await mailer.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Password reset link',
    text: `Use this link to reset your password: ${resetLink}\nThis link expires at ${new Date(expiresAt).toLocaleString()}.`,
    html: `<p>Use this link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.</p>`
  });
};

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/images', express.static(path.resolve(__dirname, '../assets/images')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/stats/tests', async (req, res) => {
  try {
    const totalTests = await countUserRecords();
    res.json({ totalTests });
  } catch (error) {
    res.json({ totalTests: await getTotalResultsCount() });
  }
});

app.get('/api/questions', (req, res) => {
  res.json({ total: riasecItems.length, questions: riasecItems });
});

app.get('/api/majors/all', (req, res) => {
  const majors = getAllMajors();
  res.json({ total: majors.length, majors });
});

app.post('/api/login', async (req, res) => {
  try {
    const { name, surname, email, password } = req.body || {};
    if (email && password) {
      const normalizedEmail = normalizeEmail(email);
      const account = await getCredential(normalizedEmail);
      if (!account) {
        const pendingVerification = await getVerification(normalizedEmail);
        if (pendingVerification) {
          if (isVerificationExpired(pendingVerification)) {
            await clearVerification(normalizedEmail);
          } else if (
            verifyPassword(password, pendingVerification.passwordHash, pendingVerification.passwordSalt) ||
            pendingVerification.password === password
          ) {
            return res.status(403).json({ error: 'Please verify your email before signing in.' });
          }
        }
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const passwordValid = verifyPassword(password, account.passwordHash, account.passwordSalt) || account.password === password;
      if (!passwordValid) {
        if (account.provider === 'google' && !account.password) {
          return res.status(400).json({ error: 'This account uses Google sign-in. Please continue with Google.' });
        }
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const user = await getUserById(account.userId);
      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }
      const results = await getUserResults(user.id);
      return res.json({
        user: { id: user.id, name: user.name, surname: user.surname },
        results,
        profile: {
          username: account.username || '',
          birthDate: account.birthDate || '',
          gender: account.gender || '',
          email: account.email || normalizedEmail
        }
      });
    }
    const user = await getOrCreateUser(name, surname);
    const results = await getUserResults(user.id);
    res.json({ user: { id: user.id, name: user.name, surname: user.surname }, results });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Unable to login' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const {
      user_id,
      first_name,
      last_name,
      gender,
      education_level,
      favorite_subject_1,
      favorite_subject_2
    } = req.body || {};

    const userId = String(user_id || '').trim();
    const firstName = String(first_name || '').trim();
    const lastName = String(last_name || '').trim();
    const normalizedGender = gender == null ? null : String(gender).trim() || null;
    const normalizedEducationLevel = education_level == null ? null : String(education_level).trim() || null;
    const normalizedFavoriteSubject1 = favorite_subject_1 == null ? null : String(favorite_subject_1).trim() || null;
    const normalizedFavoriteSubject2 = favorite_subject_2 == null ? null : String(favorite_subject_2).trim() || null;

    if (!userId || !firstName || !lastName) {
      return res.status(400).json({ error: 'user_id, first_name, and last_name are required.' });
    }

    const db = await getDb();
    const existing = await db.get('SELECT user_id FROM users WHERE user_id = ?', [userId]);
    if (existing) {
      return res.status(409).json({ error: 'User with this user_id already exists.' });
    }

    await db.run(
      `INSERT INTO users (
        user_id,
        first_name,
        last_name,
        gender,
        education_level,
        favorite_subject_1,
        favorite_subject_2,
        R_score,
        I_score,
        A_score,
        S_score,
        E_score,
        C_score,
        riasec_profile
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, NULL)`,
      [
        userId,
        firstName,
        lastName,
        normalizedGender,
        normalizedEducationLevel,
        normalizedFavoriteSubject1,
        normalizedFavoriteSubject2
      ]
    );

    return res.status(201).json({
      ok: true,
      message: 'User registered successfully.',
      user: {
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        gender: normalizedGender,
        education_level: normalizedEducationLevel,
        favorite_subject_1: normalizedFavoriteSubject1,
        favorite_subject_2: normalizedFavoriteSubject2,
        riasec_profile: null
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unable to register user.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, username, birthDate, gender, email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email and password are required.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include uppercase, number, and special character.'
      });
    }

    const normalizedEmail = normalizeEmail(email);
    if (await getCredential(normalizedEmail)) {
      return res.status(409).json({ error: 'This email is already registered.' });
    }
    if (!mailer) {
      return res.status(503).json({
        error:
          'Email service is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM (or SMTP_SERVICE).'
      });
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = getVerificationExpiry();
    const { passwordHash, passwordSalt } = hashPassword(password);
    await saveVerification(normalizedEmail, {
      password: '',
      passwordHash,
      passwordSalt,
      codeHash: hashVerificationCode(normalizedEmail, verificationCode),
      expiresAt,
      firstName: normalizeText(firstName),
      lastName: normalizeText(lastName),
      username: normalizeText(username),
      birthDate: normalizeText(birthDate),
      gender: normalizeText(gender),
      email: normalizedEmail,
      attemptCount: 0,
      createdAt: new Date().toISOString()
    });

    try {
      await sendVerificationEmail({ email: normalizedEmail, code: verificationCode, expiresAt });
    } catch (mailError) {
      await clearVerification(normalizedEmail);
      console.error('Failed to send verification email:', mailError);
      if (mailError?.code === 'SMTP_NOT_CONFIGURED') {
        return res.status(503).json({ error: mailError.message });
      }
      return res.status(502).json({ error: 'Unable to send verification email right now. Please try again later.' });
    }

    res.json({
      ok: true,
      email: normalizedEmail,
      expiresAt,
      message: 'Verification code sent. Please check your email.'
    });
  } catch (err) {
    console.error('Unexpected register error:', err);
    res.status(500).json({ error: 'Unable to register due to server error.' });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code || typeof email !== 'string' || typeof code !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (await getCredential(normalizedEmail)) {
      return res.status(409).json({ error: 'This email is already verified.' });
    }

    const verification = await getVerification(normalizedEmail);
    if (!verification) {
      return res.status(404).json({ error: 'No pending verification found for this email.' });
    }
    if (isVerificationExpired(verification)) {
      await clearVerification(normalizedEmail);
      return res.status(400).json({ error: 'Verification code expired. Please register again.' });
    }

    const submittedHash = hashVerificationCode(normalizedEmail, code.trim());
    if (!isHashMatch(submittedHash, verification.codeHash)) {
      const updated = await incrementVerificationAttempt(normalizedEmail);
      const attempts = updated?.attemptCount || 1;
      if (attempts >= VERIFICATION_MAX_ATTEMPTS) {
        await clearVerification(normalizedEmail);
        return res.status(429).json({ error: 'Too many failed attempts. Please register again.' });
      }
      const remaining = VERIFICATION_MAX_ATTEMPTS - attempts;
      return res.status(400).json({ error: `Invalid verification code. ${remaining} attempt(s) left.` });
    }

    const name = normalizeText(verification.firstName);
    const surname = normalizeText(verification.lastName);
    const fallbackNameParts = toNameParts(normalizedEmail);
    const safeName = name || fallbackNameParts.name;
    const safeSurname = surname || fallbackNameParts.surname;
    const resolvedUser = await getOrCreateUser(safeName, safeSurname);
    const fallbackPassword = hashPassword(verification.password || '');
    await saveCredential(normalizedEmail, {
      userId: resolvedUser.id,
      password: '',
      passwordHash: verification.passwordHash || fallbackPassword.passwordHash,
      passwordSalt: verification.passwordSalt || fallbackPassword.passwordSalt,
      username: verification.username || '',
      birthDate: verification.birthDate || '',
      gender: verification.gender || '',
      firstName: resolvedUser.name,
      lastName: resolvedUser.surname,
      email: normalizedEmail,
      passwordUpdatedAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString()
    });
    await clearVerification(normalizedEmail);

    const results = await getUserResults(resolvedUser.id);
    return res.json({
      ok: true,
      email: normalizedEmail,
      user: { id: resolvedUser.id, name: resolvedUser.name, surname: resolvedUser.surname },
      results,
      profile: {
        username: verification.username || '',
        birthDate: verification.birthDate || '',
        gender: verification.gender || '',
        email: normalizedEmail
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to verify email' });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (await getCredential(normalizedEmail)) {
      return res.status(409).json({ error: 'This email is already verified.' });
    }
    if (!mailer) {
      return res.status(503).json({
        error:
          'Email service is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM (or SMTP_SERVICE).'
      });
    }

    const pending = await getVerification(normalizedEmail);
    if (!pending) {
      return res.status(404).json({ error: 'No pending verification found. Please register again.' });
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = getVerificationExpiry();
    await saveVerification(normalizedEmail, {
      password: pending.password || '',
      passwordHash: pending.passwordHash || '',
      passwordSalt: pending.passwordSalt || '',
      codeHash: hashVerificationCode(normalizedEmail, verificationCode),
      expiresAt,
      firstName: pending.firstName || '',
      lastName: pending.lastName || '',
      username: pending.username || '',
      birthDate: pending.birthDate || '',
      gender: pending.gender || '',
      email: normalizedEmail,
      attemptCount: 0,
      createdAt: new Date().toISOString()
    });

    try {
      await sendVerificationEmail({ email: normalizedEmail, code: verificationCode, expiresAt });
    } catch (mailError) {
      console.error('Failed to resend verification email:', mailError);
      if (mailError?.code === 'SMTP_NOT_CONFIGURED') {
        return res.status(503).json({ error: mailError.message });
      }
      return res.status(502).json({ error: 'Unable to send verification email right now. Please try again later.' });
    }

    return res.json({
      ok: true,
      email: normalizedEmail,
      expiresAt,
      message: 'A new verification code has been sent.'
    });
  } catch (err) {
    console.error('Unexpected resend verification error:', err);
    return res.status(500).json({ error: 'Unable to resend verification code due to server error.' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const genericResponse = {
    ok: true,
    message: 'Şifrəni sıfırlama təlimatları üçün e-poçtunuzu yoxlayın.'
  };

  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return res.json(genericResponse);
    }

    const normalizedEmail = normalizeEmail(email);
    const credential = await getCredential(normalizedEmail);
    if (!credential || credential.provider !== 'local') {
      return res.json(genericResponse);
    }

    if (!mailer) {
      console.warn(`Password reset requested for ${normalizedEmail}, but SMTP mailer is not configured.`);
      if (process.env.NODE_ENV !== 'production') {
        return res.status(503).json({
          ok: false,
          error:
            'Email service is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM (or SMTP_SERVICE).'
        });
      }
      return res.json(genericResponse);
    }

    const resetToken = generateResetToken();
    const expiresAt = getPasswordResetExpiry();
    const resetLink = `${FRONTEND_BASE_URL}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(
      normalizedEmail
    )}`;

    try {
      await sendPasswordResetEmail({ email: normalizedEmail, resetLink, expiresAt });
      await savePasswordReset(normalizedEmail, {
        tokenHash: hashResetToken(resetToken),
        expiresAt,
        createdAt: new Date().toISOString(),
        usedAt: null
      });
    } catch (mailError) {
      console.error('Failed to send password reset email:', mailError);
      if (process.env.NODE_ENV !== 'production') {
        return res.status(502).json({
          ok: false,
          error: 'Unable to send password reset email right now. Please try again later.'
        });
      }
    }

    return res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.json(genericResponse);
  }
});

app.get('/api/auth/reset-password/validate', async (req, res) => {
  try {
    const emailParam = req.query.email;
    const tokenParam = req.query.token;
    const email = typeof emailParam === 'string' ? emailParam : '';
    const token = typeof tokenParam === 'string' ? tokenParam : '';

    if (!email || !token || !isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid or expired reset token.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const credential = await getCredential(normalizedEmail);
    if (!credential || credential.provider !== 'local') {
      return res.status(400).json({ ok: false, error: 'Invalid or expired reset token.' });
    }

    const resetRecord = await getPasswordReset(normalizedEmail);
    if (!resetRecord || resetRecord.usedAt || isPasswordResetExpired(resetRecord)) {
      await clearPasswordReset(normalizedEmail);
      return res.status(400).json({ ok: false, error: 'Invalid or expired reset token.' });
    }

    const submittedTokenHash = hashResetToken(token);
    if (!isHashMatch(submittedTokenHash, resetRecord.tokenHash)) {
      return res.status(400).json({ ok: false, error: 'Invalid or expired reset token.' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Reset password validate error:', err);
    return res.status(500).json({ ok: false, error: 'Unable to validate reset token due to server error.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body || {};
    if (!email || !token || !password || typeof email !== 'string' || typeof token !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email, token and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include uppercase, number, and special character.'
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const credential = await getCredential(normalizedEmail);
    if (!credential || credential.provider !== 'local') {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const resetRecord = await getPasswordReset(normalizedEmail);
    if (!resetRecord || resetRecord.usedAt || isPasswordResetExpired(resetRecord)) {
      await clearPasswordReset(normalizedEmail);
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const submittedTokenHash = hashResetToken(token);
    if (!isHashMatch(submittedTokenHash, resetRecord.tokenHash)) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const { passwordHash, passwordSalt } = hashPassword(password);
    await saveCredential(normalizedEmail, {
      userId: credential.userId,
      password: '',
      passwordHash,
      passwordSalt,
      provider: credential.provider || 'local',
      googleSub: credential.googleSub || null,
      passwordUpdatedAt: new Date().toISOString(),
      verifiedAt: credential.verifiedAt || new Date().toISOString()
    });
    await clearPasswordReset(normalizedEmail);

    return res.json({ ok: true, message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Unable to reset password due to server error.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    if (!googleClient || !GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google sign-in is not configured on the server.' });
    }

    const { credential } = req.body || {};
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ error: 'Google credential is required.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return res.status(400).json({ error: 'Google account email is missing or not verified.' });
    }

    const normalizedEmail = normalizeEmail(payload.email);
    const existingCredential = await getCredential(normalizedEmail);
    let user = existingCredential ? await getUserById(existingCredential.userId) : null;
    if (!user) {
      const name = payload.given_name || payload.name?.split(' ')[0] || 'Google';
      const surname = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || 'User';
      user = await getOrCreateUser(name, surname);
    }

    await saveCredential(normalizedEmail, {
      userId: user.id,
      password: existingCredential?.password || '',
      provider: 'google',
      googleSub: payload.sub,
      username: existingCredential?.username || '',
      birthDate: existingCredential?.birthDate || '',
      gender: existingCredential?.gender || '',
      firstName: user.name,
      lastName: user.surname,
      email: normalizedEmail,
      verifiedAt: new Date().toISOString()
    });

    const results = await getUserResults(user.id);
    return res.json({
      ok: true,
      user: { id: user.id, name: user.name, surname: user.surname },
      results,
      profile: {
        username: existingCredential?.username || '',
        birthDate: existingCredential?.birthDate || '',
        gender: existingCredential?.gender || '',
        email: normalizedEmail
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(401).json({ error: 'Google authentication failed.' });
  }
});

app.get('/api/users/:userId/results', async (req, res) => {
  try {
    const { userId } = req.params;
    const results = await getUserResults(userId);
    res.json({ results });
  } catch (err) {
    res.status(404).json({ error: err.message || 'Unable to load results' });
  }
});

app.get('/api/users/:userId/quiz-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = await getDb();
    const existingUser = await db.get('SELECT user_id FROM users WHERE user_id = ?', [userId]);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    const attempt = await db.get('SELECT 1 AS has_attempt FROM user_major_recommendations WHERE user_id = ? LIMIT 1', [userId]);
    return res.json({ hasAttempt: Boolean(attempt) });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to determine quiz status' });
  }
});

app.put('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, surname, username, birthDate, gender, email } = req.body || {};

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const normalizedName = normalizeText(name);
    const normalizedSurname = normalizeText(surname);
    if (!normalizedName || !normalizedSurname) {
      return res.status(400).json({ error: 'Name and surname are required.' });
    }

    const normalizedEmail = normalizeText(email) ? normalizeEmail(email) : '';
    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Email is invalid.' });
    }

    const conflictingCredential = normalizedEmail ? await getCredential(normalizedEmail) : null;
    if (conflictingCredential && conflictingCredential.userId !== userId) {
      return res.status(409).json({ error: 'This email is already in use by another account.' });
    }

    const updatedUser = await updateUserProfile(userId, {
      name: normalizedName,
      surname: normalizedSurname
    });

    const existingCredential = await getCredentialByUserId(userId);
    let updatedCredential = existingCredential;
    if (existingCredential) {
      updatedCredential = await updateCredentialByUserId(userId, {
        username: normalizeText(username),
        birthDate: normalizeText(birthDate),
        gender: normalizeText(gender),
        email: normalizedEmail || existingCredential.email || ''
      });
    }

    const results = await getUserResults(userId);
    return res.json({
      ok: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        surname: updatedUser.surname
      },
      profile: {
        username: updatedCredential?.username || '',
        birthDate: updatedCredential?.birthDate || '',
        gender: updatedCredential?.gender || '',
        email: updatedCredential?.email || '',
        completedTests: Array.isArray(results) ? results.length : 0
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to update profile' });
  }
});

app.get('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const credential = await getCredentialByUserId(userId);
    const results = await getUserResults(userId);
    const fullName = `${user.name || ''} ${user.surname || ''}`.trim();

    return res.json({
      profile: {
        full_name: fullName,
        username: credential?.username || '',
        email: credential?.email || '',
        birthdate: credential?.birthDate || '',
        gender: credential?.gender || '',
        completed_tests: Array.isArray(results) ? results.length : 0
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to load profile' });
  }
});

app.get('/api/users/:userId/assessment-profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const db = await getDb();
    const userRow = await db.get(
      `SELECT
        user_id, R_score, I_score, A_score, S_score, E_score, C_score,
        riasec_profile, chosen_major, satisfaction_score, created_at
       FROM users
       WHERE user_id = ?`,
      [userId]
    );
    const recommendations = await db.all(
      `SELECT major_name, recommendation_rank, recommendation_score, created_at
       FROM user_major_recommendations
       WHERE user_id = ?
       ORDER BY recommendation_rank ASC
       LIMIT 10`,
      [userId]
    );

    return res.json({
      profile: {
        user_id: userId,
        scores: {
          R: Number(userRow?.R_score || 0),
          I: Number(userRow?.I_score || 0),
          A: Number(userRow?.A_score || 0),
          S: Number(userRow?.S_score || 0),
          E: Number(userRow?.E_score || 0),
          C: Number(userRow?.C_score || 0)
        },
        riasec_profile: userRow?.riasec_profile || '',
        chosen_major: userRow?.chosen_major || null,
        satisfaction_score: userRow?.satisfaction_score == null ? null : Number(userRow.satisfaction_score),
        recommendations: recommendations.map((row) => ({
          major_name: row.major_name,
          recommendation_rank: Number(row.recommendation_rank || 0),
          recommendation_score: Number(row.recommendation_score || 0)
        })),
        completed: recommendations.length > 0,
        created_at: userRow?.created_at || null
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unable to load assessment profile' });
  }
});

app.post('/api/users/:userId/pre-quiz', async (req, res) => {
  try {
    const { userId } = req.params;
    const educationLevelRaw = typeof req.body?.education_level === 'string' ? req.body.education_level.trim() : '';
    const favoriteSubject1Raw = typeof req.body?.favorite_subject_1 === 'string' ? req.body.favorite_subject_1.trim() : '';
    const favoriteSubject2Raw = typeof req.body?.favorite_subject_2 === 'string' ? req.body.favorite_subject_2.trim() : '';

    const EDUCATION_LEVELS = new Set([
      'İbtidai təhsil',
      'Orta təhsil',
      'Tam orta təhsil',
      'Subbakalavr',
      'Bakalavr',
      'Magistr'
    ]);
    const SUBJECTS = new Set([
      'Texnologiya',
      'Fiziki tərbiyə',
      'Çağırışaqədərki hazırlıq',
      'Riyaziyyat',
      'Fizika',
      'Kimya',
      'Biologiya',
      'İnformatika',
      'Musiqi',
      'Təsviri incəsənət',
      'Ədəbiyyat',
      'Həyat bilgisi',
      'Azərbaycan dili',
      'Ümumi tarix',
      'Xarici dil',
      'Azərbaycan tarixi'
    ]);

    if (!educationLevelRaw || !EDUCATION_LEVELS.has(educationLevelRaw)) {
      return res.status(400).json({ error: 'Təhsil səviyyəsini düzgün seçin.' });
    }
    if (!favoriteSubject1Raw || !SUBJECTS.has(favoriteSubject1Raw)) {
      return res.status(400).json({ error: 'Sevimli fənn 1 mütləq seçilməlidir.' });
    }
    if (favoriteSubject2Raw && !SUBJECTS.has(favoriteSubject2Raw)) {
      return res.status(400).json({ error: 'Sevimli fənn 2 düzgün seçilməlidir.' });
    }

    const accountUser = await getUserById(userId);
    if (!accountUser) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
    }

    const db = await getDb();
    await db.run(
      `UPDATE users
       SET education_level = ?, favorite_subject_1 = ?, favorite_subject_2 = ?
       WHERE user_id = ?`,
      [educationLevelRaw, favoriteSubject1Raw, favoriteSubject2Raw || null, userId]
    );

    return res.json({
      ok: true,
      message: 'Məlumatlar yadda saxlanıldı.',
      pre_quiz: {
        education_level: educationLevelRaw,
        favorite_subject_1: favoriteSubject1Raw,
        favorite_subject_2: favoriteSubject2Raw || null
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Məlumatlar yadda saxlanılarkən xəta baş verdi.' });
  }
});

app.post('/api/users/:userId/results', async (req, res) => {
  try {
    const { userId } = req.params;
    const { answers } = req.body || {};
    const accountUser = await getUserById(userId);
    if (!accountUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const saveSummary = await saveQuizSubmission({
      accountUser,
      answers: answers && typeof answers === 'object' ? answers : {},
      responseTimesSec: req.body?.responseTimesSec,
      userMeta: req.body?.userMeta
    });

    const finalizedUserSnapshot = saveSummary?.user;
    if (!finalizedUserSnapshot) {
      return res.status(500).json({ error: 'Unable to persist finalized user snapshot' });
    }

    const stored = await recordUserResult(userId, {
      userSnapshot: finalizedUserSnapshot,
      answers: answers && typeof answers === 'object' ? answers : {},
      recommendations: []
    });
    res.json({ result: stored });
  } catch (err) {
    if (err?.code === 'QUIZ_ALREADY_COMPLETED') {
      return res.status(409).json({ error: err.message || 'Quiz already completed', code: err.code });
    }
    res.status(400).json({ error: err.message || 'Unable to save result' });
  }
});

app.post('/api/users/:userId/feedback', async (req, res) => {
  try {
    const { userId } = req.params;
    const chosenMajorRaw = typeof req.body?.chosen_major === 'string' ? req.body.chosen_major.trim() : '';
    const hasSatisfaction = req.body?.satisfaction_score != null && req.body?.satisfaction_score !== '';
    const satisfaction = hasSatisfaction ? Number.parseInt(String(req.body?.satisfaction_score), 10) : null;

    if (!chosenMajorRaw || !hasSatisfaction) {
      return res.status(400).json({ error: 'Zəhmət olmasa ixtisas və məmnunluq dərəcəsini seçin.' });
    }
    if (!Number.isInteger(satisfaction) || satisfaction < 1 || satisfaction > 5) {
      return res.status(400).json({ error: 'Məmnunluq dərəcəsi 1-5 aralığında olmalıdır.' });
    }

    const accountUser = await getUserById(userId);
    if (!accountUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await withTransaction(async (db) => {
      const existing = await db.get('SELECT user_id, chosen_major FROM users WHERE user_id = ?', [userId]);
      if (!existing) {
        throw new Error('İstifadəçi tapılmadı.');
      }

      if (existing.chosen_major && String(existing.chosen_major).trim()) {
        const alreadyChosen = String(existing.chosen_major).trim();
        if (alreadyChosen === chosenMajorRaw) {
          throw new Error('Bu ixtisas artıq təsdiqlənib.');
        }
        throw new Error('İxtisas seçimi artıq təsdiqlənib. Yenidən dəyişmək mümkün deyil.');
      }

      const recommended = await db.get(
        `SELECT major_name FROM user_major_recommendations WHERE user_id = ? AND major_name = ? LIMIT 1`,
        [userId, chosenMajorRaw]
      );
      if (!recommended) {
        throw new Error('Yalnız tövsiyə olunan ixtisaslardan seçim edə bilərsiniz.');
      }

      const chosenMajorToSave = chosenMajorRaw;
      await db.run(
        `UPDATE users
         SET chosen_major = ?, satisfaction_score = ?
         WHERE user_id = ?`,
        [chosenMajorToSave, satisfaction, userId]
      );

      const maxRankRow = await db.get(
        `SELECT COALESCE(MAX(recommendation_rank), 0) AS max_rank
         FROM user_major_recommendations
         WHERE user_id = ?`,
        [userId]
      );
      const nextRank = Number(maxRankRow?.max_rank || 0) + 1;

      await db.run(
        `INSERT INTO user_major_recommendations (user_id, major_name, recommendation_rank, recommendation_score)
         VALUES (?, ?, ?, 0)
         ON CONFLICT (user_id, major_name) DO NOTHING`,
        [userId, chosenMajorToSave, nextRank]
      );

      const updatedRow = await db.get(
        `SELECT user_id, chosen_major, satisfaction_score
         FROM users
         WHERE user_id = ?`,
        [userId]
      );

      await db.run(
        `UPDATE user_major_recommendations
         SET recommendation_score = CASE
           WHEN recommendation_score IS NULL OR recommendation_score < ? THEN ?
           ELSE recommendation_score
         END
         WHERE user_id = ? AND major_name = ?`,
        [satisfaction, satisfaction, userId, chosenMajorToSave]
      );

      return updatedRow;
    });

    return res.json({
      ok: true,
      feedback: {
        user_id: updated.user_id,
        chosen_major: updated.chosen_major || null,
        satisfaction_score: updated.satisfaction_score
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Seçim yadda saxlanılarkən xəta baş verdi.' });
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

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }
  console.error('Unhandled route error:', err);
  return res.status(500).json({ error: 'Internal server error.' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function bootstrap() {
  loadMajorsFromWorkbook();
  await runMigrations();
  await initUserStore();
  await initAuthStore();
  await getDb();

  const server = app.listen(PORT, HOST, () => {
    console.log(`RIASEC backend running on http://${HOST}:${PORT}`);
  });

  server.on('error', (error) => {
    console.error('Server listen error:', error);
  });
}

bootstrap().catch((error) => {
  console.error('Server bootstrap failed:', error);
  process.exit(1);
});
