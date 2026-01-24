import { type FC, useEffect, useState } from 'react';
import type { QuestionOption, QuizQuestion } from '../types';

interface QuestionCardProps {
  question: QuizQuestion;
  onSelect: (option: QuestionOption) => void;
  onPass: () => void;
}

export const QuestionCard: FC<QuestionCardProps> = ({ question, onSelect, onPass }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOption(null);
  }, [question.id]);

  const handleSelect = (option: QuestionOption) => {
    setSelectedOption(option.id);
    onSelect(option);
  };

  return (
    <section className="question-card" aria-live="polite">
      <header className="question-header">
        <p className="question-subtitle">Choose the image that feels most energizing to you</p>
        <h2>{question.prompt}</h2>
      </header>
      <div className="options-grid">
        {question.options.map((option) => (
          <button
            key={option.id}
            className="option-card"
            type="button"
            aria-pressed={selectedOption === option.id}
            data-selected={selectedOption === option.id}
            onClick={() => handleSelect(option)}
          >
            <div className="option-media">
              <img
                src={`${import.meta.env.VITE_API_BASE}${option.imageUrl}`}
                alt={option.description}
                loading="lazy"
              />
              <span className="option-check" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
            <div className="option-meta">
              <span className="option-code">{option.code}</span>
              <p>{option.description}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="question-actions">
        <button type="button" className="skip-button" onClick={onPass}>
          Skip for now
        </button>
      </div>
    </section>
  );
};
