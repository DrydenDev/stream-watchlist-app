import type { Source } from '../types';

const BADGE: Record<Source, { label: string; className: string }> = {
  youtube: { label: 'YouTube', className: 'bg-red-600 text-white' },
  letterboxd: { label: 'Letterboxd', className: 'bg-[#00C030] text-white' },
};

export function SourceBadge({ source }: { source: Source }) {
  const { label, className } = BADGE[source];
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
