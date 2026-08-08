import React from 'react';
import { motion } from 'motion/react';
import { EmailAuthForm } from '../components/EmailAuthForm';

export function BrowserLoginPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 p-4 md:p-8 text-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6 max-w-sm w-full"
      >
        {/* Animated Logo */}
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, -3, 3, -3, 0]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="relative"
        >
          <div className="absolute inset-0 bg-primary/20 blur-[20px] rounded-full scale-75 opacity-50" />
          <img 
            src="https://i.ibb.co/m5vZ0MhJ/qaizlogo.png" 
            alt="Квайз" 
            className="relative h-28 md:h-36 w-auto drop-shadow-[0_0_15px_rgba(131,196,46,0.4)]" 
          />
        </motion.div>

        <motion.h1
          className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-primary drop-shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          Квайз
        </motion.h1>

        <p className="text-sm text-foreground/70">
          Войдите по Email или зарегистрируйтесь, чтобы играть
        </p>

        <div className="w-full rounded-[2rem] border border-primary/20 bg-card/60 backdrop-blur-md p-6 shadow-xl">
          <EmailAuthForm />
        </div>
      </motion.div>
    </div>
  );
}
