import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { initiateYouTubeAuth, isTokenExpired } from '../features/youtube/youtube-auth';
import { DEFAULT_PLAYLIST_IDS } from '../features/youtube/youtube-api';
import { getConfig, saveConfig, encodeSyncPayload } from '../lib/storage';
import { parseLbCsv } from '../features/letterboxd/letterboxd-csv';
import { getLbFilms, setLbFilms } from '../lib/letterboxd-store';
import { clearDismissedBySource } from '../lib/dismissed-store';

interface Props {
  onComplete: () => void;
  onClose?: () => void;
}

type DrawerTopic = 'youtube' | 'tmdb' | 'letterboxd' | null;
type VerifyState = 'idle' | 'checking' | 'ok' | 'fail';

async function checkTmdbToken(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.themoviedb.org/3/configuration', {
      headers: { Authorization: `Bearer ${token}` },
    });
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
            <h2 className="text-white font-bold text-lg pr-6">YouTube setup</h2>

            <div className="flex flex-col gap-1">
              <p className="text-white text-sm font-semibold">OAuth client ID</p>
              <ol className="flex flex-col gap-2 text-sm text-zinc-300 list-decimal list-inside">
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-white font-medium underline underline-offset-2 hover:text-zinc-300">console.cloud.google.com</a> and create or pick a project.</li>
                <li>Go to <span className="text-white font-medium">APIs &amp; Services → Library</span>, find <span className="text-white font-medium">YouTube Data API v3</span>, and enable it.</li>
                <li>Go to <span className="text-white font-medium">Credentials → Create Credentials → OAuth client ID</span>. Choose <span className="text-white font-medium">Web application</span>.</li>
                <li>
                  Add these redirect URIs:
                  <ul className="list-disc list-inside mt-1 ml-3 text-zinc-400">
                    <li>https://streams.lukethe.dev</li>
                    <li>http://localhost:5173</li>
                  </ul>
                </li>
                <li>Copy the <span className="text-white font-medium">Client ID</span> (ends in <code className="text-zinc-400">.apps.googleusercontent.com</code>).</li>
              </ol>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-white text-sm font-semibold">Playlist IDs</p>
              <p className="text-sm text-zinc-300">Comma-separate multiple IDs to pull from more than one playlist.</p>
              <ul className="flex flex-col gap-1 text-sm text-zinc-400 list-disc list-inside mt-1">
                <li><code className="text-zinc-300">LL</code> — Liked Videos (default, always accessible)</li>
                <li><code className="text-zinc-300">WL</code> — Watch Later (removed from API, returns empty)</li>
                <li>Custom: open a playlist on YouTube and copy the <code className="text-zinc-300">list=</code> value from the URL</li>
              </ul>
            </div>
          </>
        )}

        {topic === 'tmdb' && (
          <>
            <h2 className="text-white font-bold text-lg pr-6">TMDB API key</h2>
            <ol className="flex flex-col gap-3 text-sm text-zinc-300 list-decimal list-inside">
              <li>Create a free account at <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer" className="text-white font-medium underline underline-offset-2 hover:text-zinc-300">themoviedb.org</a>.</li>
              <li>Go to your account settings (avatar → Settings) and choose <span className="text-white font-medium">API</span> in the left sidebar.</li>
              <li>Click <span className="text-white font-medium">Create</span> under the Developer section and fill in the short form (personal use is fine).</li>
              <li>Copy the <span className="text-white font-medium">API Read Access Token (v4 auth)</span> — it's a long JWT string — and paste it here.</li>
            </ol>
            <p className="text-zinc-500 text-xs">TMDB is used to fetch movie posters, synopses, and runtimes for your Letterboxd watchlist. Without it you'll still see titles but no artwork.</p>
          </>
        )}

        {topic === 'letterboxd' && (
          <>
            <h2 className="text-white font-bold text-lg pr-6">Letterboxd CSV import</h2>
            <ol className="flex flex-col gap-3 text-sm text-zinc-300 list-decimal list-inside">
              <li>Log in to <a href="https://letterboxd.com" target="_blank" rel="noopener noreferrer" className="text-white font-medium underline underline-offset-2 hover:text-zinc-300">letterboxd.com</a> and go to <span className="text-white font-medium">Settings → Import & Export</span>.</li>
              <li>Under <span className="text-white font-medium">Export Your Data</span>, click <span className="text-white font-medium">Export</span>. Letterboxd will email you a ZIP file.</li>
              <li>Extract the ZIP — you'll find several CSV files inside. Locate <span className="text-white font-medium">watchlist.csv</span>.</li>
              <li>Click the upload area here and select that file.</li>
            </ol>
            <p className="text-zinc-500 text-xs">Your watchlist data stays on-device in your browser's local storage — it's never uploaded anywhere.</p>
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

export function OnboardingScreen({ onComplete, onClose }: Props) {
  const [savedConfig] = useState(() => getConfig());

  const [youtubeClientId, setYoutubeClientId] = useState(savedConfig.youtubeClientId ?? '');
  const [revealClientId, setRevealClientId] = useState(false);
  const [playlistIds, setPlaylistIds] = useState(
    savedConfig.youtubePlaylistIds?.join(', ') ?? DEFAULT_PLAYLIST_IDS.join(', '),
  );

  // Tracks how many films were imported in this session (before page reload)
  const [importedCount, setImportedCount] = useState<number>(0);

  const [tmdbKey, setTmdbKey] = useState(savedConfig.tmdbApiKey ?? '');
  const [revealTmdbKey, setRevealTmdbKey] = useState(false);
  const [tmdbVerify, setTmdbVerify] = useState<VerifyState>('idle');

  const [drawer, setDrawer] = useState<DrawerTopic>(null);
  const [showSync, setShowSync] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncUrl = `${window.location.origin}/#config=${encodeSyncPayload(getLbFilms())}`;

  const youtubeTokenOk = Boolean(savedConfig.youtube && !isTokenExpired(savedConfig.youtube));
  const youtubeTokenExpired = Boolean(savedConfig.youtube && isTokenExpired(savedConfig.youtube));

  useEffect(() => {
    if (!savedConfig.tmdbApiKey) return;
    setTmdbVerify('checking');
    checkTmdbToken(savedConfig.tmdbApiKey).then((ok) => setTmdbVerify(ok ? 'ok' : 'fail'));
  }, [savedConfig.tmdbApiKey]);

  function handleTmdbKeyChange(value: string) {
    setTmdbKey(value);
    setTmdbVerify('idle');
  }

  async function handleVerifyTmdb() {
    const key = tmdbKey.trim();
    if (!key) return;
    setTmdbVerify('checking');
    const ok = await checkTmdbToken(key);
    setTmdbVerify(ok ? 'ok' : 'fail');
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result;
      if (typeof csv !== 'string') return;
      const films = parseLbCsv(csv);
      console.log(`[letterboxd] parsed ${films.length} films from CSV`);
      setLbFilms(films);
      clearDismissedBySource('lb');
      saveConfig({ letterboxd: { importedAt: new Date().toISOString(), count: films.length } });
      setImportedCount(films.length);
    };
    reader.readAsText(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleCsvFile(file);
  }

  function handleDropZoneDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleCsvFile(file);
  }

  const existingImport = savedConfig.letterboxd;
  const hasImportedFilms = existingImport !== null || importedCount > 0;
  const displayCount = importedCount > 0 ? importedCount : (existingImport?.count ?? 0);
  const displayImportedAt = existingImport?.importedAt
    ? new Date(existingImport.importedAt).toLocaleDateString()
    : null;

  const canContinue = youtubeTokenOk || hasImportedFilms;

  function connectYouTube() {
    const clientId = youtubeClientId.trim();
    if (!clientId) return;
    const ids = playlistIds.split(',').map((s) => s.trim()).filter(Boolean);
    saveConfig({ youtubeClientId: clientId, youtubePlaylistIds: ids.length > 0 ? ids : DEFAULT_PLAYLIST_IDS });
    initiateYouTubeAuth(clientId);
  }

  function handleContinue() {
    if (tmdbKey.trim()) {
      saveConfig({ tmdbApiKey: tmdbKey.trim() });
    }
    onComplete();
  }

  return (
    <>
      <HelpDrawer topic={drawer} onClose={() => setDrawer(null)} />

      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md flex flex-col gap-8">
          <div className="relative text-center">
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close settings"
                className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors text-2xl leading-none"
              >
                ×
              </button>
            )}
            <h1 className="text-4xl font-bold text-white tracking-tight">Stream Watchlist</h1>
            <p className="text-zinc-400 mt-2">Connect your sources to get started</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* YouTube */}
            <div className="rounded-xl bg-zinc-900 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-white font-semibold">YouTube</p>
                  <p className="text-zinc-500 text-sm">Liked Videos or any playlist</p>
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

              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="Playlist IDs (comma-separated) — default: LL"
                  value={playlistIds}
                  onChange={(e) => setPlaylistIds(e.target.value)}
                  className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                />
                <p className="text-zinc-600 text-xs">LL = Liked Videos · WL (Watch Later) no longer works via the API</p>
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
                  <p className="text-zinc-500 text-sm">Import your watchlist CSV</p>
                </div>
                {hasImportedFilms && <StatusBadge state="ok" />}
                <HelpButton onClick={() => setDrawer('letterboxd')} />
              </div>

              {hasImportedFilms ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-300">
                    {displayCount} films imported
                    {displayImportedAt && <span className="text-zinc-500"> · {displayImportedAt}</span>}
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="ml-auto text-zinc-500 hover:text-white text-xs transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    Re-import
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDropZoneDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="w-full border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-6 text-center text-zinc-500 hover:text-zinc-300 text-sm transition-colors cursor-pointer"
                >
                  Drop <span className="font-medium text-zinc-300">watchlist.csv</span> here or click to browse
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>

            {/* TMDB */}
            <div className="rounded-xl bg-zinc-900 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-white font-semibold">TMDB</p>
                  <p className="text-zinc-500 text-sm">Posters & metadata for Letterboxd films</p>
                </div>
                <StatusBadge state={tmdbVerify} />
                <HelpButton onClick={() => setDrawer('tmdb')} />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={revealTmdbKey ? 'text' : 'password'}
                    placeholder="Read Access Token"
                    value={tmdbKey}
                    onChange={(e) => handleTmdbKeyChange(e.target.value)}
                    className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3 py-2 pr-14 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  />
                  {tmdbKey && (
                    <RevealToggle revealed={revealTmdbKey} onToggle={() => setRevealTmdbKey((r) => !r)} />
                  )}
                </div>
                {tmdbVerify === 'idle' && tmdbKey.trim() && (
                  <button
                    onClick={handleVerifyTmdb}
                    className="text-zinc-500 hover:text-white text-xs transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    Verify
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sync to device */}
          {canContinue && (
            <div className="rounded-xl bg-zinc-900 p-5 flex flex-col gap-3">
              <button
                onClick={() => setShowSync((s) => !s)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <p className="text-white font-semibold">Sync to another device</p>
                  <p className="text-zinc-500 text-sm">Open on your phone with all settings pre-filled</p>
                </div>
                <span className="text-zinc-500 text-sm ml-4">{showSync ? 'Hide' : 'Show QR'}</span>
              </button>

              {showSync && (
                <div className="flex flex-col items-center gap-3 pt-1">
                  <div className="bg-white p-3 rounded-xl">
                    <QRCodeSVG value={syncUrl} size={200} />
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(syncUrl)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
                  >
                    Copy link
                  </button>
                  <p className="text-zinc-600 text-xs text-center max-w-xs">
                    Includes your API keys and Letterboxd films. Don't share publicly.
                  </p>
                </div>
              )}
            </div>
          )}

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
