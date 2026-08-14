import React, { useState, useEffect, useRef, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useFrogSound } from '../hooks/useSound';
import { AuthModal } from '../components/AuthModal';
import { GameStartModal } from '../components/GameStartModal';
import { TopicCloud } from '../components/TopicCloud';
import { LeafButton } from '../components/ui/LeafButton';
import { DIFFICULTIES, AI_TEMPLATES, getGameModes, getModeLabel, formatPricePerQuestion } from '../lib/gameHelpers';
import { db } from '../db';
import { 
  Zap, 
  Users, 
  Bot, 
  ChevronRight,
  Star,
  Play,
  RotateCcw,
  User,
  Info,
  HelpCircle,
  Monitor,
  Globe
} from 'lucide-react';

/* ========================================================================= */
/* 1. FLOATING 3D RADIAL BUBBLES BACKGROUND (#99d037 ЖЗ)                     */
/* Floating all the way past top edge of screen before reset                 */
/* ========================================================================= */
const Floating3DBubbles = () => {
  const bubbles = [
    // 5 Large Bubbles
    { id: 1, left: '4%', size: '26vw', minSize: '160px', duration: 18, delay: 0 },
    { id: 2, left: '28%', size: '46vw', minSize: '280px', duration: 24, delay: -6 },
    { id: 3, left: '62%', size: '22vw', minSize: '140px', duration: 16, delay: -12 },
    { id: 4, left: '12%', size: '50vw', minSize: '300px', duration: 26, delay: -4 },
    { id: 5, left: '76%', size: '30vw', minSize: '180px', duration: 20, delay: -10 },
    // 5 Small Bubbles (floating all the way past top -125vh)
    { id: 6, left: '20%', size: '9vw', minSize: '50px', duration: 8, delay: -2, isSmall: true },
    { id: 7, left: '50%', size: '8vw', minSize: '45px', duration: 7, delay: -5, isSmall: true },
    { id: 8, left: '84%', size: '10vw', minSize: '55px', duration: 9, delay: -1, isSmall: true },
    { id: 9, left: '38%', size: '7vw', minSize: '40px', duration: 10, delay: -7, isSmall: true },
    { id: 10, left: '92%', size: '8vw', minSize: '48px', duration: 8, delay: -3, isSmall: true },
  ];

  return (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-full pointer-events-none z-0 overflow-hidden m-0 p-0">
      {bubbles.map((b) => (
        <motion.div
          key={b.id}
          initial={{ y: '115vh', opacity: 0 }}
          animate={{
            y: ['115vh', '-125vh'],
            x: [0, 25, -20, 0],
            opacity: [0, 0.45, 0.45, 0.45, 0],
          }}
          transition={{
            duration: b.duration,
            repeat: Infinity,
            delay: b.delay,
            ease: 'linear',
          }}
          style={{
            left: b.left,
            bottom: 0,
            width: b.size,
            height: b.size,
            minWidth: b.minSize,
            minHeight: b.minSize,
            maxWidth: b.isSmall ? '140px' : '520px',
            maxHeight: b.isSmall ? '140px' : '520px',
            background: 'radial-gradient(circle at 35% 30%, rgba(153, 208, 55, 0.45) 0%, rgba(80, 125, 42, 0.18) 55%, rgba(8, 10, 5, 0.02) 85%)',
            boxShadow: 'inset -6px -6px 16px rgba(0, 0, 0, 0.5), inset 6px 6px 14px rgba(153, 208, 55, 0.35), 0 0 20px rgba(153, 208, 55, 0.2)',
            border: '1px solid rgba(153, 208, 55, 0.3)',
            borderRadius: '50%',
          }}
          className="absolute pointer-events-none flex items-start justify-start p-3"
        >
          {/* Animated 3D Glare Highlight */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.75, 0.3],
            }}
            transition={{
              duration: 3 + (b.id % 4),
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-[22%] h-[22%] rounded-full bg-white/50 blur-[1px] shadow-[0_0_8px_rgba(255,255,255,0.8)] ml-[12%] mt-[10%]"
          />
        </motion.div>
      ))}
    </div>
  );
};

