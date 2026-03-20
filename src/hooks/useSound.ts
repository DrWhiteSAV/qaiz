import { useCallback } from 'react';

const FROG_CROAK_URL = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3';

export const useFrogSound = () => {
  const playCroak = useCallback(() => {
    const audio = new Audio(FROG_CROAK_URL);
    audio.volume = 0.2;
    audio.play().catch(err => console.error('Audio playback failed:', err));
  }, []);

  return { playCroak };
};
