import type { WatchlistItem } from '../types';
import { SourceBadge } from './SourceBadge';

function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function WatchlistCard({ item, onDismiss }: { item: WatchlistItem; onDismiss: (id: string) => void }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col overflow-hidden rounded-xl bg-zinc-900 aspect-[4/3] ring-1 ring-zinc-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {item.poster ? (
        item.source === 'youtube' ? (
          <>
            {/* Blurred fill for 16:9 thumbnails in a portrait card */}
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

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Source badge */}
      <div className="absolute top-3 left-3">
        <SourceBadge source={item.source} />
      </div>

      {/* Dismiss button */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(item.id); }}
        aria-label="Dismiss"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/90 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs leading-none"
      >
        ✕
      </button>

      {/* Content */}
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
  );
}
