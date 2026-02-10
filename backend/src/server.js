import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { riasecItems } from './riasecItems.js';
import { loadMajorsFromWorkbook, getAllMajors, getRecommendations } from './majorService.js';
import { initUserStore, getOrCreateUser, getUserById, getUserResults, recordUserResult } from './userStore.js';
import {
  initAuthStore,
  getCredential,
  saveCredential,
  getVerification,
  saveVerification,
  incrementVerificationAttempt,
  clearVerification
} from './authStore.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5001;
const VERIFICATION_TTL_MINUTES = Math.max(1, Number.parseInt(process.env.EMAIL_VERIFICATION_TTL_MINUTES || '10', 10));
const VERIFICATION_MAX_ATTEMPTS = Math.max(1, Number.parseInt(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS || '5', 10));
const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || '';
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = typeof process.env.SMTP_SECURE === 'string' ? process.env.SMTP_SECURE === 'true' : SMTP_PORT === 465;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

loadMajorsFromWorkbook();
initUserStore();
initAuthStore();

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
const hashVerificationCode = (email, code) => createHash('sha256').update(`${email}:${code}`).digest('hex');
const generateVerificationCode = () => randomInt(100000, 1000000).toString();
const getVerificationExpiry = () => new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000).toISOString();
const isVerificationExpired = (verification) => {
  if (!verification?.expiresAt) return true;
  return Number.isNaN(Date.parse(verification.expiresAt)) || Date.parse(verification.expiresAt) <= Date.now();
};
const isHashMatch = (left, right) => {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
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

app.get('/api/questions', (req, res) => {
  res.json({ total: riasecItems.length, questions: riasecItems });
});

app.get('/api/majors/all', (req, res) => {
  const majors = getAllMajors();
  res.json({ total: majors.length, majors });
});

app.post('/api/login', (req, res) => {
  try {
    const { name, surname, email, password } = req.body || {};
    if (email && password) {
      const normalizedEmail = normalizeEmail(email);
      const account = getCredential(normalizedEmail);
      if (!account) {
        const pendingVerification = getVerification(normalizedEmail);
        if (pendingVerification) {
          if (isVerificationExpired(pendingVerification)) {
            clearVerification(normalizedEmail);
          } else if (pendingVerification.password === password) {
            return res.status(403).json({ error: 'Please verify your email before signing in.' });
          }
        }
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      if (account.password !== password) {
        if (account.provider === 'google' && !account.password) {
          return res.status(400).json({ error: 'This account uses Google sign-in. Please continue with Google.' });
        }
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const user = getUserById(account.userId);
      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }
      const results = getUserResults(user.id);
      return res.json({ user: { id: user.id, name: user.name, surname: user.surname }, results });
    }

    const user = getOrCreateUser(name, surname);
    const results = getUserResults(user.id);
    res.json({ user: { id: user.id, name: user.name, surname: user.surname }, results });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Unable to login' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email and password are required.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include uppercase, number, and special character.'
      });
    }

    const normalizedEmail = normalizeEmail(email);
    if (getCredential(normalizedEmail)) {
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
    saveVerification(normalizedEmail, {
      password,
      codeHash: hashVerificationCode(normalizedEmail, verificationCode),
      expiresAt,
      attemptCount: 0,
      createdAt: new Date().toISOString()
    });

    try {
      await sendVerificationEmail({ email: normalizedEmail, code: verificationCode, expiresAt });
    } catch (mailError) {
      clearVerification(normalizedEmail);
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

app.post('/api/auth/verify-email', (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code || typeof email !== 'string' || typeof code !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (getCredential(normalizedEmail)) {
      return res.status(409).json({ error: 'This email is already verified.' });
    }

    const verification = getVerification(normalizedEmail);
    if (!verification) {
      return res.status(404).json({ error: 'No pending verification found for this email.' });
    }
    if (isVerificationExpired(verification)) {
      clearVerification(normalizedEmail);
      return res.status(400).json({ error: 'Verification code expired. Please register again.' });
    }

    const submittedHash = hashVerificationCode(normalizedEmail, code.trim());
    if (!isHashMatch(submittedHash, verification.codeHash)) {
      const updated = incrementVerificationAttempt(normalizedEmail);
      const attempts = updated?.attemptCount || 1;
      if (attempts >= VERIFICATION_MAX_ATTEMPTS) {
        clearVerification(normalizedEmail);
        return res.status(429).json({ error: 'Too many failed attempts. Please register again.' });
      }
      const remaining = VERIFICATION_MAX_ATTEMPTS - attempts;
      return res.status(400).json({ error: `Invalid verification code. ${remaining} attempt(s) left.` });
    }

    const { name, surname } = toNameParts(normalizedEmail);
    const user = getOrCreateUser(name, surname);
    saveCredential(normalizedEmail, {
      userId: user.id,
      password: verification.password,
      verifiedAt: new Date().toISOString()
    });
    clearVerification(normalizedEmail);

    const results = getUserResults(user.id);
    return res.json({ ok: true, email: normalizedEmail, user: { id: user.id, name: user.name, surname: user.surname }, results });
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
    if (getCredential(normalizedEmail)) {
      return res.status(409).json({ error: 'This email is already verified.' });
    }
    if (!mailer) {
      return res.status(503).json({
        error:
          'Email service is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM (or SMTP_SERVICE).'
      });
    }

    const pending = getVerification(normalizedEmail);
    if (!pending) {
      return res.status(404).json({ error: 'No pending verification found. Please register again.' });
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = getVerificationExpiry();
    saveVerification(normalizedEmail, {
      password: pending.password,
      codeHash: hashVerificationCode(normalizedEmail, verificationCode),
      expiresAt,
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
    const existingCredential = getCredential(normalizedEmail);
    let user = existingCredential ? getUserById(existingCredential.userId) : null;
    if (!user) {
      const name = payload.given_name || payload.name?.split(' ')[0] || 'Google';
      const surname = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || 'User';
      user = getOrCreateUser(name, surname);
    }

    saveCredential(normalizedEmail, {
      userId: user.id,
      password: existingCredential?.password || '',
      provider: 'google',
      googleSub: payload.sub,
      verifiedAt: new Date().toISOString()
    });

    const results = getUserResults(user.id);
    return res.json({ ok: true, user: { id: user.id, name: user.name, surname: user.surname }, results });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(401).json({ error: 'Google authentication failed.' });
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

const server = app.listen(PORT, () => {
  console.log(`RIASEC backend running on port ${PORT}`);
});

server.on('error', (error) => {
  console.error('Server listen error:', error);
});
