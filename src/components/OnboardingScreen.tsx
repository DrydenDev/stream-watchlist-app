import { useState } from 'react';
import { initiateYouTubeAuth } from '../features/youtube/youtube-auth';
import { saveConfig } from '../lib/storage';

interface Props {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const [youtubeClientId, setYoutubeClientId] = useState('');
  const [letterboxdUsername, setLetterboxdUsername] = useState('');
  const [tmdbKey, setTmdbKey] = useState('');

  const youtubeReady = youtubeClientId.trim().length > 0;
  const letterboxdReady = letterboxdUsername.trim().length > 0 && tmdbKey.trim().length > 0;
  const canContinue = youtubeReady || letterboxdReady;

  function connectYouTube() {
    const clientId = youtubeClientId.trim();
    if (!clientId) return;
    saveConfig({ youtubeClientId: clientId });
    initiateYouTubeAuth(clientId);
  }

  function handleContinue() {
    if (letterboxdReady) {
      saveConfig({ letterboxd: { username: letterboxdUsername.trim() }, tmdbApiKey: tmdbKey.trim() });
    }
    onComplete();
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">Stream Watchlist</h1>
          <p className="text-zinc-400 mt-2">Connect your sources to get started</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* YouTube */}
          <div className="rounded-xl bg-zinc-900 p-5 flex flex-col gap-3">
            <div>
              <p className="text-white font-semibold">YouTube</p>
              <p className="text-zinc-500 text-sm">Watch Later playlist</p>
            </div>
            <input
              type="text"
              placeholder="Google OAuth client ID"
              value={youtubeClientId}
              onChange={(e) => setYoutubeClientId(e.target.value)}
              className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
            />
            {youtubeReady && (
              <button
                onClick={connectYouTube}
                className="self-start px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Connect →
              </button>
            )}
          </div>

          {/* Letterboxd */}
          <div className="rounded-xl bg-zinc-900 p-5 flex flex-col gap-3">
            <div>
              <p className="text-white font-semibold">Letterboxd</p>
              <p className="text-zinc-500 text-sm">Watchlist (public profile required)</p>
            </div>
            <input
              type="text"
              placeholder="Username"
              value={letterboxdUsername}
              onChange={(e) => setLetterboxdUsername(e.target.value)}
              className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
            />
            {letterboxdUsername.trim() && (
              <input
                type="text"
                placeholder="TMDB API key (for posters & metadata)"
                value={tmdbKey}
                onChange={(e) => setTmdbKey(e.target.value)}
                className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
              />
            )}
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full py-3 rounded-xl font-bold text-base bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors"
        >
          Start watching
        </button>
      </div>
    </div>
  );
}
