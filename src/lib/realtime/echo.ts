import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import type { NotificationReverbStreamGuidance } from '@/api/types/notification';

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo?: Echo<'reverb'>;
  }
}

export type CreateEchoOptions = {
  authEndpoint?: string;
  appKey?: string;
  wsHost?: string;
  wsPort?: number;
  forceTLS?: boolean;
};

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

/** API root used for Laravel broadcasting auth (no `/api/v1/main` prefix). */
export function broadcastAuthUrl(override?: string): string {
  const explicit = override?.trim();
  if (explicit) return explicit;

  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  if (base) {
    return `${trimTrailingSlash(base)}/broadcasting/auth`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/broadcasting/auth`;
  }
  return '/broadcasting/auth';
}

export function resolveReverbAppKey(override?: string): string | undefined {
  const key = override?.trim() || import.meta.env.VITE_REVERB_APP_KEY?.trim();
  if (!key || key === 'your-app-key') return undefined;
  return key;
}

function apiHostname(): string | undefined {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!apiBase) return undefined;
  try {
    return new URL(apiBase).hostname;
  } catch {
    return undefined;
  }
}

export function resolveReverbWsHost(override?: string): string {
  const explicit = override?.trim() || import.meta.env.VITE_REVERB_HOST?.trim();
  if (explicit && explicit !== '127.0.0.1' && explicit !== 'localhost') {
    return explicit;
  }
  return apiHostname() ?? explicit ?? '127.0.0.1';
}

function parseReverbPort(override?: number): number {
  if (override != null && Number.isFinite(override)) return override;
  const raw = import.meta.env.VITE_REVERB_PORT;
  const parsed = raw ? Number.parseInt(String(raw), 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 8080;
}

function resolveReverbTls(override?: boolean): boolean {
  if (override != null) return override;
  const scheme = (import.meta.env.VITE_REVERB_SCHEME ?? 'https').toLowerCase();
  return scheme === 'https';
}

export function echoOptionsFromStreamGuidance(
  guidance: NotificationReverbStreamGuidance,
): CreateEchoOptions {
  const scheme = guidance.scheme?.toLowerCase();
  return {
    authEndpoint: guidance.auth_endpoint,
    appKey: guidance.app_key,
    wsHost: guidance.host,
    wsPort: guidance.port,
    forceTLS: scheme ? scheme === 'https' : undefined,
  };
}

/** Echo.private() expects `user.{id}`; stream guidance returns `private-user.{id}`. */
export function echoPrivateChannelName(apiChannel: string, userId?: string | number): string {
  const trimmed = apiChannel.trim();
  if (trimmed.startsWith('private-')) return trimmed.slice('private-'.length);
  if (trimmed) return trimmed;
  return userId != null ? `user.${userId}` : '';
}

export function isReverbConfigured(options?: CreateEchoOptions): boolean {
  return Boolean(resolveReverbAppKey(options?.appKey));
}

export function createEcho(token: string, options: CreateEchoOptions = {}): Echo<'reverb'> {
  window.Pusher = Pusher;

  const appKey = resolveReverbAppKey(options.appKey);
  if (!appKey) {
    throw new Error('Reverb app key is not configured.');
  }

  const forceTLS = resolveReverbTls(options.forceTLS);
  const port = parseReverbPort(options.wsPort);

  const echo = new Echo({
    broadcaster: 'reverb',
    key: appKey,
    wsHost: resolveReverbWsHost(options.wsHost),
    wsPort: port,
    wssPort: port,
    forceTLS,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: broadcastAuthUrl(options.authEndpoint),
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
