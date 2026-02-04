import { useCallback, useState } from 'react';
import { HomePage } from './components/HomePage';
import { LoginForm } from './components/LoginForm';
import { PreviousResults } from './components/PreviousResults';
import { Quiz } from './components/Quiz';
import { ResultsPage } from './components/ResultsPage';
import { buildApiUrl } from './config';
import type { QuizResultPayload, StoredResult, UserProfile } from './types';

type QuizResult = QuizResultPayload & { attemptId: string };

const generateAttemptId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const App = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showHomePage, setShowHomePage] = useState(true);
  const [previousResults, setPreviousResults] = useState<StoredResult[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);

  const userId = user?.id;

  const handleLoginSuccess = ({ user: nextUser, results }: { user: UserProfile; results: StoredResult[] }) => {
    setUser(nextUser);
    setPreviousResults(Array.isArray(results) ? results : []);
    setResult(null);
  };

  const handleComplete = useCallback((quizResult: QuizResultPayload) => {
    setResult({
      ...quizResult,
      attemptId: generateAttemptId()
    });
  }, []);

  const handleRestart = useCallback(() => {
    setResult(null);
  }, []);

  const handleSignOut = useCallback(() => {
    setUser(null);
    setPreviousResults([]);
    setResult(null);
  }, []);

  const handleResultPersisted = useCallback((storedResult: StoredResult) => {
    setPreviousResults((prev) => [storedResult, ...prev]);
  }, []);

  const refreshResults = useCallback(async () => {
    if (!userId) {
      return;
    }
    const response = await fetch(buildApiUrl(`/api/users/${userId}/results`));
    if (!response.ok) {
      throw new Error('Unable to load your saved results.');
    }
    const payload = await response.json();
    setPreviousResults(Array.isArray(payload.results) ? payload.results : []);
  }, [userId]);

  return (
    <main className="app-shell">
      {!user && showHomePage && <HomePage onRegisterClick={() => setShowHomePage(false)} />}
      {!user && !showHomePage && (
        <LoginForm onSuccess={handleLoginSuccess} onNavigateHome={() => setShowHomePage(true)} />
      )}
      {user && !result && (
        <>
          <PreviousResults
            userName={`${user.name} ${user.surname}`}
            results={previousResults}
            onRefresh={refreshResults}
            onSignOut={handleSignOut}
          />
          <Quiz onComplete={handleComplete} />
        </>
      )}
      {user && result && (
        <ResultsPage
          attemptId={result.attemptId}
          profile={result.profile}
          scores={result.scores}
          answers={result.answers}
          user={user}
          onRestart={handleRestart}
          onPersisted={handleResultPersisted}
        />
      )}
    </main>
  );
};