/* ========================================================================= */
/* 2. LILY PAD / WATER LILY LEAF SVG BUTTON (ЛИСТОК КУВШИНКИ)                */
/* ========================================================================= */
interface LilyPadButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const LilyPadButton = ({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary',
  size = 'md' 
}: LilyPadButtonProps) => {
  const clipId = useId();
  const [animDir] = useState(() => (Math.random() > 0.5 ? 'forward' : 'reverse'));
  const [animSpeed] = useState(() => 2.2 + Math.random() * 0.8);

  const getSolidColor = () => {
    if (variant === 'secondary') return { fill: '#507d2a', stroke: '#99d037' };
    if (variant === 'dark') return { fill: '#080a05', stroke: '#507d2a' };
    return { fill: '#99d037', stroke: '#ffffff' };
  };

  const colors = getSolidColor();
  const isXL = size === 'xl' || size === 'lg';

  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center justify-center group cursor-pointer border-none bg-transparent outline-none transition-transform duration-300 hover:scale-105 active:scale-95 ${
        isXL 
          ? 'min-w-[280px] sm:min-w-[360px] md:min-w-[420px] px-10 sm:px-14 py-6 sm:py-8' 
          : 'min-w-[170px] sm:min-w-[210px] px-7 sm:px-9 py-4'
      } ${className}`}
    >
      {/* SVG Lily Pad Contour with Internal Clipped Glow (Zero Outer Glow Spill) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-none"
        viewBox="0 0 220 80"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id={clipId}>
            <path d="M 12,40 C 12,10 35,6 110,6 C 175,6 200,10 208,28 L 175,42 L 208,54 C 200,70 175,74 110,74 C 35,74 12,70 12,40 Z" />
          </clipPath>
        </defs>

        {/* Organic Lily Leaf Path with cutout notch */}
        <path
          d="M 12,40 C 12,10 35,6 110,6 C 175,6 200,10 208,28 L 175,42 L 208,54 C 200,70 175,74 110,74 C 35,74 12,70 12,40 Z"
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={isXL ? '3' : '2'}
        />
        {/* Leaf Vein Accents */}
        <path
          d="M 175,42 L 110,40 M 175,42 L 140,20 M 175,42 L 140,62 M 175,42 L 70,22 M 175,42 L 70,58"
          stroke="#ffffff"
          strokeOpacity="0.3"
          strokeWidth="1.2"
          strokeDasharray="3 2"
          fill="none"
        />
        {/* Perimeter Animated Inner Pulse (CLIPPED strictly inside the leaf, NO outer drop-shadow) */}
        {(variant === 'primary' || isXL) && (
          <g clipPath={`url(#${clipId})`}>
            <path
              d="M 12,40 C 12,10 35,6 110,6 C 175,6 200,10 208,28 L 175,42 L 208,54 C 200,70 175,74 110,74 C 35,74 12,70 12,40 Z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="90 460"
              style={{
                animation: `${animDir === 'reverse' ? 'leafGlowReverse' : 'leafGlowForward'} ${animSpeed}s linear infinite`,
                opacity: 0.9
              }}
            />
          </g>
        )}
      </svg>
      {/* Text Content */}
      <span className={`relative z-10 flex items-center justify-center gap-3 font-black uppercase tracking-wider text-black dark:text-white drop-shadow-md whitespace-nowrap ${
        isXL ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-sm sm:text-base'
      }`}>
        {children}
      </span>
    </button>
  );
};

/* ========================================================================= */
/* 3. BRANCH VINE MODE FILTER (ВЕТОЧКА С ЛИСТИКАМИ-ТАБАМИ)                  */
/* Sticks right at bottom edge of fixed header                              */
/* ========================================================================= */
interface BranchFilterProps {
  activeCategory: 'all' | 'single' | 'multi' | 'ai';
  setActiveCategory: React.Dispatch<React.SetStateAction<'all' | 'single' | 'multi' | 'ai'>>;
  totalGames: number;
}

