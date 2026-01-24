export type RiasecLetter = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
export type ScoreRecord = Record<RiasecLetter, number>;

export interface QuestionOption {
  id: string;
  imageUrl: string;
  code: string; // two-letter code such as "IR"
  description: string;
}

export interface QuizQuestion {
  id: number;
  prompt: string;
  options: QuestionOption[];
}

export interface MajorRecommendation {
  major: string;
  code: string[];
  score: number;
}

export interface UserProfile {
  id: string;
  name: string;
  surname: string;
}

export interface StoredResult {
  id: string;
  profile: string;
  scores: ScoreRecord;
  answers: Record<number, string>;
  recommendations: MajorRecommendation[];
  createdAt: string;
}

export interface QuizResultPayload {
  profile: string;
  scores: ScoreRecord;
  answers: Record<number, string>;
}
