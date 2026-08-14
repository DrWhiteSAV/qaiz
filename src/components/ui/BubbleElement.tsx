import React from 'react';

interface BubbleElementProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  isBadge?: boolean;
}

export const BubbleElement: React.FC<BubbleElementProps> = ({
  active = false,
  children,
  icon,
  size = 'md',
  isBadge = false,
  className = '',
  onClick,
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs md:text-sm',
    lg: 'px-6 py-3 text-sm md:text-base font-bold'
  };

  const style: React.CSSProperties = {
    background: active
      ? 'radial-gradient(circle at 35% 30%, rgba(131, 196, 46, 0.9) 0%, rgba(80, 125, 42, 0.6) 65%, rgba(10, 15, 8, 0.4) 100%)'
      : 'radial-gradient(circle at 35% 30%, rgba(131, 196, 46, 0.25) 0%, rgba(80, 125, 42, 0.12) 60%, rgba(10, 15, 8, 0.2) 100%)',
    boxShadow: active
      ? 'inset -3px -3px 8px rgba(0, 0, 0, 0.6), inset 3px 3px 6px rgba(255, 255, 255, 0.5), 0 0 16px rgba(131, 196, 46, 0.6)'
      : 'inset -2px -2px 6px rgba(0, 0, 0, 0.4), inset 2px 2px 4px rgba(131, 196, 46, 0.3), 0 0 8px rgba(131, 196, 46, 0.15)',
    border: active ? '1.5px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(131, 196, 46, 0.35)',
  };

  const innerContent = (
    <>
      {/* 3D Glass Glare Highlight */}
      <span className="absolute top-[12%] left-[12%] w-[25%] h-[25%] rounded-full bg-white/60 blur-[0.5px] pointer-events-none" />

      {/* Icon */}
      {icon && <span className={`relative z-10 shrink-0 ${active ? 'text-black' : 'text-primary'}`}>{icon}</span>}

      {/* Children */}
      <span className={`relative z-10 font-bold normal-case tracking-normal whitespace-nowrap ${active ? 'text-black font-black' : 'text-foreground'}`}>
        {children}
      </span>
    </>
  );

  if (isBadge) {
    return (
      <div
        className={`relative inline-flex items-center justify-center gap-2 rounded-full overflow-hidden transition-all duration-300 ${sizeClasses[size]} ${className}`}
        style={style}
      >
        {innerContent}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2 rounded-full overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.05] active:scale-[0.95] disabled:opacity-50 disabled:pointer-events-none ${sizeClasses[size]} ${className}`}
      style={style}
      {...props}
    >
      {innerContent}
    </button>
  );
};