const BranchFilter = ({ activeCategory, setActiveCategory, totalGames }: BranchFilterProps) => {
  const { playCroak } = useFrogSound();

  const tabs = [
    { id: 'all', label: `Все режимы (${totalGames})` },
    { id: 'single', label: 'Одиночные' },
    { id: 'multi', label: 'Мультиплеер' },
  ];

  return (
    <div className="sticky top-12 md:top-16 z-40 w-full max-w-4xl mx-auto py-2 px-2 bg-transparent border-none shadow-none pointer-events-auto">
      {/* Branch & Leaf Container */}
      <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 bg-transparent">
        
        {/* Decorative Vine Line (Desktop Horizontal) */}
        <div className="hidden sm:block absolute inset-x-8 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-transparent via-[#507d2a] to-transparent pointer-events-none rounded-full opacity-60" />

        {/* Decorative Vine Line (Mobile Vertical) */}
        <div className="sm:hidden absolute inset-y-4 left-1/2 -translate-x-1/2 w-1.5 bg-gradient-to-b from-transparent via-[#507d2a] to-transparent pointer-events-none rounded-full opacity-60" />

        {/* Leaf Tabs */}
        {tabs.map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playCroak();
                setActiveCategory(tab.id as any);
              }}
              className={`relative z-10 flex items-center justify-center px-6 py-3 min-w-[160px] sm:min-w-[190px] cursor-pointer outline-none transition-all duration-300 ${
                isActive ? 'scale-105' : 'hover:scale-102 opacity-85 hover:opacity-100'
              }`}
            >
              {/* Leaf SVG Contour */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_4px_12px_rgba(153,208,55,0.3)]"
                viewBox="0 0 200 65"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 10,32 C 10,8 30,5 100,5 C 170,5 190,8 190,32 C 190,56 170,60 100,60 C 30,60 10,56 10,32 Z"
                  fill={isActive ? '#99d037' : 'rgba(8, 10, 5, 0.85)'}
                  stroke={isActive ? '#ffffff' : '#507d2a'}
                  strokeWidth={isActive ? '2.5' : '1.5'}
                />
                {/* Leaf Vein */}
                <path
                  d="M 20,32 Q 100,28 180,32"
                  stroke={isActive ? '#425e17' : '#99d037'}
                  strokeOpacity="0.4"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>

              {/* Text Label (Min 14px font size) */}
              <span className={`relative z-10 font-black uppercase text-sm tracking-wider ${
                isActive ? 'text-black' : 'text-[#99d037]'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}

      </div>
    </div>
  );
};

/* ========================================================================= */
/* 4. MAIN HOMEPAGE COMPONENT                                                 */
/* ========================================================================= */
export const HomePage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedGameForModal, setSelectedGameForModal] = useState<any>(null);
  const { playCroak } = useFrogSound();
  const [activeCategory, setActiveCategory] = useState<'all' | 'single' | 'multi' | 'ai'>('all');

  // Reset cache and force dark theme on landing page enter
  useEffect(() => {
    try {
      localStorage.removeItem('design_tweaks_qaiz_v5');
      localStorage.removeItem('theme');
      sessionStorage.removeItem('pending_ref');
    } catch (e) {
      // ignore
    }
    const root = window.document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
  }, []);

  // Page Scroll Transforms
  const { scrollY } = useScroll();
  
  // Parallax headline & logo
  const headlineY = useTransform(scrollY, [0, 500], [0, 160]);
  const headlineOpacity = useTransform(scrollY, [0, 400], [1, 0.2]);

  const logoY = useTransform(scrollY, [0, 500], [10, -50]);
  const logoScale = useTransform(scrollY, [0, 500], [0.95, 1.15]);
  const logoOpacity = useTransform(scrollY, [0, 300], [0.15, 1]);

  // Swapping Buttons Motion Transforms:
  // Desktop (Horizontal Swap - full smooth swap across row)
  const buttonShopX = useTransform(scrollY, [30, 450], [0, 310]);
  const buttonFreeX = useTransform(scrollY, [30, 450], [0, -310]);

  // Mobile (Vertical Swap - intact)
  const buttonShopY = useTransform(scrollY, [30, 350], [0, 75]);
  const buttonFreeY = useTransform(scrollY, [30, 350], [0, -75]);

  const [dbGames, setDbGames] = useState<any[]>([]);

  // Fetch games from database on mount
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch('/api/games');
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setDbGames(json.data.map((g: any) => ({
            id: g.id,
            title: g.title,
            subtitle: g.subtitle,
            description: g.description,
            image: g.image_url,
            category: g.category,
            questionCount: g.question_count,
            path: g.path,
            tag: g.tag,
            price: g.price_text,
            rules: g.rules,
            comingSoon: Boolean(g.coming_soon)
          })));
        }
      } catch (err) {
        console.error('Error fetching games from database:', err);
      }
    };
    fetchGames();
  }, []);

  // Default Games List fallback
  const defaultGames = [
    {
      id: 'blitz',
      title: 'КвИИЗ',
      subtitle: 'Скоростной ИИ-спринт',
      description: 'Быстрые вопросы на время от нейросети.',
      image: '/file/18/blitz.png',
      category: 'single',
      questionCount: 10,
      path: '/game/blitz',
      tag: '🔥 Популярное',
      price: '1 ИИкра / вопр.',
      rules: 'Текстовый ввод ответов. 60 секунд на каждый вопрос, генерируемый нейросетью.',
    },
    {
      id: 'millionaire',
      title: 'Квиллионер',
      subtitle: '15 шагов к вершине',
      description: 'Классическая интеллектуальная лестница.',
      image: '/file/19/millionaire.png',
      category: 'single',
      questionCount: 15,
      path: '/game/millionaire',
      tag: '💎 Топ Режим',
      price: '1 ИИкра / вопр.',
      rules: 'Ответьте на 15 вопросов. Используйте подсказки: 50/50 и Помощь Нейросети.',
    },
    {
      id: '100to1',
      title: 'Сто Квадному',
      subtitle: 'Народная мудрость',
      description: 'Угадайте самые частые ответы участников на улице и в опросах.',
      image: '/file/16/100to1.png',
      category: 'single',
      questionCount: 24,
      path: '/game/100to1',
      tag: '🎯 Логика',
      price: '1 ИИкра / вопр.',
      rules: 'Угадывайте варианты ответов большинства людей за минимум времени.',
    },
    {
      id: 'whatwherewhen',
      title: 'Что? Где? Квада?',
      subtitle: 'Элитарный Клуб',
      description: 'Интеллектуальный вызов для знатоков.',
      image: '/file/20/whatwherewhen.png',
      category: 'single',
      questionCount: 11,
      path: '/game/whatwherewhen',
      tag: '🧠 Хардкор',
      price: '2 ИИкры / вопр.',
      rules: 'Глубокие вопросы на логику, ассоциации и нестандартное мышление.',
    },
    {
      id: 'jeopardy',
      title: 'Своя Икра',
      subtitle: 'Квазино Викторина',
      description: 'Выбирайте темы и стоимость вопросов.',
      image: '/file/17/jeopardy.png',
      category: 'single',
      questionCount: 76,
      path: '/game/jeopardy',
      tag: '⚔️ Мультиплеер',
      price: '1 ИИкра / вопр.',
      rules: 'Сражение с соперниками за зачетные очки в произвольных категориях.',
    },
    {
      id: 'melody',
      title: 'Уквакай Мелодию',
      subtitle: 'Музыкальный Ринг',
      description: 'Угадайте трек или исполнителя по нескольким аккордам.',
      image: '/file/15/melody.png',
      category: 'single',
      questionCount: 25,
      path: '/game/melody',
      tag: '🎵 Музыкальный Квиз',
      price: 'Скоро',
      comingSoon: true,
      rules: 'Слушайте фрагмент мелодии и выбирайте правильный вариант ответа.',
    }
  ];

  const games = dbGames.length > 0 ? dbGames : defaultGames;

  const filteredGames = games.filter(game => {
    if (activeCategory === 'all') return true;
    const modes = getGameModes(game.id);
    return modes.includes(activeCategory as 'single' | 'ai' | 'multi');
  });

  return (
    <div className="relative min-h-screen space-y-12 pb-0 text-foreground">
      
      {/* 3D Radial Floating Bubbles (100% full screen, zero bottom gap) */}
      <Floating3DBubbles />

      {/* =================================================================== */}
      {/* 1. HERO SECTION (BORDERLESS & TRANSPARENT)                          */}
      {/* Subtitle placed directly under Main Title                            */}
      {/* =================================================================== */}
      <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-between pt-4 pb-8 px-2 sm:px-4 bg-transparent border-none shadow-none z-10">
        
        {/* Title + Subtitle Container */}
        <motion.div 
          style={{ y: headlineY, opacity: headlineOpacity }}
          className="w-full text-center max-w-5xl mx-auto space-y-4 pt-2 px-1"
        >
          <h1 className="text-3xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-foreground leading-tight break-words flex flex-col items-center">
            <span>Интеллектуальные</span>
            <span className="text-primary underline decoration-primary/40 underline-offset-8">ИИ-Викторины</span>
          </h1>

          {/* Subtitle directly under title - 3 distinct lines acting as category filters */}
          <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                playCroak();
                setActiveCategory(prev => prev === 'single' ? 'all' : 'single');
              }}
              className={`text-base sm:text-xl font-extrabold transition-all duration-300 hover:scale-105 cursor-pointer ${
                activeCategory === 'single'
                  ? 'text-primary underline decoration-primary decoration-2 underline-offset-4 drop-shadow-[0_0_10px_rgba(153,208,55,0.6)]'
                  : 'text-foreground/90 hover:text-primary'
              }`}
            >
              Одиночные Игры
            </button>
            <button
              type="button"
              onClick={() => {
                playCroak();
                setActiveCategory(prev => prev === 'ai' ? 'all' : 'ai');
              }}
              className={`text-base sm:text-xl font-extrabold transition-all duration-300 hover:scale-105 cursor-pointer ${
                activeCategory === 'ai'
                  ? 'text-primary underline decoration-primary decoration-2 underline-offset-4 drop-shadow-[0_0_10px_rgba(153,208,55,0.6)]'
                  : 'text-foreground/90 hover:text-primary'
              }`}
            >
              Дуэли против нейросети
            </button>
            <button
              type="button"
              onClick={() => {
                playCroak();
                setActiveCategory(prev => prev === 'multi' ? 'all' : 'multi');
              }}
              className={`text-base sm:text-xl font-extrabold transition-all duration-300 hover:scale-105 cursor-pointer ${
                activeCategory === 'multi'
                  ? 'text-primary underline decoration-primary decoration-2 underline-offset-4 drop-shadow-[0_0_10px_rgba(153,208,55,0.6)]'
                  : 'text-foreground/90 hover:text-primary'
              }`}
            >
              Мультиплеер с друзьями
            </button>
          </div>
        </motion.div>

        {/* MASCOT LOGO (Floats up over content) */}
        <motion.div
          style={{ y: logoY, scale: logoScale, opacity: logoOpacity }}
          className="relative z-30 my-4 flex items-center justify-center cursor-pointer group pointer-events-auto"
          whileHover={{ rotate: 0, scale: 1.32 }}
        >
          <img 
            src="/file/14/qaizlogo.png" 
            alt="QAIZ Logo" 
            className="relative z-30 h-[32vh] sm:h-[44vh] max-h-[420px] w-auto object-contain drop-shadow-[0_0_20px_rgba(153,208,55,0.3)] transition-transform duration-300 select-none pointer-events-none"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          />
        </motion.div>

      </section>

      {/* =================================================================== */}
      {/* 3. CATALOG STACKING DECK OF CARDS (STICKY CARD STACKING)           */}
      {/* =================================================================== */}
      {(() => {
        const stepVh = 120;
        const totalDeckHeightVh = (2 * filteredGames.length) * stepVh + 100;
        return (
          <section className="relative z-20 w-full max-w-none px-0 mx-0 pb-0 mb-0">
            <div 
              style={{ height: `${totalDeckHeightVh}vh` }} 
              className="relative w-full px-0 mx-0"
            >
              {filteredGames.map((game, index) => (
                <GameStackingFlipCard 
                  key={game.id} 
                  game={game} 
                  index={index} 
                  totalCards={filteredGames.length}
                  totalDeckHeightVh={totalDeckHeightVh}
                  onOpenModal={(selectedGame) => setSelectedGameForModal(selectedGame)}
                />
              ))}
            </div>
          </section>
        );
      })()}

      {/* Game Start Modal */}
      {selectedGameForModal && (
        <GameStartModal
          game={selectedGameForModal}
          onClose={() => setSelectedGameForModal(null)}
          onStart={(options) => {
            const game = selectedGameForModal;
            setSelectedGameForModal(null);
            playCroak();
            if (user && db) {
              db.from('game_sessions').insert({
                user_id: profile?.uid ?? "",
                game_id: game.id,
                topic: options.topic || 'General',
                difficulty: options.difficulty,
                mode: options.mode,
                score: 0,
                status: 'started',
                price_paid: options.price,
                created_at: new Date().toISOString()
              }).then(() => {}).catch(() => {});
            }
            navigate(game.path, { state: options });
          }}
        />
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

    </div>
  );
};

/* ========================================================================= */
/* GAME STACKING CARD COMPONENT                                              */
/* Sticky Stack animation per card + Scroll-up bottom text overlay +         */
/* Footer overlay sliding up on last card.                                   */
/* ========================================================================= */
const GameStackingFlipCard = ({ 
  game, 
  index,
  totalCards, 
  totalDeckHeightVh,
  onOpenModal 
}: { 
  game: any; 
  index: number; 
  totalCards: number;
  totalDeckHeightVh: number;
  onOpenModal: (game: any) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { playCroak } = useFrogSound();

  const isLastCard = index === totalCards - 1;
  const isComingSoon = game.comingSoon || game.id === 'melody';

  const stepVh = 120;
  const pStartVh = index === 0 ? 0 : (2 * index - 1) * stepVh;
  const containerHeightVh = Math.max(100, totalDeckHeightVh - pStartVh);
  const maxScrollDelta = Math.max(1, containerHeightVh - 100);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Arrival animation for card index > 0 (slides up over previous card)
  const arrivalEndProgress = index === 0 ? 0 : Math.min(1, stepVh / maxScrollDelta);
  const rawCardY = useTransform(
    scrollYProgress,
    [0, arrivalEndProgress],
    index === 0 ? ['0vh', '0vh'] : ['100vh', '0vh']
  );
  // Smooth spring physics for cards and overlays
  const springConfig = { stiffness: 100, damping: 32, mass: 0.15 };
  const cardY = useSpring(rawCardY, springConfig);

  // Text overlay animation (Diagonal motion into center of card)
  const textStartProgress = arrivalEndProgress;
  const textEndProgress = index === 0 
    ? Math.min(1, stepVh / maxScrollDelta) 
    : Math.min(1, (2 * stepVh) / maxScrollDelta);

  const rawTextY = useTransform(
    scrollYProgress,
    [textStartProgress, textEndProgress],
    [320, 0]
  );
  const textY = useSpring(rawTextY, springConfig);

  const rawTextX = useTransform(
    scrollYProgress,
    [textStartProgress, textEndProgress],
    [-80, 0]
  );
  const textX = useSpring(rawTextX, springConfig);

  const rawTextOpacity = useTransform(
    scrollYProgress, 
    [textStartProgress, textStartProgress + (textEndProgress - textStartProgress) * 0.65], 
    [0, 1]
  );
  const textOpacity = useSpring(rawTextOpacity, springConfig);

  // Footer animation on the last card
  const footerStartProgress = isLastCard ? textEndProgress : 0.95;
  const footerEndProgress = 1.0;

  const rawFooterY = useTransform(
    scrollYProgress,
    [footerStartProgress, footerEndProgress],
    ['100%', '0%']
  );
  const footerY = useSpring(rawFooterY, springConfig);

  const rawFooterOpacity = useTransform(
    scrollYProgress,
    [footerStartProgress, footerStartProgress + (footerEndProgress - footerStartProgress) * 0.25],
    [0, 1]
  );
  const footerOpacity = useSpring(rawFooterOpacity, springConfig);

  // Mobile specific transforms (Image shrinks from 100% to 35% height, text slides up into view)
  const rawMobileImgHeight = useTransform(
    scrollYProgress,
    [textStartProgress, textEndProgress],
    ['100%', '35%']
  );
  const mobileImgHeight = useSpring(rawMobileImgHeight, springConfig);

  const rawMobileTextY = useTransform(
    scrollYProgress,
    [textStartProgress, textEndProgress],
    ['100%', '0%']
  );
  const mobileTextY = useSpring(rawMobileTextY, springConfig);

  const rawMobileTextOpacity = useTransform(
    scrollYProgress,
    isLastCard 
      ? [textStartProgress, textStartProgress + (textEndProgress - textStartProgress) * 0.4]
      : [textStartProgress, textStartProgress + (textEndProgress - textStartProgress) * 0.4, textEndProgress, 0.95],
    isLastCard 
      ? [0, 1]
      : [0, 1, 1, 0]
  );
  const mobileTextOpacity = useSpring(rawMobileTextOpacity, springConfig);

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'absolute',
        top: `${pStartVh}vh`,
        height: `${containerHeightVh}vh`,
        left: 0,
        right: 0
      }}
      className="w-full px-0 mx-0 pointer-events-none"
    >
      {/* Sticky Card Container - Fixed directly under header with ZERO gap top and bottom */}
      <motion.div 
        style={{ 
          zIndex: 10 + index,
          y: cardY,
        }}
        className="sticky top-12 md:top-16 h-[calc(100vh-112px)] md:h-[calc(100vh-64px)] w-full flex items-center justify-center px-0 sm:px-4 pt-0 mx-0 overflow-hidden pointer-events-auto"
      >
        {/* =================================================================== */}
        {/* DESKTOP CARD LAYOUT (hidden sm:flex) - UNTOUCHED FOR PC             */}
        {/* =================================================================== */}
        <div className="hidden sm:flex w-full max-w-[calc((100vh-80px)*16/9)] aspect-video max-h-[calc(100vh-80px)] mx-auto relative rounded-3xl border-2 border-[#99d037] overflow-hidden shadow-2xl shadow-[#99d037]/20 bg-transparent backdrop-blur-xl items-center justify-center">
          
          <div className="relative w-full h-full bg-transparent border-none p-0 overflow-hidden rounded-3xl">
            
            <img 
              src={game.image} 
              alt={game.title} 
              className="w-full h-full object-cover object-center rounded-3xl select-none pointer-events-none"
              referrerPolicy="no-referrer"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />

            <div className="absolute inset-0 rounded-3xl border-2 border-[#99d037] pointer-events-none animate-pulse shadow-[0_0_20px_rgba(153,208,55,0.4)] z-30" />

            {/* PINNED TOP BADGES (DESKTOP) */}
            <div className="absolute top-4 inset-x-6 z-30 flex flex-row items-center justify-between gap-2 pointer-events-none">
              <div className="flex flex-col items-start gap-1.5 pointer-events-auto">
                {getGameModes(game.id).map(mode => (
                  <span key={mode} className="px-3.5 py-1.5 rounded-full bg-transparent border border-[#99d037]/70 text-[#99d037] text-sm font-bold backdrop-blur-md shadow-md">
                    {getModeLabel(mode)}
                  </span>
                ))}
              </div>

              <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
                <span className="px-3.5 py-1.5 rounded-full bg-transparent border border-[#99d037]/70 text-[#99d037] text-sm font-bold backdrop-blur-md shadow-md">
                  {game.tag || '🔥 Популярное'}
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-transparent border border-[#99d037]/70 text-[#99d037] text-sm font-bold backdrop-blur-md shadow-md">
                  Вопросов: {game.questionCount}
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-transparent border border-[#99d037]/70 text-[#99d037] text-sm font-bold backdrop-blur-md shadow-md">
                  {game.price_per_question ? formatPricePerQuestion(game.price_per_question) : game.price}
                </span>
              </div>
            </div>

            {/* SCROLL-UP CONTENT OVERLAY */}
            <motion.div 
              style={{ y: textY, x: textX, opacity: textOpacity }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-3rem)] max-w-xl z-20 pointer-events-auto"
            >
              {isComingSoon ? (
                <div className="flex items-center justify-center p-0 bg-transparent">
                  <LilyPadButton 
                    variant="primary"
                    size="xl"
                    className="cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-2xl sm:text-3xl font-black text-black tracking-wider">Скоро</span>
                  </LilyPadButton>
                </div>
              ) : (
                <div className="space-y-4 bg-black/60 border-2 border-[#99d037]/70 p-6 rounded-3xl text-white text-center flex flex-col items-center justify-center shadow-[0_0_30px_rgba(153,208,55,0.25)]">
                  <div className="space-y-1 text-center">
                    <span className="text-sm font-mono font-bold uppercase text-[#99d037] tracking-widest block">
                      {game.subtitle}
                    </span>
                    <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white break-words drop-shadow-md">
                      {game.title}
                    </h3>
                  </div>

                  <div className="pt-2 flex items-center justify-center">
                    <LilyPadButton 
                      variant="primary"
                      size="xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        playCroak();
                        onOpenModal(game);
                      }}
                    >
                      <span>Играть</span>
                      <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 ml-2 text-black" />
                    </LilyPadButton>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-[#99d037]/50 text-sm text-white/95 space-y-0.5 max-w-lg text-center">
                    <span className="text-sm font-bold uppercase text-[#99d037] block">Правила игры:</span>
                    <p className="text-sm leading-snug">{game.rules}</p>
                  </div>
                </div>
              )}
            </motion.div>

          </div>

        </div>

        {/* =================================================================== */}
        {/* MOBILE VERTICAL CARD LAYOUT (flex sm:hidden) - EXCLUSIVELY FOR MOBILE */}
        {/* =================================================================== */}
        <div className="flex sm:hidden w-full h-full relative overflow-hidden bg-transparent backdrop-blur-xl flex-col justify-between rounded-t-3xl border-2 border-[#99d037] shadow-2xl shadow-[#99d037]/30">
          
          {/* Top Image - Shrinks smoothly from 100% to 35% height on scroll */}
          <motion.div 
            style={{ height: mobileImgHeight }}
            className="w-full relative overflow-hidden shrink-0 border-b border-[#99d037]/50 rounded-t-3xl"
          >
            {/* Top-left: Popular tag at top-left, and supported modes listed vertically under it */}
            <div className="absolute top-2.5 left-2.5 z-20 flex flex-col items-start gap-1 pointer-events-auto">
              <span className="px-2.5 py-1 rounded-full bg-transparent border border-[#99d037]/70 text-[#99d037] text-sm font-bold backdrop-blur-md shadow-md">
                {game.tag || '🔥 Популярное'}
              </span>
              {getGameModes(game.id).map(mode => (
                <span key={mode} className="px-2.5 py-1 rounded-full bg-transparent border border-[#99d037]/70 text-[#99d037] text-sm font-bold backdrop-blur-md shadow-md">
                  {getModeLabel(mode)}
                </span>
              ))}
            </div>

            {/* Top-right: Price at top-right, and Question count under it */}
            <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1 pointer-events-auto">
              <span className="px-2.5 py-1 rounded-full bg-transparent border border-[#99d037]/70 text-[#99d037] text-sm font-bold backdrop-blur-md shadow-md">
                {game.price_per_question ? formatPricePerQuestion(game.price_per_question) : game.price}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-transparent border border-[#99d037]/70 text-[#99d037] text-sm font-bold backdrop-blur-md shadow-md">
                Вопросов: {game.questionCount}
              </span>
            </div>

            <img 
              src={game.image} 
              alt={game.title} 
              className="w-full h-full object-cover object-center select-none pointer-events-none"
              referrerPolicy="no-referrer"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
          </motion.div>

          {/* Bottom Content Area - Seamlessly attached to bottom edge of image */}
          <motion.div 
            style={{ opacity: mobileTextOpacity }}
            className="flex-1 w-full p-4 pb-6 flex flex-col justify-between items-center text-center bg-transparent overflow-y-auto space-y-3 custom-scrollbar"
          >
            {isComingSoon ? (
              <div className="my-auto flex flex-col items-center justify-center space-y-4 py-8 bg-transparent">
                <LilyPadButton 
                  variant="primary"
                  size="lg"
                  className="cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xl sm:text-2xl font-black text-black tracking-wider">Скоро</span>
                </LilyPadButton>
              </div>
            ) : (
              <>
                {/* Title & Subtitle */}
                <div className="space-y-1">
                  <span className="text-sm font-mono font-bold uppercase text-[#99d037] tracking-widest block">
                    {game.subtitle}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                    {game.title}
                  </h3>
                </div>

                {/* Play CTA Button */}
                <div className="pt-1 flex items-center justify-center w-full">
                  <LilyPadButton 
                    variant="primary"
                    size="xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      playCroak();
                      onOpenModal(game);
                    }}
                  >
                    <span>Играть</span>
                    <ChevronRight className="w-8 h-8 ml-2 text-black" />
                  </LilyPadButton>
                </div>

                {/* Rules Box BELOW Play Button */}
                <div className="w-full p-3 rounded-2xl bg-transparent border border-[#99d037]/50 text-sm text-white/90 space-y-1 text-center">
                  <span className="text-sm font-bold uppercase text-[#99d037] block">Правила игры:</span>
                  <p className="text-sm leading-snug line-clamp-3">{game.rules}</p>
                </div>
              </>
            )}
          </motion.div>

        </div>

      </motion.div>

      {/* FOOTER OVERLAY (Sliding up cleanly at bottom on the last card) */}
      {isLastCard && (
        <motion.div 
          style={{ y: footerY, opacity: footerOpacity }}
          className="absolute bottom-16 sm:bottom-4 left-2 right-2 sm:left-4 sm:right-4 z-40 pointer-events-auto"
        >
          <div className="bg-transparent border-2 border-[#99d037]/80 p-4 sm:p-6 rounded-3xl text-white space-y-4 shadow-[0_0_50px_rgba(153,208,55,0.25)] max-w-3xl sm:max-w-4xl mx-auto">
            
            {/* 1. Leaf Buttons (Centered 'В начало' top row with white icon + Link buttons below) */}
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
              {/* Row 1: Back to Top Button centered with white icon */}
              <div className="flex justify-center w-full">
                <LilyPadButton 
                  variant="primary"
                  onClick={() => {
                    playCroak();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <span>В начало</span>
                  <RotateCcw className="w-5 h-5 ml-1 text-white" />
                </LilyPadButton>
              </div>

              {/* Row 2: Link Buttons below */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <a 
                  href="https://rent-rop.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="no-underline"
                >
                  <LilyPadButton variant="secondary">
                    <span>Продукт компании РентРОП</span>
                    <Globe className="w-4 h-4 ml-1 text-white" />
                  </LilyPadButton>
                </a>

                <a 
                  href="https://t.me/+Qr9hu55w7tEwNjZi" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="no-underline"
                >
                  <LilyPadButton variant="secondary">
                    <span>Чат техподдержки</span>
                    <Users className="w-4 h-4 ml-1 text-white" />
                  </LilyPadButton>
                </a>
              </div>
            </div>

            {/* 2. Requisites & Legal Info */}
            <div className="border-t border-white/20 pt-3 text-center text-xs sm:text-sm text-white/80 space-y-1.5 font-mono">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-bold text-[#99d037] text-xs sm:text-sm font-sans">
                <span>© 2026 Квайз</span>
                <span>·</span>
                <span>ИИ-Игры для всех</span>
                <span>·</span>
                <span>ООО «РентРоп»</span>
              </div>

              <p className="text-white/70 text-[11px] sm:text-xs max-w-2xl mx-auto leading-relaxed font-sans">
                Юридический адрес: 115191, г. Москва, пер. Духовской, д. 17, стр. 15, помещ. 11Н/2
              </p>

              <p className="text-white/70 text-[11px] sm:text-xs font-mono">
                ОГРН: 1217700234157 · ИНН: 7726477438
              </p>

              <p className="text-white/80 text-[11px] sm:text-xs">
                E-mail: <a href="mailto:info@arenda-ropa.com" className="text-[#99d037] underline hover:text-white font-semibold">info@arenda-ropa.com</a> · Публичная оферта
              </p>

              <p className="text-white/60 text-[10px] sm:text-xs pt-0.5">
                Принимаем к оплате: МИР · Visa · Mastercard
              </p>
            </div>

          </div>
        </motion.div>
      )}

    </div>
  );
};
