export function formatIkraText(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} ИИкр`;
  if (mod10 === 1) return `${count} ИИкра`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ИИкры`;
  return `${count} ИИкр`;
}

export function formatPricePerQuestion(price: number): string {
  return `${formatIkraText(price)} / вопр.`;
}

export interface DifficultyOption {
  id: string;
  name: string;
  multiplier: number;
  level: string;
  description: string;
}

export const DIFFICULTIES: DifficultyOption[] = [
  { id: 'dummy', name: 'ИИкра', multiplier: 1, level: '1/4', description: 'Самый простой уровень. Идеально для начала.' },
  { id: 'people', name: 'Головастик', multiplier: 1.5, level: '2/4', description: 'Средний уровень. Требует базовых знаний.' },
  { id: 'genius', name: 'Квант', multiplier: 2, level: '3/4', description: 'Высокий уровень. Для опытных игроков.' },
  { id: 'god', name: 'Ляга', multiplier: 3, level: '4/4', description: 'Экспертный уровень. Только для истинных знатоков.' }
];

export function getGameModes(gameId: string): ('single' | 'ai' | 'multi')[] {
  switch (gameId) {
    case 'blitz':
    case '100to1':
    case 'jeopardy':
    case 'whatwherewhen':
      return ['single', 'ai', 'multi'];
    case 'millionaire':
    case 'melody':
    default:
      return ['single'];
  }
}

export function getModeLabel(mode: 'single' | 'ai' | 'multi'): string {
  switch (mode) {
    case 'single':
      return 'Одиночная';
    case 'ai':
      return 'Против ИИ';
    case 'multi':
      return 'Мультиплеер';
  }
}

export interface AITemplate {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  difficulty: 'dummy' | 'people' | 'genius' | 'god';
  description: string;
}

export const AI_TEMPLATES: AITemplate[] = [
  {
    id: 'toad_professor',
    name: 'Профессор Жаба',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=professor',
    personality: 'Умный, вежливый, любит научные факты. Иногда занудствует.',
    difficulty: 'god',
    description: 'Знает всё обо всём. Почти не ошибается.'
  },
  {
    id: 'toad_rebel',
    name: 'Жаба-Бунтарь',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=rebel',
    personality: 'Дерзкий, самоуверенный, использует сленг. Любит рисковать.',
    difficulty: 'genius',
    description: 'Очень умный, но иногда слишком самоуверен.'
  },
  {
    id: 'toad_lucky',
    name: 'Везучая Жаба',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=lucky',
    personality: 'Оптимистичный, весёлый. Часто полагается на интуицию.',
    difficulty: 'people',
    description: 'Средний уровень. Ошибается как обычный человек.'
  },
  {
    id: 'toad_newbie',
    name: 'Жаба-Новичок',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=newbie',
    personality: 'Скромный, немного пугливый. Часто сомневается в ответах.',
    difficulty: 'dummy',
    description: 'Часто ошибается, идеально для тренировки.'
  }
];

