export interface MCQ {
  question: string;
  options: [string, string, string, string];
  /** Must equal one of options */
  answer: string;
}

export interface StudyUser {
  id: string;
  displayName: string;
  socketId: string;
  isHost: boolean;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  totalMs: number;
  isTop: boolean;
}

export interface MistakeItem {
  question: string;
  your_answer: string;
  correct_answer: string;
  explanation: string;
}

export interface FeedbackPayload {
  score: string;
  strengths: string;
  weakness: string;
  tips: string;
  mistakes: MistakeItem[];
}
