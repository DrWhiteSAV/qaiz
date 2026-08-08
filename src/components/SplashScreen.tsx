import React from 'react';
import { motion } from 'motion/react';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6"
      >
        {/* Animated Logo */}
        <motion.div
          animate={{ 
            y: [0, -15, 0],
            rotate: [0, -5, 5, -5, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="relative"
        >
          <div className="absolute inset-0 bg-primary/20 blur-[20px] rounded-full scale-75 opacity-50" />
          <img 
            src="https://i.ibb.co/m5vZ0MhJ/qaizlogo.png" 
            alt="Квайз" 
            className="relative h-32 w-32 drop-shadow-[0_0_15px_rgba(131,196,46,0.4)]" 
          />
        </motion.div>

        <motion.h1 
          className="text-4xl font-black uppercase tracking-tighter text-primary drop-shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Квайз
        </motion.h1>

        {/* Spinner */}
        <div className="flex items-center gap-2 mt-2">
          <motion.span
            className="w-2.5 h-2.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-2.5 h-2.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="w-2.5 h-2.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
          />
        </div>

        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </motion.div>
    </div>
  );
}
