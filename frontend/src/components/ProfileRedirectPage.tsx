import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { buildApiUrl } from '../config';
import type { UserProfile } from '../types';

interface ProfileRedirectPageProps {
  user: UserProfile;
}

export const ProfileRedirectPage = ({ user }: ProfileRedirectPageProps) => {
  const [target, setTarget] = useState<'/account' | '/profile' | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveTarget = async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/users/${user.id}/quiz-status`));
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        setTarget(payload?.hasAttempt ? '/profile' : '/account');
      } catch {
        if (!cancelled) {
          setTarget('/account');
        }
      }
    };

    resolveTarget();

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  if (!target) {
    return (
      <section className="quiz-shell">
        <div className="quiz-card">
          <p>Yönləndirilir…</p>
        </div>
      </section>
    );
  }

  return <Navigate to={target} replace />;
};

