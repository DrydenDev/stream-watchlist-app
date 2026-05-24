export function PlaceholderCard() {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-700 aspect-[2/3] bg-zinc-900/50">
      <span className="text-3xl mb-3">＋</span>
      <p className="text-zinc-400 font-semibold text-sm">Add more!</p>
      <p className="text-zinc-600 text-xs mt-1 text-center px-4">
        Save more titles to your lists
      </p>
    </div>
  );
}
