import React, { useState } from 'react';
import { User } from 'lucide-react';
import { clsx } from 'clsx';

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: { container: 'h-7 w-7', icon: 12, text: 'text-xs' },
  sm: { container: 'h-9 w-9', icon: 16, text: 'text-sm' },
  md: { container: 'h-12 w-12', icon: 20, text: 'text-base' },
  lg: { container: 'h-16 w-16', icon: 24, text: 'text-xl' },
  xl: { container: 'h-32 w-32', icon: 40, text: 'text-5xl' },
};

export function UserAvatar({ avatarUrl, displayName, size = 'md', className }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { container, text } = SIZE_MAP[size];
  const effectiveAvatar = avatarUrl && !imgError ? avatarUrl : '/file/13/logo.png';

  return (
    <div
      className={clsx(
        'relative flex shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden border border-primary/20',
        container,
        className
      )}
    >
      <img
        src={effectiveAvatar}
        alt={displayName ?? 'Аватар'}
        className="h-full w-full object-cover select-none pointer-events-none"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
    </div>
  );
}
