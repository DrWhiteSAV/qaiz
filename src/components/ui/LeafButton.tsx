import React, { useState, useId } from 'react';

interface LeafButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: 'primary' | 'glass' | 'dark' | 'outline';
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const LeafButton: React.FC<LeafButtonProps> = ({
  active = false,
  variant = 'glass',
  children,
  icon,
  size = 'md',
  className = '',
  onClick,
  disabled,
  ...props
}) => {
  const clipId = useId();
  const [animDir] = useState(() => (Math.random() > 0.5 ? 'forward' : 'reverse'));
  const [animSpeed] = useState(() => 2.2 + Math.random() * 0.8);

  // Size mappings
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[38px]',
    md: 'px-5 py-2.5 text-base min-h-[46px]',
    lg: 'px-8 py-3.5 text-lg md:text-xl min-h-[56px]'
  };

  const getColors = () => {
    if (active) {
      return {
        fill: '#83c42e',
        stroke: '#ffffff',
        text: 'text-black font-black',
        glow: 'drop-shadow-none'
      };
    }
    if (variant === 'primary') {
      return {
        fill: '#83c42e',
        stroke: '#ffffff',
        text: 'text-black font-black',
        glow: 'drop-shadow-none'
      };
    }
    if (variant === 'dark') {
      return {
        fill: 'transparent',
        stroke: '#507d2a',
        text: 'text-foreground font-bold',
        glow: 'drop-shadow-none'
      };
    }
    // Default 'glass' / 'outline'
    return {
      fill: 'rgba(131, 196, 46, 0.12)',
      stroke: 'rgba(131, 196, 46, 0.35)',
      text: 'text-foreground hover:text-primary font-bold',
      glow: 'drop-shadow-none'
    };
  };

  const colors = getColors();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center group cursor-pointer border-none bg-transparent outline-none transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {/* Organic Lily Pad Leaf SVG Contour */}
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 ${colors.glow}`}
        viewBox="0 0 220 80"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id={clipId}>
            <path d="M 12,40 C 12,10 35,6 110,6 C 175,6 200,10 208,28 L 175,42 L 208,54 C 200,70 175,74 110,74 C 35,74 12,70 12,40 Z" />
          </clipPath>
        </defs>

        {/* Organic Leaf Outline with Cutout Notch */}
        <path
          d="M 12,40 C 12,10 35,6 110,6 C 175,6 200,10 208,28 L 175,42 L 208,54 C 200,70 175,74 110,74 C 35,74 12,70 12,40 Z"
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={active ? '2.5' : '1.5'}
          className="transition-colors duration-300"
        />
        {/* Subtle Leaf Veins */}
        <path
          d="M 175,42 L 110,40 M 175,42 L 140,20 M 175,42 L 140,62 M 175,42 L 70,22 M 175,42 L 70,58"
          stroke={active ? '#2b4703' : '#83c42e'}
          strokeOpacity={active ? '0.5' : '0.25'}
          strokeWidth="1.2"
          strokeDasharray="3 2"
          fill="none"
        />
        {/* Perimeter Animated Inner Pulse (CLIPPED strictly inside the leaf, NO outer drop-shadow) */}
        {(variant === 'primary' || active) && (
          <g clipPath={`url(#${clipId})`}>
            <path
              d="M 12,40 C 12,10 35,6 110,6 C 175,6 200,10 208,28 L 175,42 L 208,54 C 200,70 175,74 110,74 C 35,74 12,70 12,40 Z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="90 460"
              style={{
                animation: `${animDir === 'reverse' ? 'leafGlowReverse' : 'leafGlowForward'} ${animSpeed}s linear infinite`,
                opacity: 0.95
              }}
            />
          </g>
        )}
      </svg>

      {/* Button Content */}
      <span className={`relative z-10 flex items-center justify-center gap-2 normal-case tracking-normal text-center select-none pointer-events-none ${colors.text}`}>
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </span>
    </button>
  );
};

