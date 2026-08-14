import React from 'react';

interface BubbleCurrencyIconProps {
  className?: string;
}

export function BubbleCurrencyIcon({ className = "w-4 h-4" }: BubbleCurrencyIconProps) {
  return (
    <span className={`inline-flex items-center justify-center relative shrink-0 align-middle ${className}`}>
      <span 
        className="block w-full h-full rounded-full relative overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 35% 30%, rgba(153, 208, 55, 1) 0%, rgba(80, 125, 42, 0.9) 55%, rgba(15, 30, 5, 0.95) 85%)',
          boxShadow: 'inset -1px -1px 3px rgba(0, 0, 0, 0.7), inset 1px 1px 3px rgba(255, 255, 255, 0.8), 0 0 8px rgba(153, 208, 55, 0.7)',
          border: '1px solid rgba(153, 208, 55, 0.9)',
        }}
      >
        {/* Animated Glare */}
        <span className="absolute top-[15%] left-[18%] w-[28%] h-[28%] rounded-full bg-white blur-[0.3px] shadow-[0_0_3px_rgba(255,255,255,0.9)]" />
      </span>
    </span>
  );
}
