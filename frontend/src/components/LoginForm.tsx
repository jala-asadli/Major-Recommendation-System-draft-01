import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../config';
import { Footer } from './Footer';
import type { StoredResult, UserProfile } from '../types';

interface LoginFormProps {
  onSuccess: (payload: {
    user: UserProfile;
    results: StoredResult[];
    profile?: { username: string; birthDate: string; gender: string; email: string };
  }) => void;
  onNavigateHome?: () => void;
}

const EMAIL_HISTORY_STORAGE_KEY = 'riasec.auth.emailHistory';
const GOOGLE_SCRIPT_ID = 'google-identity-service';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const parseEmailHistory = () => {
  try {
    const raw = localStorage.getItem(EMAIL_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string').map((entry) => normalizeEmail(entry)).filter(Boolean);
  } catch {
    return [];
  }
};

export const LoginForm = ({ onSuccess, onNavigateHome }: LoginFormProps) => {
  const handleNavigateHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
      return;
    }
    navigate('/');
  };
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [info, setInfo] = useState('');
  const [acceptedRobotCheck, setAcceptedRobotCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savedEmails, setSavedEmails] = useState<string[]>(() => parseEmailHistory());
  const [showEmailOptions, setShowEmailOptions] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleInitialized = useRef(false);
  const emailInputWrapRef = useRef<HTMLLabelElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isSignInMode = location.pathname === '/login';
  const isVerificationStep = !isSignInMode && Boolean(pendingVerificationEmail);
  const isRegisterMode = !isSignInMode && !isVerificationStep;
  const emailSuggestions = useMemo(() => {
    const normalized = normalizeEmail(email);
    return savedEmails
      .filter((entry) => (normalized ? entry.includes(normalized) : true))
      .slice(0, 10);
  }, [email, savedEmails]);

  useEffect(() => {
    if (!showEmailOptions) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (emailInputWrapRef.current?.contains(event.target as Node)) return;
      setShowEmailOptions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmailOptions]);

  useEffect(() => {
    // Prevent sensitive values from carrying over between auth routes.
    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    setShowPasswords(false);
  }, [location.pathname]);

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  const resetVerificationState = () => {
    setPendingVerificationEmail('');
    setVerificationCode('');
  };

  const rememberEmail = (value: string) => {
    const normalized = normalizeEmail(value);
    if (!normalized) return;
    setSavedEmails((previous) => {
      const next = [normalized, ...previous.filter((entry) => entry !== normalized)].slice(0, 10);
      localStorage.setItem(EMAIL_HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const completeAuth = (payload: unknown) => {
    const responsePayload = payload as {
      user?: UserProfile;
      results?: StoredResult[];
      email?: string;
      profile?: { username?: string; birthDate?: string; gender?: string; email?: string };
    };
    if (responsePayload?.email) {
      rememberEmail(responsePayload.email);
    } else {
      rememberEmail(email);
    }
    const normalizedEmail = responsePayload?.email || responsePayload?.profile?.email || email;
    onSuccess({
      user: responsePayload.user as UserProfile,
      results: Array.isArray(responsePayload.results) ? responsePayload.results : [],
      profile: {
        username: responsePayload?.profile?.username?.trim() || username.trim(),
        birthDate: responsePayload?.profile?.birthDate || birthDate,
        gender: responsePayload?.profile?.gender || gender,
        email: normalizeEmail(normalizedEmail)
      }
    });
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    const initGoogle = () => {
      if (!window.google?.accounts?.id || googleInitialized.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential?: string }) => {
          if (!response?.credential) {
            setError('Google hesabı ilə giriş alınmadı.');
            return;
          }
          try {
            setLoading(true);
            resetMessages();
            const authResponse = await fetch(buildApiUrl('/api/auth/google'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ credential: response.credential })
            });
            if (!authResponse.ok) {
              const payload = await authResponse.json().catch(() => ({}));
              throw new Error(payload?.error || 'Google ilə daxil olmaq mümkün olmadı.');
            }
            const payload = await authResponse.json();
            completeAuth(payload);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Google ilə daxil olmaq mümkün olmadı.');
          } finally {
            setLoading(false);
          }
        }
      });
      googleInitialized.current = true;
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', initGoogle);
      return () => existing.removeEventListener('load', initGoogle);
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', initGoogle);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', initGoogle);
    };
  }, [onSuccess]);

  const handleGoogleAuth = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google giriş üçün VITE_GOOGLE_CLIENT_ID konfiqurasiyası tələb olunur.');
      return;
    }
    if (!googleReady || !window.google?.accounts?.id) {
      setError('Google giriş xidməti hazır deyil. Bir az sonra yenidən yoxlayın.');
      return;
    }
    resetMessages();
    window.google.accounts.id.prompt();
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !birthDate || !gender || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Bütün sahələri doldurun.');
      return;
    }
    if (!/^[A-Za-z0-9._]{3,}$/.test(username.trim())) {
      setError('Username ən az 3 simvol olmalıdır və yalnız hərf, rəqəm, nöqtə və alt xətt istifadə edə bilər.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Şifrələr eyni deyil.');
      return;
    }
    if (!acceptedRobotCheck) {
      setError('Zəhmət olmasa doğrulama üçün checkbox-u seçin.');
      return;
    }
    if (looksLikeEmail(email)) {
      rememberEmail(email);
    }

    try {
      setLoading(true);
      resetMessages();
      const response = await fetch(buildApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          birthDate,
          gender,
          email,
          password
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Qeydiyyat tamamlanmadı. Yenidən cəhd edin.');
      }
      const payload = await response.json();
      const normalizedEmail = payload?.email || email.trim().toLowerCase();
      rememberEmail(normalizedEmail);
      setPendingVerificationEmail(normalizedEmail);
      setVerificationCode('');
      setInfo('Təsdiq kodu email ünvanınıza göndərildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qeydiyyat zamanı xəta baş verdi.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingVerificationEmail || !verificationCode.trim()) {
      setError('Email və təsdiq kodunu daxil edin.');
      return;
    }

    try {
      setLoading(true);
      resetMessages();
      const response = await fetch(buildApiUrl('/api/auth/verify-email'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: pendingVerificationEmail, code: verificationCode.trim() })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Email təsdiqlənmədi.');
      }
      const payload = await response.json();
      completeAuth(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email təsdiqlənmədi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) {
      setError('Doğrulama üçün email tapılmadı. Qeydiyyatı yenidən edin.');
      return;
    }

    try {
      setLoading(true);
      resetMessages();
      const response = await fetch(buildApiUrl('/api/auth/resend-verification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: pendingVerificationEmail })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Kod yenidən göndərilmədi.');
      }
      setInfo('Yeni təsdiq kodu email ünvanınıza göndərildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kod yenidən göndərilmədi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email və şifrə daxil edin.');
      return;
    }
    if (looksLikeEmail(email)) {
      rememberEmail(email);
    }

    try {
      setLoading(true);
      resetMessages();
      const response = await fetch(buildApiUrl('/api/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Daxil olmaq mümkün olmadı.');
      }
      const payload = await response.json();
      completeAuth(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Daxil olmaq mümkün olmadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`auth-page-shell ${isRegisterMode ? 'auth-page-shell-register' : ''}`}>
      <div className="auth-shape auth-shape-teal" aria-hidden="true" />
      <div className="auth-shape auth-shape-orange" aria-hidden="true" />
      <div className="auth-shape auth-shape-ring" aria-hidden="true" />

      <div className={`auth-content-grid auth-main-container ${isRegisterMode ? 'auth-content-grid-register' : ''}`}>
        <section className="auth-card-wrap">
          <div className={`quiz-card auth-card ${isRegisterMode ? 'auth-card-register' : ''}`}>
            <header>
              <h1>{isSignInMode ? 'Daxil ol' : isVerificationStep ? 'Email Təsdiqi' : 'İndi Qeydiyyatdan Keç'}</h1>
            </header>

            {isRegisterMode && (
              <form className="login-form auth-register-form" onSubmit={handleRegister} autoComplete="off">
                <div className="register-grid">
                  <label className="input-label">
                    <span>Ad</span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Adınız"
                    />
                  </label>
                  <label className="input-label">
                    <span>Soyad</span>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Soyadınız"
                    />
                  </label>
                  <label className="input-label">
                    <span>Username</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="username123"
                    />
                  </label>
                  <label className="input-label">
                    <span>Doğum tarixi</span>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.target.value)}
                    />
                  </label>
                  <label className="input-label">
                    <span>Cins</span>
                    <select value={gender} onChange={(event) => setGender(event.target.value)}>
                      <option value="">Seçin</option>
                      <option value="female">Qadın</option>
                      <option value="male">Kişi</option>
                      <option value="other">Digər</option>
                    </select>
                  </label>
                  <label className="input-label email-input-wrap" ref={emailInputWrapRef}>
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setShowEmailOptions(true);
                      }}
                      onFocus={() => setShowEmailOptions(true)}
                      autoComplete="off"
                      spellCheck={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      name="auth-register-email"
                      placeholder="example@email.com"
                      aria-expanded={showEmailOptions && emailSuggestions.length > 0}
                      aria-controls="email-suggestions"
                    />
                    {showEmailOptions && emailSuggestions.length > 0 && (
                      <div id="email-suggestions" className="email-suggestion-list" role="listbox" aria-label="Saved emails">
                        {emailSuggestions.map((candidate) => (
                          <button
                            key={candidate}
                            type="button"
                            className="email-suggestion-item"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setEmail(candidate);
                              setShowEmailOptions(false);
                            }}
                          >
                            {candidate}
                          </button>
                        ))}
                      </div>
                    )}
                  </label>
                  <label className="input-label">
                    <span>Şifrə</span>
                    <div className="password-field-wrap">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="********"
                      />
                      <button
                        type="button"
                        className="password-visibility-toggle"
                        onClick={() => setShowPasswords((prev) => !prev)}
                        aria-label={showPasswords ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
                  <label className="input-label">
                    <span>Şifrənin təkrarı</span>
                    <div className="password-field-wrap">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="********"
                      />
                      <button
                        type="button"
                        className="password-visibility-toggle"
                        onClick={() => setShowPasswords((prev) => !prev)}
                        aria-label={showPasswords ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
                </div>
                <label className="robot-check-label">
                  <input
                    type="checkbox"
                    checked={acceptedRobotCheck}
                    onChange={(event) => setAcceptedRobotCheck(event.target.checked)}
                  />
                  <span>I am not a robot</span>
                </label>
                {info && <p className="info-text">{info}</p>}
                {error && <p className="error-text">{error}</p>}
                <button type="submit" className="primary-button" disabled={loading}>
                  {loading ? 'Göndərilir…' : 'Qeydiyyatdan Keç'}
                </button>
                <p className="auth-switch-copy">
                  Hesabınız var?{' '}
                  <button
                    type="button"
                    className="auth-switch-button"
                    onClick={() => {
                      resetMessages();
                      resetVerificationState();
                      navigate('/login');
                    }}
                  >
                    Daxil ol
                  </button>
                </p>
              </form>
            )}

            {!isSignInMode && isVerificationStep && (
              <form className="login-form" onSubmit={handleVerifyEmail}>
                <label className="input-label">
                  <span>Email</span>
                  <input type="email" value={pendingVerificationEmail} readOnly />
                </label>
                <label className="input-label">
                  <span>Təsdiq kodu</span>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    placeholder="6 rəqəmli kod"
                  />
                </label>
                {info && <p className="info-text">{info}</p>}
                {error && <p className="error-text">{error}</p>}
                <button type="submit" className="primary-button" disabled={loading}>
                  {loading ? 'Yoxlanılır…' : 'Emaili təsdiqlə'}
                </button>
                <button type="button" className="auth-google-button" disabled={loading} onClick={handleResendVerification}>
                  Kodu yenidən göndər
                </button>
                <p className="auth-switch-copy">
                  Yanlış email yazmısınız?{' '}
                  <button
                    type="button"
                    className="auth-switch-button"
                    onClick={() => {
                      resetMessages();
                      resetVerificationState();
                    }}
                  >
                    Qeydiyyata qayıt
                  </button>
                </p>
              </form>
            )}

            {isSignInMode && (
              <form className="login-form" onSubmit={handleSignIn} autoComplete="off">
                <label className="input-label email-input-wrap" ref={emailInputWrapRef}>
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                    name="auth-login-email"
                    placeholder="example@email.com"
                  />
                </label>
                <label className="input-label">
                  <span>Password</span>
                  <div className="password-field-wrap">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="********"
                    />
                    <button
                      type="button"
                      className="password-visibility-toggle"
                      onClick={() => setShowPasswords((prev) => !prev)}
                      aria-label={showPasswords ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                <div className="auth-row-inline">
                  <span />
                  <Link to="/forgot-password" className="auth-inline-link">
                    Şifrəni unutmusunuz?
                  </Link>
                </div>
                <button type="button" className="auth-google-button" onClick={handleGoogleAuth} disabled={loading}>
                  Google ilə daxil ol
                </button>
                {info && <p className="info-text">{info}</p>}
                {error && <p className="error-text">{error}</p>}
                <button type="submit" className="primary-button" disabled={loading}>
                  {loading ? 'Daxil olunur…' : 'Daxil ol'}
                </button>
                <p className="auth-switch-copy">
                  Hesabınız yoxdur?{' '}
                  <button
                    type="button"
                    className="auth-switch-button"
                    onClick={() => {
                      resetMessages();
                      resetVerificationState();
                      navigate('/register');
                    }}
                  >
                    Qeydiyyatdan keç
                  </button>
                </p>
              </form>
            )}
          </div>
        </section>

        {!isRegisterMode && (
          <aside className="auth-info-panel">
            <div>
              <h2>İxtisas seçimin üçün ilk addımı at!</h2>
              <p>Daha doğru seçim üçün daha aydın yol!</p>
            </div>
            <button type="button" className="home-brand auth-info-logo auth-brand-like-home" onClick={handleNavigateHome}>
              <span>ixtisas</span>
              <span className="home-modern-brand-dot">.ly</span>
            </button>
          </aside>
        )}
      </div>

      <Footer startTestPath="/register" />
    </section>
  );
};
