import { type FC } from 'react';
import type { QuestionOption, QuizQuestion } from '../types';

interface QuestionCardProps {
  question: QuizQuestion;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
}

export const QuestionCard: FC<QuestionCardProps> = ({ question, selectedOptionId, onSelect }) => {
  const optionTitle = (option: QuestionOption) => `${option.code} seçimi`;

  return (
    <section className="question-card quiz-question-card" aria-live="polite">
      <header className="question-header">
        <p className="question-subtitle">Sizə daha uyğun olan seçimi edin</p>
      </header>
      <div className="options-grid quiz-options-grid">
        {question.options.map((option) => (
          <button
            key={option.id}
            className="option-card"
            type="button"
            aria-pressed={selectedOptionId === option.id}
            data-selected={selectedOptionId === option.id}
            onClick={() => onSelect(option.id)}
          >
            <div className="option-media">
              <img src={`${import.meta.env.VITE_API_BASE}${option.imageUrl}`} alt={option.description} loading="lazy" />
              <span className="option-check" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
            <div className="option-meta">
              <span className="option-code">{option.code}</span>
              <h3>{optionTitle(option)}</h3>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
