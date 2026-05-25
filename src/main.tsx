import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// When loaded inside the silent-refresh iframe, parse the token from the hash,
// post it back to the parent, and stop — don't mount the full app.
if (window.self !== window.top) {
  const raw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(raw);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  const token =
    accessToken && expiresIn
      ? { accessToken, expiresAt: Date.now() + parseInt(expiresIn, 10) * 1000 }
      : null;
  try {
    window.parent.postMessage({ type: 'yt-token-silent', token }, window.location.origin);
  } catch {
    // cross-origin guard — should never fire since redirect_uri is our origin
  }
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
