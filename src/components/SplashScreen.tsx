import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const LANDING_ASSETS = [
  '/file/13/logo.png', // Logo Header / Default Avatar
  '/file/14/qaizlogo.png', // Hero Mascot Logo
  '/file/15/melody.png', // Уквакай Мелодию
  '/file/16/100to1.png', // Сто Квадному
  '/file/17/jeopardy.png', // Своя Икра
  '/file/18/blitz.png', // КвИИз / OG Social
  '/file/19/millionaire.png', // Квиллионер
  '/file/20/whatwherewhen.png', // Что? Где? Квада?
];

interface SplashScreenProps {
  onComplete?: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [loadedCount, setLoadedCount] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Clear caches & force reload landing images into browser cache
  useEffect(() => {
    let mounted = true;
    let completed = 0;
    const total = LANDING_ASSETS.length;
    const timestamp = Date.now();

    // Preload all key site images into browser cache with exact URLs matching the app
    LANDING_ASSETS.forEach((src) => {
      const img = new Image();
      const handleLoad = () => {
        if (!mounted) return;
        completed++;
        setLoadedCount(completed);
      };
      img.onload = handleLoad;
      img.onerror = handleLoad; // Ensure progress isn't stuck on error
      img.src = src;
    });

    // Fallback safety timeout
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoadedCount(total);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // Smooth progress counter up to loaded target
  useEffect(() => {
    const targetProgress = Math.round((loadedCount / LANDING_ASSETS.length) * 100);
    
    if (displayProgress < targetProgress) {
      const timer = setTimeout(() => {
        setDisplayProgress((prev) => Math.min(prev + 2, targetProgress));
      }, 20);
      return () => clearTimeout(timer);
    } else if (targetProgress === 100 && displayProgress === 100 && !isFinished) {
      const delayTimer = setTimeout(() => {
        setIsFinished(true);
        if (onComplete) {
          onComplete();
        }
      }, 400);
      return () => clearTimeout(delayTimer);
    }
  }, [loadedCount, displayProgress, isFinished, onComplete]);

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999] overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(153,208,55,0.15)_0%,transparent_70%)] pointer-events-none" />

          <div className="relative flex flex-col items-center gap-8 z-10 px-4">
            
            {/* Clockwise Bubble Orbit Container */}
            <div className="relative w-56 h-56 flex items-center justify-center">
              
              {/* Outer Clockwise Rotating Ring of Bubbles */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-primary/20"
              >
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                  const rad = (deg * Math.PI) / 180;
                  const radius = 100; // px
                  const x = Math.cos(rad) * radius;
                  const y = Math.sin(rad) * radius;
                  const size = i % 2 === 0 ? 'w-5 h-5' : 'w-3.5 h-3.5';

                  return (
                    <motion.div
                      key={deg}
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                      style={{
                        position: 'absolute',
                        left: `calc(50% + ${x}px - 10px)`,
                        top: `calc(50% + ${y}px - 10px)`,
                      }}
                      className={`${size} rounded-full bg-[radial-gradient(circle_at_35%_35%,#c8fa50,#5a8a10)] border border-[#99d037] shadow-[0_0_12px_rgba(153,208,55,0.8)]`}
                    />
                  );
                })}
              </motion.div>

              {/* Inner Counter-Rotating Pulse Ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute w-40 h-40 rounded-full border-2 border-dashed border-primary/40"
              />

              {/* Central Mascot Logo */}
              <motion.div
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative z-10 flex flex-col items-center justify-center"
              >
                <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full scale-125" />
                <img
                  src="/file/14/qaizlogo.png"
                  alt="Маскот Квайз"
                  className="relative h-28 w-28 object-contain drop-shadow-[0_0_25px_rgba(153,208,55,0.7)] select-none pointer-events-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
              </motion.div>
            </div>

            {/* Brand Title */}
            <div className="text-center">
              <h1 className="text-4xl font-black uppercase tracking-tighter text-foreground drop-shadow-[0_0_12px_rgba(153,208,55,0.5)]">
                Квайз
              </h1>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mt-1">
                Подготовка ресурсов
              </p>
            </div>

            {/* Progress Percentage Display */}
            <div className="w-64 flex flex-col items-center gap-2">
              <div className="flex justify-between w-full text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Загрузка ресурсов...</span>
                <span className="text-primary font-mono text-sm font-black">{displayProgress}%</span>
              </div>

              {/* Glowing Progress Bar */}
              <div className="w-full h-3 bg-secondary/80 rounded-full overflow-hidden p-0.5 border border-primary/30 shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#99d037] via-[#bbf246] to-[#99d037] rounded-full shadow-[0_0_12px_rgba(153,208,55,0.9)]"
                  style={{ width: `${displayProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

