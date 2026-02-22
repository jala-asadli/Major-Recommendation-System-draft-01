export type RiasecLetter = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
export type ScoreRecord = Record<RiasecLetter, number>;

export interface QuestionOption {
  id: string;
  imageUrl: string;
  code: string; // single-letter RIASEC code such as "I"
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
  responseTimesSec?: Record<number, number>;
  recommendations: MajorRecommendation[];
  topMatch?: string | null;
  chosenMajor?: string | null;
  satisfactionScore?: number | null;
  createdAt: string;
}

export interface QuizResultPayload {
  profile: string;
  scores: ScoreRecord;
  answers: Record<number, string>;
  responseTimesSec: Record<number, number>;
}
