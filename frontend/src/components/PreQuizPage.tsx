import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../config';
import type { UserProfile } from '../types';

interface PreQuizPageProps {
  user: UserProfile;
}

const EDUCATION_LEVELS = [
  'İbtidai təhsil',
  'Orta təhsil',
  'Tam orta təhsil',
  'Subbakalavr',
  'Bakalavr',
  'Magistr'
] as const;

const SUBJECTS = [
  "Texnologiya",
  "Fiziki tərbiyə",
  "Çağırışaqədərki hazırlıq",
  "Riyaziyyat",
  "Fizika",
  "Kimya",
  "Biologiya",
  "İnformatika",
  "Musiqi",
  "Təsviri incəsənət",
  "Ədəbiyyat",
  "Həyat bilgisi",
  "Azərbaycan dili",
  "Ümumi tarix",
  "Xarici dil",
  "Azərbaycan tarixi"
] as const;


export const PreQuizPage = ({ user }: PreQuizPageProps) => {
  const navigate = useNavigate();
  const [educationLevel, setEducationLevel] = useState('');
  const [favoriteSubject1, setFavoriteSubject1] = useState('');
  const [favoriteSubject2, setFavoriteSubject2] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!educationLevel) {
      setError('Zəhmət olmasa təhsil səviyyəsini seçin.');
      return;
    }
    if (!favoriteSubject1) {
      setError('Zəhmət olmasa sevimli fənni seçin.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(buildApiUrl(`/api/users/${user.id}/pre-quiz`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          education_level: educationLevel,
          favorite_subject_1: favoriteSubject1,
          favorite_subject_2: favoriteSubject2 || null
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Məlumatlar yadda saxlanılmadı.');
      }

      navigate('/quiz');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Məlumatlar yadda saxlanılmadı.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="quiz-shell">
      <div className="quiz-card results-card" style={{ maxWidth: 720, margin: '0 auto' }}>
        <header className="results-header">
          <div>
            <p className="results-label">Test öncəsi məlumat</p>
            <h1>Qısa məlumat formu</h1>
          </div>
        </header>

        <form className="settings-form" onSubmit={handleSubmit}>
          <label className="input-label">
            <span>Təhsil səviyyəsi</span>
            <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
              <option value="">Seçin</option>
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>

          <label className="input-label">
            <span>Sevimli fənn 1</span>
            <select value={favoriteSubject1} onChange={(e) => setFavoriteSubject1(e.target.value)}>
              <option value="">Seçin</option>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </label>

          <label className="input-label">
            <span>Sevimli fənn 2 (istəyə bağlı)</span>
            <select value={favoriteSubject2} onChange={(e) => setFavoriteSubject2(e.target.value)}>
              <option value="">Seçilməyib</option>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="primary-button" disabled={saving || !educationLevel || !favoriteSubject1}>
            {saving ? 'Yadda saxlanılır…' : 'Davam et'}
          </button>
        </form>
      </div>
    </section>
  );
};
