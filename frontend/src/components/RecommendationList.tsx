import type { FC } from 'react';
import type { MajorRecommendation } from '../types';

interface RecommendationListProps {
  recommendations: MajorRecommendation[];
  selectedMajor?: string;
  onSelectMajor?: (major: string) => void;
}

export const RecommendationList: FC<RecommendationListProps> = ({ recommendations, selectedMajor = '', onSelectMajor }) => {
  if (!recommendations.length) {
    return <p>No recommendations available yet.</p>;
  }

  return (
    <ol className="recommendations">
      {recommendations.map((item, index) => (
        <li
          key={item.major}
          className={`${item.major === selectedMajor ? 'recommendation-selected' : ''} ${onSelectMajor ? 'recommendation-clickable' : ''}`.trim()}
          role={onSelectMajor ? 'button' : undefined}
          tabIndex={onSelectMajor ? 0 : undefined}
          onClick={onSelectMajor ? () => onSelectMajor(item.major) : undefined}
          onKeyDown={
            onSelectMajor
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectMajor(item.major);
                  }
                }
              : undefined
          }
        >
          <div>
            <strong>
              #{index + 1} {item.major}
            </strong>
            <p>Code: {item.code.join(', ')}</p>
          </div>
          <div className="recommendation-actions">
            <span className="score">Score: {item.score.toFixed(6)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
};
