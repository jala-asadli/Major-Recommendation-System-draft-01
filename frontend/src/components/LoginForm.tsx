import { useState, type FormEvent } from 'react';
import { buildApiUrl } from '../config';
import type { StoredResult, UserProfile } from '../types';

interface LoginFormProps {
  onSuccess: (payload: { user: UserProfile; results: StoredResult[] }) => void;
}

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !surname.trim()) {
      setError('Please enter both your name and surname.');
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
        body: JSON.stringify({ name, surname })
      });
      if (!response.ok) {
        throw new Error('Unable to log you in right now.');
      }
      const payload = await response.json();
      onSuccess({
        user: payload.user,
        results: Array.isArray(payload.results) ? payload.results : []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="quiz-shell">
      <div className="quiz-card login-card">
        <header>
          <p className="results-label">RIASEC quiz</p>
          <h1>Log in to continue</h1>
          <p className="muted-text">Enter your name and surname to resume your personalized recommendations.</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="input-label">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jane"
            />
          </label>
          <label className="input-label">
            <span>Surname</span>
            <input
              type="text"
              value={surname}
              onChange={(event) => setSurname(event.target.value)}
              placeholder="Doe"
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      </div>
    </section>
  );
};
