'use client';

import { useState, useRef, useCallback } from 'react';
import { Volume2, Pause, Loader2 } from 'lucide-react';

type AudioPlayButtonProps = {
  src: string | undefined;
  label?: string;
  size?: 'sm' | 'md';
};

export function AudioPlayButton({ src, label, size = 'sm' }: AudioPlayButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = useCallback(() => {
    if (!src) return;

    if (state === 'playing') {
      audioRef.current?.pause();
      setState('idle');
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.playbackRate = 0.9;
      audioRef.current.addEventListener('ended', () => setState('idle'));
      audioRef.current.addEventListener('error', () => setState('idle'));
    }

    setState('loading');
    audioRef.current
      .play()
      .then(() => setState('playing'))
      .catch(() => setState('idle'));
  }, [src, state]);

  if (!src) return null;

  const iconSize = size === 'sm' ? 14 : 18;
  const btnSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';

  return (
    <button
      type="button"
      onClick={handlePlay}
      aria-label={label ?? 'Play audio'}
      className={`${btnSize} inline-flex items-center justify-center rounded-full
        bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]
        hover:bg-[var(--accent-teal)]/20 transition-colors
        disabled:opacity-50`}
      disabled={state === 'loading'}
    >
      {state === 'loading' && <Loader2 size={iconSize} className="animate-spin" />}
      {state === 'playing' && <Pause size={iconSize} />}
      {state === 'idle' && <Volume2 size={iconSize} />}
    </button>
  );
}
