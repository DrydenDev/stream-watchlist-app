import { useState, useEffect } from 'react';
import { initiateYouTubeAuth, isTokenExpired } from '../features/youtube/youtube-auth';
import { getConfig, saveConfig } from '../lib/storage';

interface Props {
  onComplete: () => void;
}

type DrawerTopic = 'youtube' | 'tmdb' | null;
type VerifyState = 'idle' | 'checking' | 'ok' | 'fail';

async function checkTmdbKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(apiKey)}`,
    );
    return res.ok;
  } catch {
    return false;
  }
}

function HelpDrawer({ topic, onClose }: { topic: DrawerTopic; onClose: () => void }) {
  if (!topic) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end cursor-pointer" onClick={onClose}>
      <div
        className="relative h-full w-full max-w-sm bg-zinc-900 border-l border-zinc-800 p-6 overflow-y-auto flex flex-col gap-5 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white text-lg leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        {topic === 'youtube' && (
          <>
            <h2 className="text-white font-bold text-lg pr-6">YouTube OAuth client ID</h2>
            <ol className="flex flex-col gap-3 text-sm text-zinc-300 list-decimal list-inside">
              <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-white font-medium underline underline-offset-2 hover:text-zinc-300">console.cloud.google.com</a> and create a new project (or pick an existing one).</li>
              <li>In the left sidebar go to <span className="text-white font-medium">APIs &amp; Services → Library</span>, search for <span className="text-white font-medium">YouTube Data API v3</span>, and enable it.</li>
              <li>Go to <span className="text-white font-medium">APIs &amp; Services → Credentials</span> and click <span className="text-white font-medium">Create Credentials → OAuth client ID</span>.</li>
              <li>Choose <span className="text-white font-medium">Web application</span> as the application type.</li>
              <li>
                Under <span className="text-white font-medium">Authorized redirect URIs</span> add:
                <ul className="list-disc list-inside mt-1 ml-3 text-zinc-400">
                  <li>https://streams.lukethe.dev</li>
                  <li>http://localhost:5173 (for local dev)</li>
                </ul>
              </li>
              <li>Click <span className="text-white font-medium">Create</span>. Copy the <span className="text-white font-medium">Client ID</span> (ends in <code className="text-zinc-400">.apps.googleusercontent.com</code>) and paste it here.</li>
            </ol>
            <p className="text-zinc-500 text-xs">Your Watch Later playlist must not be set to private, or the API will return an empty list.</p>
          </>
        )}

        {topic === 'tmdb' && (
          <>
            <h2 className="text-white font-bold text-lg pr-6">TMDB API key</h2>
            <ol className="flex flex-col gap-3 text-sm text-zinc-300 list-decimal list-inside">
              <li>Create a free account at <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer" className="text-white font-medium underline underline-offset-2 hover:text-zinc-300">themoviedb.org</a>.</li>
              <li>Go to your account settings (avatar → Settings) and choose <span className="text-white font-medium">API</span> in the left sidebar.</li>
              <li>Click <span className="text-white font-medium">Create</span> under the Developer section and fill in the short form (personal use is fine).</li>
              <li>Copy the <span className="text-white font-medium">API Key (v3 auth)</span> — it's a long hex string — and paste it here.</li>
            </ol>
            <p className="text-zinc-500 text-xs">TMDB is used to fetch movie posters, synopses, and runtimes for your Letterboxd watchlist. Without it you'll still see titles but no artwork.</p>
          </>
        )}
      </div>
    </div>
  );
}

function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-5 h-5 rounded-full border border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:text-zinc-300 text-xs font-bold leading-none flex items-center justify-center transition-colors flex-shrink-0"
      aria-label="Help"
    >
      ?
    </button>
  );
}

function StatusBadge({ state }: { state: VerifyState | 'warn' }) {
  if (state === 'idle') return null;
  if (state === 'checking') return <span className="text-zinc-500 text-sm animate-pulse">…</span>;
  if (state === 'ok') return <span className="text-green-500 text-sm font-bold flex-shrink-0">✓</span>;
  if (state === 'warn') return <span className="text-yellow-400 text-sm flex-shrink-0">⚠</span>;
  return <span className="text-red-400 text-sm flex-shrink-0">✗</span>;
}

function RevealToggle({ revealed, onToggle }: { revealed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs transition-colors select-none"
    >
      {revealed ? 'Hide' : 'Show'}
    </button>
  );
}

export function OnboardingScreen({ onComplete }: Props) {
  const [savedConfig] = useState(() => getConfig());

  const [youtubeClientId, setYoutubeClientId] = useState(savedConfig.youtubeClientId ?? '');
  const [revealClientId, setRevealClientId] = useState(false);

  const [letterboxdUsername, setLetterboxdUsername] = useState(savedConfig.letterboxd?.username ?? '');

  const [tmdbKey, setTmdbKey] = useState(savedConfig.tmdbApiKey ?? '');
  const [revealTmdbKey, setRevealTmdbKey] = useState(false);
  const [tmdbVerify, setTmdbVerify] = useState<VerifyState>('idle');

  const [drawer, setDrawer] = useState<DrawerTopic>(null);

  const youtubeTokenOk = Boolean(savedConfig.youtube && !isTokenExpired(savedConfig.youtube));
  const youtubeTokenExpired = Boolean(savedConfig.youtube && isTokenExpired(savedConfig.youtube));

  useEffect(() => {
    if (!savedConfig.tmdbApiKey) return;
    setTmdbVerify('checking');
    checkTmdbKey(savedConfig.tmdbApiKey).then((ok) => setTmdbVerify(ok ? 'ok' : 'fail'));
  }, [savedConfig.tmdbApiKey]);

  function handleTmdbKeyChange(value: string) {
    setTmdbKey(value);
    setTmdbVerify('idle');
  }

  async function handleVerifyTmdb() {
    const key = tmdbKey.trim();
    if (!key) return;
    setTmdbVerify('checking');
    const ok = await checkTmdbKey(key);
    setTmdbVerify(ok ? 'ok' : 'fail');
  }

  const letterboxdReady = letterboxdUsername.trim().length > 0 && tmdbKey.trim().length > 0;
  const canContinue = youtubeTokenOk || letterboxdReady;

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
    <>
      <HelpDrawer topic={drawer} onClose={() => setDrawer(null)} />

      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md flex flex-col gap-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white tracking-tight">Stream Watchlist</h1>
            <p className="text-zinc-400 mt-2">Connect your sources to get started</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* YouTube */}
            <div className="rounded-xl bg-zinc-900 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-white font-semibold">YouTube</p>
                  <p className="text-zinc-500 text-sm">Watch Later playlist</p>
                </div>
                {youtubeTokenOk && <StatusBadge state="ok" />}
                {youtubeTokenExpired && <StatusBadge state="warn" />}
                <HelpButton onClick={() => setDrawer('youtube')} />
              </div>

              <div className="relative">
                <input
                  type={revealClientId ? 'text' : 'password'}
                  placeholder="Google OAuth client ID"
                  value={youtubeClientId}
                  onChange={(e) => setYoutubeClientId(e.target.value)}
                  className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3 py-2 pr-14 text-sm outline-none focus:ring-2 focus:ring-white/20"
                />
                {youtubeClientId && (
                  <RevealToggle revealed={revealClientId} onToggle={() => setRevealClientId((r) => !r)} />
                )}
              </div>

              {youtubeClientId.trim() && (
                <button
                  onClick={connectYouTube}
                  className="self-start px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                  {youtubeTokenOk ? 'Reconnect' : youtubeTokenExpired ? 'Token expired — Reconnect' : 'Connect →'}
                </button>
              )}
            </div>

            {/* Letterboxd */}
            <div className="rounded-xl bg-zinc-900 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-white font-semibold">Letterboxd</p>
                  <p className="text-zinc-500 text-sm">Watchlist (public profile required)</p>
                </div>
                {letterboxdUsername.trim() && tmdbVerify === 'ok' && <StatusBadge state="ok" />}
              </div>

              <input
                type="text"
                placeholder="Username"
                value={letterboxdUsername}
                onChange={(e) => setLetterboxdUsername(e.target.value)}
                className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
              />

              {letterboxdUsername.trim() && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={revealTmdbKey ? 'text' : 'password'}
                      placeholder="TMDB API key (for posters & metadata)"
                      value={tmdbKey}
                      onChange={(e) => handleTmdbKeyChange(e.target.value)}
                      className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3 py-2 pr-14 text-sm outline-none focus:ring-2 focus:ring-white/20"
                    />
                    {tmdbKey && (
                      <RevealToggle revealed={revealTmdbKey} onToggle={() => setRevealTmdbKey((r) => !r)} />
                    )}
                  </div>
                  <StatusBadge state={tmdbVerify} />
                  {tmdbVerify === 'idle' && tmdbKey.trim() && (
                    <button
                      onClick={handleVerifyTmdb}
                      className="text-zinc-500 hover:text-white text-xs transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      Verify
                    </button>
                  )}
                  <HelpButton onClick={() => setDrawer('tmdb')} />
                </div>
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
    </>
  );
}
