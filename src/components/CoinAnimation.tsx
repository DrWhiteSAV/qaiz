import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BubbleCurrencyIcon } from './BubbleIcon';

interface CoinAnimationProps {
  show: boolean;
}

export function CoinAnimation({ show }: CoinAnimationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1, x: '50vw', y: '50vh', scale: 1.5 }}
          animate={{ opacity: 0, x: 'calc(100vw - 120px)', y: '24px', scale: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="fixed z-[9999] pointer-events-none"
        >
          <div className="flex items-center gap-1.5 bg-primary/90 rounded-full px-3 py-1.5 text-background font-black text-sm shadow-lg shadow-primary/50">
            <span>−1</span>
            <BubbleCurrencyIcon className="w-4 h-4" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
