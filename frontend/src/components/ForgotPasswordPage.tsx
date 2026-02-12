import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { buildApiUrl } from '../config';
import { Footer } from './Footer';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Email daxil edin.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setInfo('');
      const response = await fetch(buildApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Bərpa linki göndərilə bilmədi.');
      }
      setInfo(payload?.message || 'Şifrəni sıfırlama təlimatları üçün e-poçtunuzu yoxlayın.');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bərpa linki göndərilə bilmədi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page-shell auth-page-shell-register">
      <div className="auth-shape auth-shape-teal" aria-hidden="true" />
      <div className="auth-shape auth-shape-orange" aria-hidden="true" />
      <div className="auth-shape auth-shape-ring" aria-hidden="true" />

      <div className="auth-content-grid auth-main-container auth-content-grid-register">
        <section className="auth-card-wrap">
          <div className="quiz-card auth-card auth-card-register">
            <header>
              <h1>Şifrəni bərpa et</h1>
            </header>
            {!submitted ? (
              <form className="login-form auth-register-form" onSubmit={handleSubmit}>
                <label className="input-label">
                  <span>Email</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@email.com" autoComplete="email" />
                </label>
                {error && <p className="error-text">{error}</p>}
                <button type="submit" className="primary-button" disabled={loading}>
                  {loading ? 'Göndərilir…' : 'Bərpa linkini göndər'}
                </button>
                <p className="auth-switch-copy">
                  Hesabınıza qayıtmaq istəyirsiniz?{' '}
                  <Link to="/login" className="auth-inline-link">
                    Daxil ol
                  </Link>
                </p>
              </form>
            ) : (
              <div className="login-form auth-register-form">
                <p className="info-text">{info || 'Şifrəni sıfırlama təlimatları üçün e-poçtunuzu yoxlayın.'}</p>
                <p className="auth-switch-copy">
                  <Link to="/login" className="auth-inline-link">
                    Daxil ol səhifəsinə qayıt
                  </Link>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <Footer startTestPath="/register" />
    </section>
  );
};
