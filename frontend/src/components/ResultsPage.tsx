import { useEffect, useMemo, useState } from 'react';
import { RecommendationList } from './RecommendationList';
import { buildApiUrl } from '../config';
import type { MajorRecommendation, QuizResultPayload, StoredResult, UserProfile } from '../types';

interface ResultsPageProps extends QuizResultPayload {
  attemptId: string;
  user: UserProfile;
  onRestart: () => void;
  onPersisted?: (result: StoredResult) => void;
  onFeedbackConfirmed?: () => void;
}

export const ResultsPage = ({
  attemptId,
  profile,
  scores,
  answers,
  responseTimesSec,
  user,
  onRestart,
  onPersisted,
  onFeedbackConfirmed
}: ResultsPageProps) => {
  const [recommendations, setRecommendations] = useState<MajorRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const saveSubmission = async () => {
      setLoading(true);
      setError('');
      try {
        const saveResponse = await fetch(buildApiUrl(`/api/users/${user.id}/results`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            profile,
            scores,
            answers,
            responseTimesSec
          })
        });
        if (!saveResponse.ok) {
          const body = await saveResponse.json().catch(() => ({}));
          if (saveResponse.status === 409) {
            onFeedbackConfirmed?.();
            return;
          }
          throw new Error(body?.error || 'Unable to save your quiz results');
        }
        const savedPayload = await saveResponse.json();
        if (cancelled) return;
        if (savedPayload?.result) {
          const nextRecommendations: MajorRecommendation[] = Array.isArray(savedPayload.result.recommendations)
            ? savedPayload.result.recommendations
            : [];
          setRecommendations(nextRecommendations);
          onPersisted?.(savedPayload.result);
          onFeedbackConfirmed?.();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    saveSubmission();
    return () => {
      cancelled = true;
    };
  }, [attemptId, profile, scores, answers, responseTimesSec, user.id, onPersisted, onFeedbackConfirmed]);

  const sortedScores = useMemo(() => {
    return Object.entries(scores)
      .sort((a, b) => {
        const diff = b[1] - a[1];
        return diff === 0 ? a[0].localeCompare(b[0]) : diff;
      })
      .map(([letter, value]) => ({ letter, value }));
  }, [scores]);

  return (
    <section className="quiz-shell">
      <div className="quiz-card results-card">
        <header className="results-header">
          <div>
            <p className="results-label">Your RIASEC profile</p>
            <h1>{profile}</h1>
          </div>
          <button type="button" className="primary-button" onClick={onRestart}>
            Retake quiz
          </button>
        </header>

        <div className="score-grid">
          {sortedScores.map((entry) => (
            <div key={entry.letter} className="score-pill">
              <strong>{entry.letter}</strong>
              <span>{entry.value}</span>
            </div>
          ))}
        </div>

        <section className="recommendations-block">
          <header>
            <p className="results-label">Top matching majors</p>
            <h2>Personalized for your strengths</h2>
          </header>
          {loading && <p>Saving your results…</p>}
          {error && <p>{error}</p>}
          {!loading && (
            <RecommendationList recommendations={recommendations} />
          )}
        </section>
      </div>
    </section>
  );
};
