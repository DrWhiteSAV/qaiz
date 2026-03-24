import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SpinningTableProps {
  currentIndex: number;
  isSpinning: boolean;
  onSpinEnd?: () => void;
  answeredIndices: number[];
}

export const SpinningTable: React.FC<SpinningTableProps> = ({
  currentIndex,
  isSpinning,
  onSpinEnd,
  answeredIndices,
}) => {
  const sectors = 11;
  const anglePerSector = 360 / sectors;

  // Calculate target rotation to make the currentIndex be at the top (or pointed by arrow)
  const targetRotation = -currentIndex * anglePerSector;

  return (
    <div className="relative flex items-center justify-center w-full max-w-[500px] aspect-square mx-auto my-8 overflow-visible">
      {/* Table Container - ensuring perfect centering */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative w-full h-full rounded-full border-8 border-primary/30 bg-primary/5 shadow-2xl overflow-hidden"
          animate={{ rotate: isSpinning ? [0, 1080 + targetRotation] : targetRotation }}
          transition={{
            duration: isSpinning ? 3 : 0.5,
            ease: isSpinning ? "easeOut" : "easeInOut",
          }}
          onAnimationComplete={() => {
            if (isSpinning && onSpinEnd) {
              onSpinEnd();
            }
          }}
        >
          {/* Sectors */}
          {[...Array(sectors)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 left-1/2 w-1 h-1/2 bg-primary/20 origin-bottom"
              style={{ transform: `translateX(-50%) rotate(${i * anglePerSector}deg)` }}
            />
          ))}

          {/* Envelopes */}
          {[...Array(sectors)].map((_, i) => {
            const isCurrent = i === currentIndex && !isSpinning;
            const isAnswered = answeredIndices.includes(i);
            
            return (
              <div
                key={i}
                className="absolute inset-0 flex items-start justify-center pointer-events-none"
                style={{ transform: `rotate(${i * anglePerSector}deg)` }}
              >
                <motion.div
                  className={`relative mt-[10%] w-16 h-10 sm:w-20 sm:h-12 flex items-center justify-center rounded-sm shadow-md transition-colors pointer-events-auto ${
                    isAnswered ? 'bg-gray-400/50' : 'bg-yellow-100'
                  }`}
                  animate={isCurrent ? { scale: 1.2, y: -10 } : { scale: 1, y: 0 }}
                >
                  {/* Envelope Flap */}
                  <motion.div
                    className="absolute top-0 left-0 w-full h-full border-t-[20px] sm:border-t-[24px] border-t-yellow-200 border-x-[32px] sm:border-x-[40px] border-x-transparent origin-top"
                    animate={{ rotateX: isCurrent ? 180 : 0 }}
                    transition={{ duration: 0.5 }}
                  />
                  <span className="relative z-10 font-black text-primary text-lg">{i + 1}</span>
                </motion.div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Arrow/Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="w-8 h-12 bg-red-600 clip-path-arrow shadow-lg" style={{ clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)' }} />
      </div>

      {/* Center Top (Spinning Top) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-12 h-12 bg-primary rounded-full border-4 border-background shadow-xl flex items-center justify-center"
          animate={{ rotate: isSpinning ? 1080 : 0 }}
          transition={{ duration: 3, ease: "easeOut" }}
        >
          <div className="w-2 h-2 bg-background rounded-full" />
        </motion.div>
      </div>
    </div>
  );
};
