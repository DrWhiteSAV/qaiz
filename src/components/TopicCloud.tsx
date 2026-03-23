import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2 } from 'lucide-react';
import { TOPIC_DESCRIPTIONS } from '../constants';

interface TopicCloudProps {
  topics: string[];
  selectedTopic: string;
  onSelect: (topic: string) => void;
}

export const TopicCloud = ({ topics, selectedTopic, onSelect }: TopicCloudProps) => {
  const [modalTopic, setModalTopic] = useState<string | null>(null);

  const getDescription = (topic: string) => {
    return TOPIC_DESCRIPTIONS[topic] || `Увлекательная викторина на тему "${topic}". Проверьте свои знания и смекалку!`;
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-center gap-1.5 p-4 rounded-3xl border-2 border-[#f4f1ee] dark:border-white/10 bg-[#b4beb9] dark:bg-white/10 min-h-[120px]">
        {topics.map((topic, i) => (
          <button
            key={topic}
            type="button"
            onClick={() => setModalTopic(topic)}
            className={`rounded-full px-3 py-1 font-bold transition-all hover:scale-110 active:scale-95 animate-in fade-in zoom-in duration-500 border-2 ${
              selectedTopic === topic 
                ? 'bg-[#83c42e] text-[#f4f1ee] shadow-[4px_4px_0px_0px_#0b1c1c] z-10 scale-105 border-[#f4f1ee]' 
                : 'bg-[#f4f1ee] dark:bg-white/10 text-[#0b1c1c] dark:text-white hover:bg-[#f4f1ee]/80 dark:hover:bg-white/20 border-transparent'
            }`}
            style={{
              fontSize: '10px', // Compact font size
              animationDelay: `${i * 0.01}s`
            }}
          >
            {topic}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {modalTopic && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm space-y-6 rounded-3xl border-2 border-[#f4f1ee] bg-[#83c42e] dark:bg-slate-900 p-8 shadow-[12px_12px_0px_0px_#0b1c1c]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-[#f4f1ee] dark:text-white drop-shadow-sm">{modalTopic}</h3>
                <button 
                  type="button"
                  onClick={() => setModalTopic(null)} 
                  className="rounded-full p-2 hover:bg-white/10 transition-colors text-[#f4f1ee] dark:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#b4beb9] dark:bg-white/10 p-4 border-2 border-[#f4f1ee] dark:border-white/10">
                  <p className="text-sm text-[#0b1c1c] dark:text-white/90 leading-relaxed">
                    {getDescription(modalTopic)}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    onSelect(modalTopic);
                    setModalTopic(null);
                  }}
                  className="w-full py-3 text-lg rounded-2xl bg-[#83c42e] text-[#f4f1ee] font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_#0b1c1c] border-2 border-[#f4f1ee] hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} />
                  Выбрать тему
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
