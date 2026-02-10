import type { UserProfile } from '../types';

interface UserHomePageProps {
  user: UserProfile;
  onStartQuiz: () => void;
  onSignOut: () => void;
}

export const UserHomePage = ({ user, onStartQuiz, onSignOut }: UserHomePageProps) => {
  const fullName = `${user.name} ${user.surname}`.trim();

  return (
    <section className="quiz-shell">
      <div className="quiz-card user-home-card">
        <p className="results-label">Logged in profile</p>
        <h1>{fullName}</h1>
        <p className="user-home-copy">Welcome back. Start your test when you are ready.</p>

        <div className="user-home-actions">
          <button type="button" className="primary-button" onClick={onStartQuiz}>
            Start test
          </button>
          <button type="button" className="ghost-button" onClick={onSignOut}>
            Log out
          </button>
        </div>
      </div>
    </section>
  );
};
