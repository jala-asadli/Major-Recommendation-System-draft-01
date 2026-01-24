import { useCallback, useState } from 'react';
import type { RiasecLetter, ScoreRecord } from '../types';

const INITIAL_SCORES: ScoreRecord = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
const LETTER_ORDER: RiasecLetter[] = ['R', 'I', 'A', 'S', 'E', 'C'];

const normalizeLetter = (letter: string): RiasecLetter | null => {
  const upper = letter.toUpperCase();
  if (['R', 'I', 'A', 'S', 'E', 'C'].includes(upper)) {
    return upper as RiasecLetter;
  }
  return null;
};

export const useRiasecScoring = () => {
  const [scores, setScores] = useState<ScoreRecord>({ ...INITIAL_SCORES });

  const addCode = useCallback(
    (code: string) => {
      const next = { ...scores };
      const primaryLetter = normalizeLetter(code.slice(0, 1));
      if (primaryLetter) {
        next[primaryLetter] += 1;
      }
      setScores(next);
      return next;
    },
    [scores]
  );

  const reset = useCallback(() => setScores({ ...INITIAL_SCORES }), []);

  const sortScores = useCallback((record: ScoreRecord) => {
    return LETTER_ORDER.slice()
      .map((letter) => ({ letter, value: record[letter] }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const getSortedProfile = useCallback(() => sortScores(scores), [scores, sortScores]);

  const getProfileString = useCallback(
    (record?: ScoreRecord) => {
      const target = record ?? scores;
      return sortScores(target)
        .map((entry) => entry.letter)
        .join('');
    },
    [scores, sortScores]
  );

  return {
    scores,
    addCode,
    reset,
    getSortedProfile,
    getProfileString
  };
};
