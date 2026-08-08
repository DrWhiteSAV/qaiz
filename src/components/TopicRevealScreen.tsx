import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star } from 'lucide-react';

interface TopicRevealScreenProps {
  topics: { name: string; description: string }[];
  onComplete: () => void;
}

export function TopicRevealScreen({ topics, onComplete }: TopicRevealScreenProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (revealedCount < topics.length) {
      const timer = setTimeout(() => {
        setRevealedCount(prev => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      // All revealed, show for 2 seconds then enable continue
      const timer = setTimeout(() => setShowAll(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [revealedCount, topics.length]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-4xl space-y-6 py-8">
        <div className="text-center space-y-2">
          <Star className="mx-auto text-primary" size={40} />
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-primary">
            15 тем для игры
          </h2>
          <p className="text-sm text-foreground/50">Темы для всех трёх раундов</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {topics.map((topic, idx) => (
            <AnimatePresence key={idx}>
              {idx < revealedCount && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-black text-primary">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-black uppercase tracking-tighter text-primary">{topic.name}</h3>
                  </div>
                  <p className="text-xs text-foreground/60 leading-relaxed">{topic.description}</p>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>

        {showAll && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center pt-4"
          >
            <button
              onClick={onComplete}
              className="rounded-full bg-primary px-12 py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105 shadow-lg shadow-primary/30"
            >
              Начать игру
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
