export interface UserSession {
  login: string;
  userName: string;
  email?: string;
  lessons: number[];
  session: string;
  status: 'active' | 'pending' | 'denied';
  lastLogin?: string;
}

export interface Lesson {
  id: number;
  title: string;
  desc: string;
  emoji: string;
  img: string;
  parts: number;
  category?: string;
  durationApprox?: string;
}

export interface QuestionComment {
  id: string;
  timestamp: string;
  lessonId: number;
  partNum: number;
  authorLogin: string;
  authorName: string;
  text: string;
  reply?: string;
  status: 'sent' | 'reviewed' | 'answered';
}

export interface CourseProgress {
  lessonId: number;
  watchedParts: number[];
  totalParts: number;
  lastWatchedPart?: number;
  lastWatchedAt?: string;
}
