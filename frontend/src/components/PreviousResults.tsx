import { useState } from 'react';
import type { StoredResult } from '../types';

interface PreviousResultsProps {
  userName: string;
  results: StoredResult[];
  onRefresh?: () => Promise<void>;
  onSignOut?: () => void;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return date.toLocaleString();
};

export const PreviousResults = ({ userName, results, onRefresh, onSignOut }: PreviousResultsProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const handleRefresh = async () => {
    if (!onRefresh) return;
    try {
      setRefreshing(true);
      setError('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh results.');
    } finally {
      setRefreshing(false);
    }
  };

  const displayItems = results.slice(0, 5);

  return (
    <section className="quiz-shell">
      <div className="quiz-card previous-results-card">
        <header className="previous-results-header">
          <div>
            <p className="results-label">Welcome back</p>
            <h2>{userName}</h2>
          </div>
          <div className="previous-results-actions">
            <button type="button" className="ghost-button" onClick={handleRefresh} disabled={!onRefresh || refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh history'}
            </button>
            {onSignOut && (
              <button type="button" className="ghost-button" onClick={onSignOut}>
                Switch user
              </button>
            )}
          </div>
        </header>

        {error && <p className="error-text">{error}</p>}

        {displayItems.length === 0 ? (
          <p className="muted-text">No saved quiz results yet. Complete the quiz to view your personalized majors.</p>
        ) : (
          <ul className="previous-results-list">
            {displayItems.map((item) => {
              const topPick = item.recommendations?.[0];
              return (
                <li key={item.id}>
                  <div>
                    <strong>{item.profile}</strong>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <div>
                    <p>{topPick ? `Top match: ${topPick.major}` : 'No recommendations stored.'}</p>
                    {topPick && <span className="score-value">Score: {topPick.score.toFixed(3)}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
