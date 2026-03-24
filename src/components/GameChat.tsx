import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  isBot: boolean;
  avatar?: string;
  timestamp: number;
}

interface GameChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUser: { id: string; name: string };
}

export const GameChat = ({ messages, onSendMessage, currentUser }: GameChatProps) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f1ee] dark:bg-slate-900/50 rounded-3xl border-2 border-[#0b1c1c]/10 dark:border-white/10 overflow-hidden shadow-xl">
      <div className="p-4 border-b border-[#0b1c1c]/10 dark:border-white/10 bg-[#83c42e]/10">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#0b1c1c] dark:text-white flex items-center gap-2">
          Чат игры
        </h3>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}
            >
              <div className={`flex items-center gap-2 mb-1 ${msg.senderId === currentUser.id ? 'flex-row-reverse' : ''}`}>
                <div className="w-5 h-5 rounded-full bg-[#83c42e] flex items-center justify-center overflow-hidden border border-[#0b1c1c]/10">
                  {msg.isBot ? (
                    <img src={msg.avatar} alt={msg.senderName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={12} className="text-white" />
                  )}
                </div>
                <span className="text-[10px] font-bold text-[#0b1c1c]/60 dark:text-white/60 uppercase tracking-tighter">
                  {msg.senderName}
                </span>
              </div>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                msg.senderId === currentUser.id 
                  ? 'bg-[#83c42e] text-white rounded-tr-none' 
                  : msg.isBot 
                    ? 'bg-white dark:bg-slate-800 text-[#0b1c1c] dark:text-white border border-[#83c42e]/30 rounded-tl-none'
                    : 'bg-white dark:bg-slate-800 text-[#0b1c1c] dark:text-white rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-3 bg-white/50 dark:bg-black/20 border-t border-[#0b1c1c]/10 dark:border-white/10">
        <div className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Написать..."
            className="w-full bg-[#f4f1ee] dark:bg-slate-800 rounded-xl py-2 pl-4 pr-10 text-xs text-[#0b1c1c] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#83c42e] transition-all"
          />
          <button
            onClick={handleSend}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#83c42e] hover:scale-110 transition-transform"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
