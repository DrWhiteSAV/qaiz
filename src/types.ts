export type UserRole = 'superadmin' | 'admin' | 'author' | 'player';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  balance: number;
  telegramId?: string;
  telegramConfirmationCode?: string;
  referralCode: string;
  referredBy?: string;
  referralCount?: number;
  referralEarnings?: number;
  authorStatus?: 'none' | 'pending' | 'active';
  authorEarnings?: number;
  createdAt: number;
  city?: 'Невинномысск' | 'Ставрополь';
  purchasedGames?: string[];
  playedGames?: string[];
}

export type GameMode = 'human' | 'true' | 'lite';
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
  isAI?: boolean;
  createdAt: number;
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
  // For 100 to 1
  answers?: { text: string; points: number; hint?: string }[];
  // For Jeopardy
  category?: string;
  level?: number; // For Millionaire (1-15)
  audioStart?: number;
  audioEnd?: number;
  // For What? Where? When?
  viewerName?: string;
  viewerAddress?: string;
  // For Jeopardy
  round?: number;
  questionType?: 'normal' | 'cat_in_bag' | 'auction';
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
  mediaType: 'image' | 'video' | 'album';
  platforms: ('app' | 'tg' | 'vk')[];
  scheduledAt?: number;
  createdAt: number;
}

export interface AdminSettings {
  prompts: {
    jeopardy_categories: string;
    blitz_questions: string;
    millionaire_questions: string;
    whatwherewhen_questions: string;
    '100to1_questions': string;
    jeopardy_questions: string;
    normal_questions: string;
    single_question: string;
    check_answer: string;
    ai_comment: string;
  };
  tgBotToken?: string;
  tgChannelId?: string;
  vkAccessToken?: string;
  vkGroupId?: string;
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
