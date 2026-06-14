import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo?: Echo<'reverb'>;
  }
}

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

/** API root used for Laravel broadcasting auth (no `/api/v1/main` prefix). */
export function broadcastAuthUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  if (base) {
    return `${trimTrailingSlash(base)}/broadcasting/auth`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/broadcasting/auth`;
  }
  return '/broadcasting/auth';
}

export function isReverbConfigured(): boolean {
  const key = import.meta.env.VITE_REVERB_APP_KEY?.trim();
  return Boolean(key && key !== 'your-app-key');
}

function parseReverbPort(): number {
  const raw = import.meta.env.VITE_REVERB_PORT;
  const parsed = raw ? Number.parseInt(String(raw), 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 8080;
}

export function createEcho(token: string): Echo<'reverb'> {
  window.Pusher = Pusher;

  const scheme = (import.meta.env.VITE_REVERB_SCHEME ?? 'https').toLowerCase();
  const forceTLS = scheme === 'https';
  const port = parseReverbPort();

  const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1',
    wsPort: port,
    wssPort: port,
    forceTLS,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: broadcastAuthUrl(),
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  window.Echo = echo;
  return echo;
}

export function disconnectEcho(): void {
  window.Echo?.disconnect();
  window.Echo = undefined;
}

export function getEcho(): Echo<'reverb'> | undefined {
  return window.Echo;
}
