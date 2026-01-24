import type { FC } from 'react';
import type { MajorRecommendation } from '../types';

interface RecommendationListProps {
  recommendations: MajorRecommendation[];
}

export const RecommendationList: FC<RecommendationListProps> = ({ recommendations }) => {
  if (!recommendations.length) {
    return <p>No recommendations available yet.</p>;
  }

  return (
    <ol className="recommendations">
      {recommendations.map((item, index) => (
        <li key={item.major}>
          <div>
            <strong>
              #{index + 1} {item.major}
            </strong>
            <p>Code: {item.code.join(', ')}</p>
          </div>
          <span className="score">Score: {item.score.toFixed(6)}</span>
        </li>
      ))}
    </ol>
  );
};
