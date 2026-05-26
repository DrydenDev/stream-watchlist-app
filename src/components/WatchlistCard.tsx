import { useState, useRef } from 'react';
import type { WatchlistItem } from '../types';
import { SourceBadge } from './SourceBadge';

const REVEAL_WIDTH = 88; // px — width of the swipe-to-delete button
const SNAP_THRESHOLD = REVEAL_WIDTH / 2;

function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function WatchlistCard({ item, onDismiss }: { item: WatchlistItem; onDismiss: (id: string) => void }) {
  const [offset, setOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [touching, setTouching] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const horizontal = useRef<boolean | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    horizontal.current = null;
    setTouching(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (horizontal.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      horizontal.current = Math.abs(dx) > Math.abs(dy);
    }
    if (!horizontal.current) return;

    const base = isRevealed ? REVEAL_WIDTH : 0;
    setOffset(Math.max(0, Math.min(REVEAL_WIDTH, base - dx)));
  }

  function handleTouchEnd() {
    setTouching(false);
    if (horizontal.current !== true) return;
    if (offset >= SNAP_THRESHOLD) {
      setOffset(REVEAL_WIDTH);
      setIsRevealed(true);
    } else {
      setOffset(0);
      setIsRevealed(false);
    }
  }

  function handleCardClick(e: React.MouseEvent) {
    if (isRevealed) {
      e.preventDefault();
      setOffset(0);
      setIsRevealed(false);
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl ring-1 ring-zinc-600"
      // pan-y lets the browser handle vertical scroll while we handle horizontal swipes
      style={{ touchAction: 'pan-y' }}
    >
      {/* Delete button revealed by swipe — desktop dismiss button handles this on larger screens */}
      <button
        onClick={() => onDismiss(item.id)}
        aria-label="Delete"
        className="sm:hidden absolute inset-y-0 right-0 bg-red-600 active:bg-red-500 text-white font-semibold text-sm flex items-center justify-center"
        style={{ width: REVEAL_WIDTH }}
      >
        Delete
      </button>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${offset}px)`,
          transition: touching ? 'none' : 'transform 0.2s ease-out',
        }}
        className="group relative flex flex-col overflow-hidden rounded-xl bg-zinc-900 aspect-[4/3] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {item.poster ? (
          item.source === 'youtube' ? (
            <>
              <div
                className="absolute inset-0 scale-110 blur-xl"
                style={{ backgroundImage: `url(${item.poster})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
              <img
                src={item.poster}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </>
          ) : (
            <img
              src={item.poster}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )
        ) : (
          <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
            <span className="text-zinc-600 text-4xl">🎬</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        <div className="absolute top-3 left-3">
          <SourceBadge source={item.source} />
        </div>

        {/* Dismiss button — desktop hover only */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(item.id); }}
          aria-label="Dismiss"
          className="absolute top-2 right-2 hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/90 text-white rounded-full w-6 h-6 items-center justify-center text-xs leading-none"
        >
          ✕
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-1">
          <h2 className="text-white font-bold text-lg leading-tight line-clamp-2">{item.title}</h2>
          {formatRuntime(item.runtimeMinutes) && (
            <p className="text-zinc-400 text-sm">{formatRuntime(item.runtimeMinutes)}</p>
          )}
          {item.synopsis && (
            <p className="text-zinc-300 text-xs line-clamp-2 mt-1">{item.synopsis}</p>
          )}
        </div>
      </a>
    </div>
  );
}
