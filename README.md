# Major-Recommendation-System

## Email verification setup

Registration now requires email verification.

### 1. Configure backend env

Create `backend/.env` from `backend/.env.example` and set SMTP values:

```env
NODE_ENV=development
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_SERVICE=
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
EMAIL_VERIFICATION_TTL_MINUTES=10
EMAIL_VERIFICATION_MAX_ATTEMPTS=5
```

If you use a provider shortcut (`SMTP_SERVICE` like `gmail`), `SMTP_HOST` can stay empty.

### 2. Configure frontend API base

Set `frontend/.env`:

```env
VITE_API_BASE=http://localhost:5001
```

### 3. Run app

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

### 4. Auth flow

1. `POST /api/auth/register` sends a code to email.
2. `POST /api/auth/verify-email` verifies code and creates account.
3. `POST /api/auth/resend-verification` sends a new code.
4. `POST /api/login` only works after email is verified.
