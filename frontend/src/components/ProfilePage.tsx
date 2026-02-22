import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../config';
import type { RiasecLetter, UserProfile } from '../types';

type ScoreMap = Record<RiasecLetter, number>;

interface RecommendationRow {
  major_name: string;
  recommendation_rank: number;
  recommendation_score: number;
}

interface AssessmentProfile {
  user_id: string;
  scores: ScoreMap;
  riasec_profile: string;
  chosen_major: string | null;
  satisfaction_score: number | null;
  recommendations: RecommendationRow[];
  completed: boolean;
  created_at: string | null;
}

interface ProfilePageProps {
  user: UserProfile;
}

export const ProfilePage = ({ user }: ProfilePageProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AssessmentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const hasConfirmedMajor = Boolean(profile?.chosen_major);

  const loadProfile = async () => {
    const response = await fetch(buildApiUrl(`/api/users/${user.id}/assessment-profile`));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || 'Profil yüklənə bilmədi.');
    }

    const nextProfile = payload?.profile as AssessmentProfile;
    setProfile(nextProfile);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        await loadProfile();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Profil yüklənə bilmədi.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const bars = useMemo(() => {
    const scores = profile?.scores || { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    const max = Math.max(...Object.values(scores), 1);
    return (Object.entries(scores) as Array<[RiasecLetter, number]>).map(([letter, value]) => ({
      letter,
      value,
      pct: Math.round((value / max) * 100)
    }));
  }, [profile?.scores]);

  const openMajorModal = (majorName: string) => {
    if (hasConfirmedMajor) return;
    setSelectedMajor(majorName);
    setSelectedRating(null);
    setError('');
    setSaveMessage('');
    setModalOpen(true);
  };

  const saveFeedback = async () => {
    if (!selectedMajor) {
      setError('İxtisas seçilməyib.');
      return;
    }
    if (selectedRating == null) {
      setError('Zəhmət olmasa ulduz reytinqi seçin.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSaveMessage('');
      const response = await fetch(buildApiUrl(`/api/users/${user.id}/feedback`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chosen_major: selectedMajor, satisfaction_score: selectedRating })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Seçim yadda saxlanılmadı.');
      }

      setModalOpen(false);
      setSaveMessage('Seçiminiz uğurla yadda saxlanıldı.');
      await loadProfile();
      navigate('/post-quiz');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seçim yadda saxlanılmadı.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <section className="quiz-shell"><div className="quiz-card"><p>Profil yüklənir…</p></div></section>;
  if (error && !profile) return <section className="quiz-shell"><div className="quiz-card"><p>{error}</p></div></section>;

  return (
    <section className="quiz-shell">
      <div className="quiz-card results-card">
        <header className="results-header">
          <div>
            <p className="results-label">Nəticə profili</p>
            <h1>{profile?.riasec_profile || '—'}</h1>
          </div>
        </header>

        <section className="profile-bars">
          {bars.map((bar) => (
            <div key={bar.letter} className="profile-bar-row">
              <strong>{bar.letter}</strong>
              <div className="profile-bar-track"><span style={{ width: `${bar.pct}%` }} /></div>
              <span>{bar.value}</span>
            </div>
          ))}
        </section>

        <section className="recommendations-block">
          <header>
            <p className="results-label">Tövsiyə olunan ixtisaslar</p>
            <h2>Zəhmət olmasa, sizə ən uyğun və ya davam etdirmək istədiyiniz ixtisası seçin.</h2>
          </header>

          {hasConfirmedMajor && (
            <p className="info-text">
              Seçilmiş ixtisas: <strong>{profile?.chosen_major}</strong>
            </p>
          )}

          <ol className="recommendations">
            {(profile?.recommendations || []).map((item) => (
              <li
                key={`${item.recommendation_rank}-${item.major_name}`}
                className={`${!hasConfirmedMajor ? 'recommendation-clickable' : ''} ${profile?.chosen_major === item.major_name ? 'recommendation-selected' : ''}`.trim()}
                role={!hasConfirmedMajor ? 'button' : undefined}
                tabIndex={!hasConfirmedMajor ? 0 : undefined}
                onClick={!hasConfirmedMajor ? () => openMajorModal(item.major_name) : undefined}
                onKeyDown={!hasConfirmedMajor ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openMajorModal(item.major_name);
                  }
                } : undefined}
              >
                <div>
                  <strong>#{item.recommendation_rank} {item.major_name}</strong>
                </div>
                <div className="recommendation-actions">
                  <span className="score">Bal: {item.recommendation_score.toFixed(3)}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {saveMessage && <p className="info-text">{saveMessage}</p>}
        {error && <p className="error-text">{error}</p>}
      </div>

      {modalOpen && (
        <div className="results-modal-backdrop" role="presentation">
          <div className="results-modal" role="dialog" aria-modal="true" aria-label="İxtisas seçimi təsdiqi">
            <strong>{selectedMajor}</strong>
            <p>Bu ixtisası seçmək istədiyinizə əminsiniz?</p>

            <p className="results-label" style={{ marginTop: '0.9rem' }}>Bu nəticədən nə dərəcədə razısınız?</p>
            <div className="star-rating" role="group" aria-label="Məmnunluq dərəcəsi">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`star-btn ${selectedRating != null && value <= selectedRating ? 'star-btn-active' : ''}`}
                  onClick={() => setSelectedRating(value)}
                  disabled={saving}
                  aria-label={`${value} ulduz`}
                >
                  ★
                </button>
              ))}
            </div>

            <div className="results-modal-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="primary-button" onClick={saveFeedback} disabled={saving || selectedRating == null}>
                {saving ? 'Yadda saxlanılır…' : 'Təsdiqlə'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setModalOpen(false);
                  setSelectedMajor('');
                  setSelectedRating(null);
                }}
                disabled={saving}
              >
                Ləğv et
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
