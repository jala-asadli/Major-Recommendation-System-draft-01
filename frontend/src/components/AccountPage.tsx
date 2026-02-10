import type { UserProfile } from '../types';

interface AccountPageProps {
  user: UserProfile;
  settings: {
    username: string;
    birthDate: string;
    gender: string;
    email: string;
  };
  resultCount: number;
  onOpenSettings: () => void;
}

export const AccountPage = ({ user, settings, resultCount, onOpenSettings }: AccountPageProps) => {
  return (
    <section className="quiz-shell auth-page-section">
      <div className="quiz-card account-card">
        <header className="account-header">
          <p className="results-label">Account</p>
          <h1>{`${user.name} ${user.surname}`.trim()}</h1>
        </header>

        <dl className="account-grid">
          <div>
            <dt>User ID</dt>
            <dd>{user.id}</dd>
          </div>
          <div>
            <dt>Username</dt>
            <dd>{settings.username || 'Not set'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{settings.email || 'Not set'}</dd>
          </div>
          <div>
            <dt>Birth Date</dt>
            <dd>{settings.birthDate || 'Not set'}</dd>
          </div>
          <div>
            <dt>Gender</dt>
            <dd>{settings.gender || 'Not set'}</dd>
          </div>
          <div>
            <dt>Completed Tests</dt>
            <dd>{resultCount}</dd>
          </div>
        </dl>

        <div className="account-actions">
          <button type="button" className="primary-button" onClick={onOpenSettings}>
            Edit Settings
          </button>
        </div>
      </div>
    </section>
  );
};
