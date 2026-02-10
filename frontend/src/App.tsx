import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AccountPage } from './components/AccountPage';
import { HomePage } from './components/HomePage';
import { LoginForm } from './components/LoginForm';
import { Navbar } from './components/Navbar';
import { PreviousResults } from './components/PreviousResults';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import { Quiz } from './components/Quiz';
import { ResultsPage } from './components/ResultsPage';
import { SettingsPage } from './components/SettingsPage';
import { buildApiUrl } from './config';
import type { QuizResultPayload, StoredResult, UserProfile } from './types';

type QuizResult = QuizResultPayload & { attemptId: string };
type ProfileSettings = {
  username: string;
  birthDate: string;
  gender: string;
  email: string;
};

const AUTH_USER_STORAGE_KEY = 'riasec.auth.user';
const PROFILE_SETTINGS_STORAGE_KEY = 'riasec.profile.settings';

const generateAttemptId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isValidStoredUser = (value: unknown): value is UserProfile => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.surname === 'string' &&
    Boolean(candidate.id.trim())
  );
};

const parseProfileSettings = () => {
  try {
    const raw = localStorage.getItem(PROFILE_SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, ProfileSettings>) : {};
  } catch {
    return {};
  }
};

export const App = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [previousResults, setPreviousResults] = useState<StoredResult[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [profileSettings, setProfileSettings] = useState<Record<string, ProfileSettings>>(() => parseProfileSettings());
  const [authReady, setAuthReady] = useState(false);

  const loadResultsForUser = useCallback(async (targetUserId: string) => {
    const response = await fetch(buildApiUrl(`/api/users/${targetUserId}/results`));
    if (!response.ok) {
      throw new Error('Unable to load your saved results.');
    }
    const payload = await response.json();
    const results = Array.isArray(payload.results) ? payload.results : [];
    setPreviousResults(results);
    return results;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateSession = async () => {
      try {
        const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw);
        if (!isValidStoredUser(parsed)) {
          localStorage.removeItem(AUTH_USER_STORAGE_KEY);
          return;
        }

        if (cancelled) return;
        setUser(parsed);

        try {
          await loadResultsForUser(parsed.id);
        } catch {
          if (!cancelled) {
            setPreviousResults([]);
          }
        }
      } catch {
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    hydrateSession();

    return () => {
      cancelled = true;
    };
  }, [loadResultsForUser]);

  useEffect(() => {
    localStorage.setItem(PROFILE_SETTINGS_STORAGE_KEY, JSON.stringify(profileSettings));
  }, [profileSettings]);

  const handleLoginSuccess = ({ user: nextUser, results }: { user: UserProfile; results: StoredResult[] }) => {
    setUser(nextUser);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(nextUser));
    setPreviousResults(Array.isArray(results) ? results : []);
    setResult(null);
    navigate('/');
  };

  const handleComplete = useCallback(
    (quizResult: QuizResultPayload) => {
      setResult({
        ...quizResult,
        attemptId: generateAttemptId()
      });
      navigate('/results');
    },
    [navigate]
  );

  const handleRestart = useCallback(() => {
    setResult(null);
    navigate('/test');
  }, [navigate]);

  const handleSignOut = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    setPreviousResults([]);
    setResult(null);
  }, []);

  const handleResultPersisted = useCallback((storedResult: StoredResult) => {
    setPreviousResults((prev) => [storedResult, ...prev]);
  }, []);

  const refreshResults = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    await loadResultsForUser(user.id);
  }, [loadResultsForUser, user?.id]);

  const handleSaveSettings = useCallback(
    (payload: ProfileSettings & { name: string; surname: string }) => {
      if (!user) return;
      setUser((prev) => (prev ? { ...prev, name: payload.name.trim(), surname: payload.surname.trim() } : prev));
      setProfileSettings((prev) => ({
        ...prev,
        [user.id]: {
          username: payload.username,
          birthDate: payload.birthDate,
          gender: payload.gender,
          email: payload.email
        }
      }));
      navigate('/account');
    },
    [navigate, user]
  );

  const activeSettings: ProfileSettings = user
    ? profileSettings[user.id] || { username: '', birthDate: '', gender: '', email: '' }
    : { username: '', birthDate: '', gender: '', email: '' };

  if (!authReady) {
    return <main className="app-shell" />;
  }

  return (
    <main className="app-shell">
      <Navbar
        isAuthenticated={Boolean(user)}
        avatarSource={user ? (activeSettings.username || activeSettings.email || user.name || user.id) : ''}
        onLogout={handleSignOut}
      />

      <Routes>
        <Route path="/" element={<HomePage user={user} />} />

        <Route
          path="/login"
          element={
            <PublicOnlyRoute user={user}>
              <LoginForm onSuccess={handleLoginSuccess} onNavigateHome={() => navigate('/')} />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicOnlyRoute user={user}>
              <LoginForm onSuccess={handleLoginSuccess} onNavigateHome={() => navigate('/')} />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/test"
          element={
            <ProtectedRoute user={user}>
              <Quiz onComplete={handleComplete} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results"
          element={
            <ProtectedRoute user={user}>
              {!result ? (
                <PreviousResults userName={`${user?.name || ''} ${user?.surname || ''}`.trim()} results={previousResults} onRefresh={refreshResults} />
              ) : (
                <ResultsPage
                  attemptId={result.attemptId}
                  profile={result.profile}
                  scores={result.scores}
                  answers={result.answers}
                  user={user as UserProfile}
                  onRestart={handleRestart}
                  onPersisted={handleResultPersisted}
                />
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/account"
          element={
            <ProtectedRoute user={user}>
              <AccountPage
                user={user as UserProfile}
                settings={activeSettings}
                resultCount={previousResults.length}
                onOpenSettings={() => navigate('/settings')}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute user={user}>
              <SettingsPage user={user as UserProfile} settings={activeSettings} onSave={handleSaveSettings} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
};
