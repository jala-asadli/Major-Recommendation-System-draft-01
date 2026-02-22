import { useEffect, useMemo, useRef, useState } from 'react';
import { QuestionCard } from './QuestionCard';
import { buildApiUrl } from '../config';
import { useRiasecScoring } from '../hooks/useRiasecScoring';
import type { QuizQuestion, QuizResultPayload } from '../types';

interface QuizProps {
  onComplete: (result: QuizResultPayload) => void;
}

export const Quiz = ({ onComplete }: QuizProps) => {
  const AUTO_ADVANCE_DELAY_MS = 380;
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [responseTimesSec, setResponseTimesSec] = useState<Record<number, number>>({});
  const { scores, addCode, reset, getProfileString } = useRiasecScoring();
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const questionStartedAtRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : Date.now());
  const answersRef = useRef<Record<number, string>>({});
  const responseTimesSecRef = useRef<Record<number, number>>({});
  const pendingResponseTimeSecRef = useRef<number | null>(null);

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
    answersRef.current = { ...answersRef.current, [questionId]: value };
    setAnswers(answersRef.current);
    return answersRef.current;
  };

  const getElapsedSeconds = () => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = (now - questionStartedAtRef.current) / 1000;
    return Number(Math.max(0, elapsed).toFixed(2));
  };

  const commitResponseTime = (questionId: number, elapsedSec?: number) => {
    const measured = typeof elapsedSec === 'number' && Number.isFinite(elapsedSec) ? elapsedSec : getElapsedSeconds();
    responseTimesSecRef.current = { ...responseTimesSecRef.current, [questionId]: Number(Math.max(0, measured).toFixed(2)) };
    setResponseTimesSec(responseTimesSecRef.current);
    return responseTimesSecRef.current;
  };

  const clearAutoAdvance = () => {
    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  };

  const commitSelectedAnswer = (optionId: string) => {
    const currentQuestion = questions[currentIndex];
    const selectedOption = currentQuestion.options.find((option) => option.id === optionId);
    if (!selectedOption) return;

    const option = selectedOption;
    const updatedScores = addCode(option.code);
    const updatedAnswers = commitAnswer(currentQuestion.id, option.id);
    const updatedResponseTimes = commitResponseTime(currentQuestion.id, pendingResponseTimeSecRef.current ?? undefined);
    pendingResponseTimeSecRef.current = null;
    const isLast = currentIndex + 1 >= questions.length;
    if (isLast) {
      const profile = getProfileString(updatedScores);
      onComplete({ profile, scores: updatedScores, answers: updatedAnswers, responseTimesSec: updatedResponseTimes });
    } else {
      setSelectedOptionId(null);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    setSelectedOptionId(optionId);
    pendingResponseTimeSecRef.current = getElapsedSeconds();
    clearAutoAdvance();
    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      commitSelectedAnswer(optionId);
      autoAdvanceTimeoutRef.current = null;
    }, AUTO_ADVANCE_DELAY_MS);
  };

  const handlePass = () => {
    clearAutoAdvance();
    const currentQuestion = questions[currentIndex];
    const elapsedSec = getElapsedSeconds();
    const updatedAnswers = commitAnswer(currentQuestion.id, 'pass');
    const updatedResponseTimes = commitResponseTime(currentQuestion.id, elapsedSec);
    const isLast = currentIndex + 1 >= questions.length;
    if (isLast) {
      const profile = getProfileString(scores);
      onComplete({ profile, scores, answers: updatedAnswers, responseTimesSec: updatedResponseTimes });
    } else {
      setSelectedOptionId(null);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const restartQuiz = () => {
    clearAutoAdvance();
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswers({});
    setResponseTimesSec({});
    answersRef.current = {};
    responseTimesSecRef.current = {};
    pendingResponseTimeSecRef.current = null;
    reset();
  };

  useEffect(() => {
    return () => {
      clearAutoAdvance();
    };
  }, []);

  useEffect(() => {
    questionStartedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }, [currentIndex]);

  const progressPercent = useMemo(() => {
    if (!questions.length) {
      return 0;
    }
    return Math.round(((currentIndex + 1) / questions.length) * 100);
  }, [currentIndex, questions.length]);

  const renderStatusPanel = (message: string, actionLabel?: string, action?: () => void) => (
    <section className="quiz-shell quiz-test-shell">
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
    <section className="quiz-shell quiz-test-shell">
      <div className="quiz-card quiz-test-card">
        <div className="progress-banner" aria-live="polite">
          <div className="progress-label">
            <span>SUAL {currentIndex + 1} / {questions.length}</span>
            <span>{progressPercent}%</span>
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

        <QuestionCard key={question.id} question={question} selectedOptionId={selectedOptionId} onSelect={handleOptionSelect} />

        <div className="quiz-test-footer">
          <div className="quiz-test-footer-slot">
            <button type="button" className="ghost-button" onClick={restartQuiz}>
              Yenidən başla
            </button>
          </div>
          <div className="quiz-test-footer-slot quiz-test-footer-slot-center" aria-hidden="true" />
          <div className="quiz-test-footer-slot quiz-test-footer-slot-right">
            <button type="button" className="quiz-test-skip-link" onClick={handlePass}>
              Bu sualı keç
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
