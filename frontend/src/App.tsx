import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AccountPage } from './components/AccountPage';
import { HomePage } from './components/HomePage';
import { LoginForm } from './components/LoginForm';
import { Navbar } from './components/Navbar';
import { PreviousResults } from './components/PreviousResults';
import { ProfilePage } from './components/ProfilePage';
import { ProfileRedirectPage } from './components/ProfileRedirectPage';
import { PreQuizPage } from './components/PreQuizPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import { Quiz } from './components/Quiz';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { ResultsPage } from './components/ResultsPage';
import { buildApiUrl } from './config';
import type { QuizResultPayload, StoredResult, UserProfile } from './types';

type QuizResult = QuizResultPayload & { attemptId: string };
type ProfileSettings = {
  username: string;
  birthDate: string;
  gender: string;
  email: string;
};

type ProfilePayload = Partial<ProfileSettings>;

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
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [previousResults, setPreviousResults] = useState<StoredResult[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [profileSettings, setProfileSettings] = useState<Record<string, ProfileSettings>>(() => parseProfileSettings());
  const [authReady, setAuthReady] = useState(false);

  const normalizeStoredResults = useCallback((rawResults: unknown[]): StoredResult[] => {
    return rawResults.map((item) => {
      const result = item as Record<string, unknown>;
      return {
        id: String(result.id || ''),
        profile: String(result.profile || ''),
        scores: (result.scores || {}) as StoredResult['scores'],
        answers: (result.answers || {}) as StoredResult['answers'],
        responseTimesSec: (result.responseTimesSec || result.response_times_sec || undefined) as StoredResult['responseTimesSec'],
        recommendations: Array.isArray(result.recommendations) ? (result.recommendations as StoredResult['recommendations']) : [],
        topMatch: (result.topMatch ?? result.top_match ?? null) as StoredResult['topMatch'],
        chosenMajor: (result.chosenMajor ?? result.chosen_major ?? null) as StoredResult['chosenMajor'],
        satisfactionScore: (result.satisfactionScore ?? result.satisfaction_score ?? null) as StoredResult['satisfactionScore'],
        createdAt: String(result.createdAt || result.created_at || '')
      };
    });
  }, []);

  const loadResultsForUser = useCallback(async (targetUserId: string) => {
    const response = await fetch(buildApiUrl(`/api/users/${targetUserId}/results`));
    if (!response.ok) {
      throw new Error('Unable to load your saved results.');
    }
    const payload = await response.json();
    const results = Array.isArray(payload.results) ? normalizeStoredResults(payload.results) : [];
    setPreviousResults(results);
    return results;
  }, [normalizeStoredResults]);

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

  const handleLoginSuccess = ({
    user: nextUser,
    results,
    profile
  }: {
    user: UserProfile;
    results: StoredResult[];
    profile?: ProfilePayload;
  }) => {
    const normalizedResults = Array.isArray(results) ? normalizeStoredResults(results) : [];
    setUser(nextUser);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(nextUser));
    if (profile) {
      setProfileSettings((prev) => ({
        ...prev,
        [nextUser.id]: {
          username: profile.username?.trim() || prev[nextUser.id]?.username || '',
          birthDate: profile.birthDate || prev[nextUser.id]?.birthDate || '',
          gender: profile.gender || prev[nextUser.id]?.gender || '',
          email: profile.email?.trim() || prev[nextUser.id]?.email || ''
        }
      }));
    }
    setPreviousResults(normalizedResults);
    setResult(null);
    navigate(normalizedResults.length > 0 ? '/profile' : '/');
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
    navigate('/pre-quiz');
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

  const handleFeedbackConfirmed = useCallback(async () => {
    if (user?.id) {
      try {
        await loadResultsForUser(user.id);
      } catch {
        // Keep existing local results if refresh fails.
      }
    }
    setResult(null);
    navigate('/profile');
  }, [loadResultsForUser, navigate, user?.id]);

  const refreshResults = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    await loadResultsForUser(user.id);
  }, [loadResultsForUser, user?.id]);

  const handleSaveSettings = useCallback(
    async (payload: ProfileSettings & { name: string; surname: string }) => {
      if (!user) return;

      const response = await fetch(buildApiUrl(`/api/users/${user.id}/profile`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: payload.name,
          surname: payload.surname,
          username: payload.username,
          birthDate: payload.birthDate,
          gender: payload.gender,
          email: payload.email
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to save settings.');
      }

      const nextUser: UserProfile = {
        id: user.id,
        name: data?.user?.name || payload.name.trim(),
        surname: data?.user?.surname || payload.surname.trim()
      };

      const nextSettings: ProfileSettings = {
        username: data?.profile?.username ?? payload.username,
        birthDate: data?.profile?.birthDate ?? payload.birthDate,
        gender: data?.profile?.gender ?? payload.gender,
        email: data?.profile?.email ?? payload.email
      };

      setUser(nextUser);
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(nextUser));
      setProfileSettings((prev) => ({
        ...prev,
        [user.id]: nextSettings
      }));
      navigate('/account');
    },
    [navigate, user]
  );

  const activeSettings: ProfileSettings = user
    ? profileSettings[user.id] || { username: '', birthDate: '', gender: '', email: '' }
    : { username: '', birthDate: '', gender: '', email: '' };
  const isHomeRoute = location.pathname === '/';
  const isAuthRoute =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';
  const isAccountRoute = location.pathname === '/account';
  const shellClassName = isHomeRoute || isAuthRoute || isAccountRoute ? '' : 'app-shell';
  const mainClassName = `app-main ${isHomeRoute || isAccountRoute ? 'app-main-overlay' : 'app-main-with-navbar-offset'} ${shellClassName}`.trim();

  if (!authReady) {
    return <main className={shellClassName} />;
  }

  return (
    <main className={mainClassName}>
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
          path="/forgot-password"
          element={
            <PublicOnlyRoute user={user}>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/reset-password"
          element={
            <PublicOnlyRoute user={user}>
              <ResetPasswordPage />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/test"
          element={
            <ProtectedRoute user={user}>
              <Navigate to="/pre-quiz" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pre-quiz"
          element={
            <ProtectedRoute user={user}>
              {previousResults.length > 0 ? <Navigate to="/profile" replace /> : <PreQuizPage user={user as UserProfile} />}
            </ProtectedRoute>
          }
        />

        <Route
          path="/quiz"
          element={
            <ProtectedRoute user={user}>
              {previousResults.length > 0 ? <Navigate to="/profile" replace /> : <Quiz onComplete={handleComplete} />}
            </ProtectedRoute>
          }
        />

        <Route
          path="/results"
          element={
            <ProtectedRoute user={user}>
              {!result ? (
                <PreviousResults
                  userName={`${user?.name || ''} ${user?.surname || ''}`.trim()}
                  results={previousResults}
                  onRefresh={refreshResults}
                />
              ) : (
                <ResultsPage
                  attemptId={result.attemptId}
                  profile={result.profile}
                  scores={result.scores}
                  answers={result.answers}
                  responseTimesSec={result.responseTimesSec}
                  user={user as UserProfile}
                  onRestart={handleRestart}
                  onPersisted={handleResultPersisted}
                  onFeedbackConfirmed={handleFeedbackConfirmed}
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
                onSave={handleSaveSettings}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profilim"
          element={
            <ProtectedRoute user={user}>
              <ProfileRedirectPage user={user as UserProfile} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <ProfilePage user={user as UserProfile} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/post-quiz"
          element={
            <ProtectedRoute user={user}>
              <ProfilePage user={user as UserProfile} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
};
