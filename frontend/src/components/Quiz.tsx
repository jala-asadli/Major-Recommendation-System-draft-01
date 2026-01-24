import { useEffect, useMemo, useState } from 'react';
import { QuestionCard } from './QuestionCard';
import { buildApiUrl } from '../config';
import { useRiasecScoring } from '../hooks/useRiasecScoring';
import type { QuestionOption, QuizQuestion, ScoreRecord, QuizResultPayload } from '../types';

interface QuizProps {
  onComplete: (result: QuizResultPayload) => void;
}

export const Quiz = ({ onComplete }: QuizProps) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showDetails, setShowDetails] = useState(false);
  const { scores, addCode, reset, getProfileString } = useRiasecScoring();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const response = await fetch(buildApiUrl('/api/questions'));
        if (!response.ok) {
          throw new Error('Unable to load quiz items');
        }
        const payload = await response.json();
        setQuestions(Array.isArray(payload.questions) ? payload.questions : []);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const commitAnswer = (questionId: number, value: string) => {
    let snapshot: Record<number, string> = {};
    setAnswers((prev) => {
      snapshot = { ...prev, [questionId]: value };
      return snapshot;
    });
    return snapshot;
  };

  const handleSelect = (option: QuestionOption) => {
    const currentQuestion = questions[currentIndex];
    const updatedScores = addCode(option.code);
    const updatedAnswers = commitAnswer(currentQuestion.id, option.id);
    const isLast = currentIndex + 1 >= questions.length;
    if (isLast) {
      const profile = getProfileString(updatedScores);
      onComplete({ profile, scores: updatedScores, answers: updatedAnswers });
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePass = () => {
    const currentQuestion = questions[currentIndex];
    const updatedAnswers = commitAnswer(currentQuestion.id, 'pass');
    const isLast = currentIndex + 1 >= questions.length;
    if (isLast) {
      const profile = getProfileString(scores);
      onComplete({ profile, scores, answers: updatedAnswers });
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setAnswers({});
    reset();
  };

  const progressPercent = useMemo(() => {
    if (!questions.length) {
      return 0;
    }
    return Math.round(((currentIndex + 1) / questions.length) * 100);
  }, [currentIndex, questions.length]);

  const renderStatusPanel = (message: string, actionLabel?: string, action?: () => void) => (
    <section className="quiz-shell">
      <div className="status-panel">
        <p>{message}</p>
        {actionLabel && action && (
          <button type="button" className="primary-button" onClick={action}>
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  );

  if (loading) {
    return renderStatusPanel('Loading questions…');
  }

  if (error) {
    return renderStatusPanel(`Failed to load quiz: ${error}`, 'Try again', restartQuiz);
  }

  if (!questions.length) {
    return renderStatusPanel('No quiz items available right now. Please check back soon.');
  }

  const question = questions[currentIndex];

  return (
    <section className="quiz-shell">
      <div className="quiz-card">
        <div className="progress-banner" aria-live="polite">
          <div className="progress-label">
            <span>Step {currentIndex + 1} of {questions.length}</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <QuestionCard key={question.id} question={question} onSelect={handleSelect} onPass={handlePass} />

        <div className="details-panel">
          <div className="details-header">
            <p className="details-copy">Your RIASEC tally updates quietly in the background.</p>
            <div className="details-actions">
              <button type="button" className="ghost-button" onClick={restartQuiz}>
                Restart quiz
              </button>
              <button type="button" className="details-toggle" onClick={() => setShowDetails((prev) => !prev)}>
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
            </div>
          </div>
          {showDetails && (
            <div className="score-grid">
              {Object.entries(scores).map(([letter, value]) => (
                <div key={letter} className="score-pill">
                  <strong>{letter}</strong>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
