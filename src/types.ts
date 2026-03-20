export type UserRole = 'admin' | 'author' | 'player';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  balance: number;
  telegramId?: string;
  referralCode: string;
  referredBy?: string;
  createdAt: number;
  city?: 'Невинномысск' | 'Ставрополь';
}

export type GameMode = 'human' | 'true' | 'light';
export type Difficulty = 'dummy' | 'people' | 'genius' | 'god';

export interface Game {
  id: string;
  title: string;
  description: string;
  authorId: string;
  mode: GameMode;
  difficulty: Difficulty;
  type: 'blitz' | 'millionaire' | '100to1' | 'whatwherewhen' | 'melody' | 'jeopardy' | 'iqbox';
  topic: string;
  questions: Question[];
  isMultiplayer: boolean;
  costPerQuestion: number;
}

export interface Question {
  id: string;
  text: string;
  options?: string[];
  correctAnswer: string;
  hint?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'video';
  points?: number;
}

export interface GameSession {
  id: string;
  gameId: string;
  players: string[]; // UIDs
  scores: Record<string, number>;
  currentQuestionIndex: number;
  status: 'waiting' | 'playing' | 'finished';
  startTime: number;
  chatId?: string;
}

export interface NewsPost {
  id: string;
  title: string;
  content: string;
  mediaUrls: string[];
  platforms: string[];
  scheduledAt?: number;
  createdAt: number;
}

export interface GalleryAlbum {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  photos: Photo[];
  createdAt: number;
}

export interface Photo {
  id: string;
  url: string;
  tags: string[]; // User UIDs
}
