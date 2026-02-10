import { useMemo } from 'react';
import type { StoredResult, UserProfile } from '../types';

interface DashboardPageProps {
  user: UserProfile;
  results: StoredResult[];
  onStartTest: () => void;
  onOpenResults: () => void;
  onOpenAccount: () => void;
}

export const DashboardPage = ({ user, results, onStartTest, onOpenResults, onOpenAccount }: DashboardPageProps) => {
  const fullName = `${user.name} ${user.surname}`.trim();

  const stats = useMemo(() => {
    const latest = results[0];
    return {
      totalTests: results.length,
      latestProfile: latest?.profile || '—',
      latestTopMajor: latest?.recommendations?.[0]?.major || '—'
    };
  }, [results]);

  return (
    <section className="quiz-shell auth-page-section">
      <div className="quiz-card dashboard-card">
        <header className="dashboard-header">
          <p className="results-label">Dashboard</p>
          <h1>Welcome back, {fullName}</h1>
          <p>Continue your career-fit journey from here.</p>
        </header>

        <div className="dashboard-actions">
          <button type="button" className="primary-button" onClick={onStartTest}>
            Start Test
          </button>
          <button type="button" className="ghost-button" onClick={onOpenResults}>
            View Results
          </button>
          <button type="button" className="ghost-button" onClick={onOpenAccount}>
            Open Account
          </button>
        </div>

        <div className="dashboard-stats-grid">
          <article>
            <p>Total Tests</p>
            <strong>{stats.totalTests}</strong>
          </article>
          <article>
            <p>Latest Profile</p>
            <strong>{stats.latestProfile}</strong>
          </article>
          <article>
            <p>Top Suggested Major</p>
            <strong>{stats.latestTopMajor}</strong>
          </article>
        </div>
      </div>
    </section>
  );
};
