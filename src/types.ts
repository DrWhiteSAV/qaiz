export type UserRole = 'superadmin' | 'admin' | 'author' | 'player';

// Matches Supabase profiles table columns
export interface UserProfile {
  uid: string;
  email: string | null;
  display_name: string;
  // Aliases for legacy code compatibility
  displayName?: string;
  photoURL?: string;
  avatar_url: string | null;
  role: string;
  balance: number;
  level?: number;
  telegram_id: string | null;
  // Legacy alias
  telegramId?: string;
  referral_code: string | null;
  referralCode?: string;
  referral_count?: number;
  referralCount?: number;
  referral_earnings?: number;
  referralEarnings?: number;
  author_status?: string;
  authorStatus?: string;
  author_earnings?: number;
  authorEarnings?: number;
  created_at?: string;
  createdAt?: number;
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
  answers?: { text: string; points: number; hint?: string }[];
  category?: string;
  level?: number;
  audioStart?: number;
  audioEnd?: number;
  viewerName?: string;
  viewerAddress?: string;
  round?: number;
  questionType?: 'normal' | 'cat_in_bag' | 'auction';
}

export interface GameSession {
  id: string;
  gameId: string;
  players: string[];
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
  tags: string[];
}
