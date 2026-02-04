import { useState, type FormEvent } from 'react';
import { buildApiUrl } from '../config';
import type { StoredResult, UserProfile } from '../types';

interface LoginFormProps {
  onSuccess: (payload: { user: UserProfile; results: StoredResult[] }) => void;
  onNavigateHome?: () => void;
}

export const LoginForm = ({ onSuccess, onNavigateHome }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedRobotCheck, setAcceptedRobotCheck] = useState(false);
  const [isSignInMode, setIsSignInMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goHomeTo = (hash: string) => {
    if (hash) {
      window.location.hash = hash;
    }
    onNavigateHome?.();
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email və şifrə daxil edin.');
      return;
    }
    if (!acceptedRobotCheck) {
      setError('Zəhmət olmasa doğrulama üçün checkbox-u seçin.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await fetch(buildApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Qeydiyyat tamamlanmadı. Yenidən cəhd edin.');
      }
      const payload = await response.json();
      onSuccess({
        user: payload.user,
        results: Array.isArray(payload.results) ? payload.results : []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qeydiyyat zamanı xəta baş verdi.');
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

    try {
      setLoading(true);
      setError('');
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
      onSuccess({
        user: payload.user,
        results: Array.isArray(payload.results) ? payload.results : []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Daxil olmaq mümkün olmadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page-shell">
      <header className="home-topbar auth-topbar">
        <div className="home-container">
          <div className="home-brand">
            <span>ixtisasly</span>
            <div className="home-brand-mark" aria-hidden="true">
              ✎
            </div>
          </div>

          <nav>
            <ul className="home-nav-list">
              <li>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    goHomeTo('esas-sehife');
                  }}
                >
                  Əsas Səhifə
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    goHomeTo('about');
                  }}
                >
                  Necə işləyir?
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    goHomeTo('team');
                  }}
                >
                  Haqqımızda
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    goHomeTo('mission');
                  }}
                >
                  Missiyamız
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    goHomeTo('contact');
                  }}
                >
                  Əlaqə
                </a>
              </li>
            </ul>
          </nav>

          <div className="home-nav-actions">
            <a
              href="#"
              className="home-register-nav-button"
              onClick={(event) => {
                event.preventDefault();
                setError('');
                setIsSignInMode(false);
              }}
            >
              Qeydiyyatdan keç
            </a>
            <a
              href="#"
              className="home-login-button"
              onClick={(event) => {
                event.preventDefault();
                setError('');
                setIsSignInMode(true);
              }}
            >
              Daxil ol
            </a>
          </div>
        </div>
      </header>

      <div className="home-container auth-content-grid">
        <section className="auth-card-wrap">
          <div className="quiz-card auth-card">
            <header>
              <h1>{isSignInMode ? 'Daxil ol' : 'İndi Qeydiyyatdan Keç'}</h1>
            </header>

            {!isSignInMode && (
              <form className="login-form" onSubmit={handleRegister}>
                <label className="input-label">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="example@email.com"
                  />
                </label>
                <label className="input-label">
                  <span>Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                  />
                </label>
                <label className="robot-check-label">
                  <input
                    type="checkbox"
                    checked={acceptedRobotCheck}
                    onChange={(event) => setAcceptedRobotCheck(event.target.checked)}
                  />
                  <span>I am not a robot</span>
                </label>
                <button type="button" className="auth-google-button">
                  Google ilə qeydiyyatdan keç
                </button>
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
                      setError('');
                      setIsSignInMode(true);
                    }}
                  >
                    Daxil ol
                  </button>
                </p>
              </form>
            )}

            {isSignInMode && (
              <form className="login-form" onSubmit={handleSignIn}>
                <label className="input-label">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="example@email.com"
                  />
                </label>
                <label className="input-label">
                  <span>Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                  />
                </label>
                <button type="button" className="auth-google-button">
                  Google ilə daxil ol
                </button>
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
                      setError('');
                      setIsSignInMode(false);
                    }}
                  >
                    Qeydiyyatdan keç
                  </button>
                </p>
              </form>
            )}
          </div>
        </section>

        <aside className="auth-info-panel">
          <div>
            <h2>İxtisas seçimin üçün ilk addımı at!</h2>
            <p>Daha doğru seçim üçün daha aydın yol!</p>
          </div>
          <div className="home-brand auth-info-logo">
            <span>ixtisasly</span>
            <div className="home-brand-mark" aria-hidden="true">
              ✎
            </div>
          </div>
        </aside>
      </div>

      <div className="home-container">
        <section className="home-info-block">
          <div id="contact">
            <div className="home-section-content home-contact-footer">
              <section className="home-contact-col home-contact-brand-col">
                <div className="home-brand">
                  <span>ixtisasly</span>
                  <div className="home-brand-mark" aria-hidden="true">
                    ✎
                  </div>
                </div>
              </section>

              <section className="home-contact-col">
                <h3>Yönləndirmə</h3>
                <ul>
                  <li>
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        goHomeTo('esas-sehife');
                      }}
                    >
                      Əsas Səhifə
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        goHomeTo('about');
                      }}
                    >
                      Necə işləyir?
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        goHomeTo('team');
                      }}
                    >
                      Komanda
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        goHomeTo('mission');
                      }}
                    >
                      Missiyamız
                    </a>
                  </li>
                </ul>
              </section>

              <section className="home-contact-col">
                <h3>Keçidlər</h3>
                <ul>
                  <li>
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setError('');
                        setIsSignInMode(false);
                      }}
                    >
                      Qeydiyyatdan keç
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setError('');
                        setIsSignInMode(true);
                      }}
                    >
                      Daxil ol
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        goHomeTo('about');
                      }}
                    >
                      Necə işləyir?
                    </a>
                  </li>
                </ul>
              </section>

              <section className="home-contact-col">
                <h3>Əlaqə</h3>
                <ul className="home-contact-list">
                  <li>
                    <span className="home-contact-icon" aria-hidden="true">
                      📍
                    </span>
                    <span>Ahmadbey Aghaoglu str. 61 Baku, 1008</span>
                  </li>
                  <li>
                    <span className="home-contact-icon" aria-hidden="true">
                      ✉
                    </span>
                    <span>Email: ixtisasly@edu.az</span>
                  </li>
                  <li>
                    <span className="home-contact-icon" aria-hidden="true">
                      ☎
                    </span>
                    <span>Tel: +994 50 988 31 20</span>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </section>

        <footer className="home-footer">© 2026 ixtisasly. Bütün hüquqlar qorunur.</footer>
      </div>
    </section>
  );
};
