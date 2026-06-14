# Reverb realtime + unified chat — frontend integration guide

**Date:** 2026-06-13  
**Audience:** All SPAs (main, organizer, talent, vendor, admin)  
**Backend:** Laravel Reverb + unified `conversations` API  

> **Unified React guide (install → test):** [`frontend-realtime-integration-guide.md`](frontend-realtime-integration-guide.md)  
> **Chat REST API (per-app requests/responses):** [`frontend-handoff-chat-api.md`](frontend-handoff-chat-api.md)

---

## Summary

| Topic | Detail |
|-------|--------|
| Transport | Laravel **Reverb** (Pusher protocol) via **Laravel Echo** |
| Notifications | Push on `private-user.{userId}` → `.notification.created` |
| Government ID | Push on `private-user.{userId}` + admin `private-admin.verifications` |
| Tourism ads | Push on `private-user.{submitterId}` + admin `private-admin.tourism_ads` → `.tourism_ad.status_changed` |
| Engagements | Status on `private-user.{userId}` → `.engagement.status_changed` |
| Chat | Messages on `private-conversation.{id}` + participant user channels → `.message.sent` |
| REST inbox | `GET /me/conversations` (replaces engagement-only UX over time) |
| Fallback | Poll `GET /me/notifications?since=` if WebSocket unavailable |

**Deploy (backend)**

```bash
composer install
php artisan migrate
php artisan reverb:start   # or Supervisor — see deploy/supervisor/myticket-api-reverb.conf
```

---

## 1. Environment variables

### Backend (`.env`)

```env
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=myticket
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http

REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080
```

Generate keys: `php artisan reverb:install` or set manually (any random strings for local dev).

### Frontends (each Vite app)

```env
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST=127.0.0.1
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
VITE_API_URL=http://localhost:8000
```

Production: `REVERB_SCHEME=https`, `REVERB_PORT=443`, proxy WebSocket through Nginx to Reverb.

---

## 2. Install Echo (each frontend repo)

```bash
npm install laravel-echo pusher-js
```

### Shared bootstrap (`lib/realtime/echo.ts`)

Copy this module into each SPA and import once after login:

```typescript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo?: Echo<'reverb'>;
  }
}

window.Pusher = Pusher;

export function createEcho(token: string): Echo<'reverb'> {
  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${import.meta.env.VITE_API_URL}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });
}

export function disconnectEcho(): void {
  window.Echo?.disconnect();
  window.Echo = undefined;
}
```

---

## 3. Channel subscriptions

### 3.1 User channel (always on after login)

Subscribe once per session:

```typescript
window.Echo = createEcho(sanctumToken);

window.Echo.private(`user.${userId}`)
  .listen('.notification.created', (envelope) => {
    // envelope.type === 'notification.created'
    // envelope.payload = { id, kind, title, body, href, ... }
    refreshNotifications(envelope.payload);
  })
  .listen('.government_id.status_changed', (envelope) => {
    applyGovernmentIdStatus(envelope.payload);
  })
  .listen('.engagement.status_changed', (envelope) => {
    refreshEngagementOrConversation(envelope.payload);
  })
  .listen('.message.sent', (envelope) => {
    // Inbox badge when not on chat screen
    bumpConversationUnread(envelope.payload.conversation_id);
  });
```

### 3.2 Conversation channel (when chat thread is open)

```typescript
let activeConversationChannel: string | null = null;

function openConversation(conversationId: number) {
  if (activeConversationChannel) {
    window.Echo?.leave(activeConversationChannel);
  }
  activeConversationChannel = `conversation.${conversationId}`;
  window.Echo?.private(activeConversationChannel)
    .listen('.message.sent', (envelope) => {
      appendMessage(envelope.payload);
    });
}

function closeConversation() {
  if (activeConversationChannel) {
    window.Echo?.leave(activeConversationChannel);
    activeConversationChannel = null;
  }
}
```

### 3.3 Admin verifications queue

Admin dashboard only:

```typescript
window.Echo.private('admin.verifications')
  .listen('.government_id.status_changed', (envelope) => {
    refreshVerificationQueue(envelope.payload);
  });
```

---

## 4. Reconcile pattern (required)

WebSocket events are **hints**. Always reconcile with REST:

| Event | REST reconcile |
|-------|----------------|
| `.notification.created` | `GET /api/v1/{app}/me/notifications?since={iso}` |
| `.message.sent` | `GET /api/v1/{app}/me/conversations/{id}/messages?before_id=` |
| `.engagement.status_changed` | `GET /api/v1/{app}/me/conversations/{id}` or engagements API |
| `.government_id.status_changed` | `GET /api/v1/main/me/government-id-verification` |

On reconnect: re-subscribe channels + full inbox refresh.

### Stream endpoint hint

```
GET /api/v1/main/me/notifications/stream
```

When Reverb is enabled, returns:

```json
{
  "transport": "reverb",
  "channel": "private-user.42",
  "auth_endpoint": "https://api.example.com/broadcasting/auth",
  "fallback": {
    "transport": "polling",
    "path": "/me/notifications?since=<iso8601>"
  }
}
```

---

## 5. Unified conversations REST API

Base paths:

| App | Prefix |
|-----|--------|
| Main (talent/vendor/guest) | `/api/v1/main/me/conversations` |
| Organizer | `/api/v1/organizer/me/conversations` |

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me/conversations/unread-count` | Nav badge |
| GET | `/me/conversations` | Inbox (`?type=marketplace`, `?unread_only=1`) |
| POST | `/me/conversations` | Start marketplace thread (organizer) |
| GET | `/me/conversations/{id}` | Thread + participants |
| GET | `/me/conversations/{id}/messages` | History (`?before_id=`, `?limit=50`) |
| POST | `/me/conversations/{id}/messages` | Send message |
| POST | `/me/conversations/{id}/read` | Mark read (`{ "up_to_message_id": 99 }` optional) |

### Start conversation (organizer → talent/vendor)

```
POST /api/v1/organizer/me/conversations
```

```json
{
  "target_type": "talent",
  "target_id": 12,
  "topic": "Wedding singer",
  "brief": "Need a singer for June 20",
  "event_id": 5
}
```

Creates linked **engagement** + **conversation**. Legacy `/engagements` routes still work.

### Message payload

```json
{
  "id": 44,
  "conversation_id": 7,
  "sender_user_id": 3,
  "sender_role": "organizer",
  "body": "What is your rate?",
  "attachment_url": null,
  "read_at": null,
  "created_at": "2026-06-13T12:00:00+00:00"
}
```

### Realtime envelope shape (all events)

```json
{
  "type": "message.sent",
  "payload": { },
  "occurred_at": "2026-06-13T12:00:00+00:00"
}
```

Event names (listen with leading dot in Echo):

| `type` | Echo event |
|--------|------------|
| `notification.created` | `.notification.created` |
| `government_id.status_changed` | `.government_id.status_changed` |
| `engagement.status_changed` | `.engagement.status_changed` |
| `message.sent` | `.message.sent` |

---

## 6. Per-app wiring

| SPA | User channel | Conversations API | Notes |
|-----|--------------|-------------------|-------|
| Main / Talent / Vendor | `user.{id}` | `/api/v1/main/me/conversations` | Talent/vendor reply in threads |
| Organizer | `user.{id}` | `/api/v1/organizer/me/conversations` | Creates hiring threads |
| Admin | `user.{id}` + `admin.verifications` + `admin.tourism_ads` | Gov ID + tourism ad queue APIs | Verification + tourism review realtime |

Ensure origins in `SANCTUM_STATEFUL_DOMAINS` / CORS match [`config/frontends.php`](../../config/frontends.php).

---

## 7. Local development

```bash
# Terminal / composer dev (runs serve + queue + reverb + vite)
composer dev
```

Or separately:

```bash
php artisan serve
php artisan queue:listen
php artisan reverb:start
```

Echo connects to `ws://127.0.0.1:8080` with `REVERB_SCHEME=http`.

---

## 8. Production Nginx (WebSocket proxy)

```nginx
location /reverb {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_pass http://127.0.0.1:8080;
}
```

Set `REVERB_HOST` to public API host, `REVERB_SCHEME=https`, `REVERB_PORT=443`.

Supervisor: [`deploy/supervisor/myticket-api-reverb.conf`](../../deploy/supervisor/myticket-api-reverb.conf).

---

## 9. Migration from engagements-only UI

1. Replace engagement message screens with conversation components.
2. Use `conversation_id` from engagement-linked threads (context on conversation).
3. Keep accept/decline/complete on `/me/engagements/{id}/*` until ported.
4. Subscribe to `conversation.{id}` when thread UI mounts.

**Phase 2 (not yet):** support cases → `type=support` conversations.

---

## 10. Tests

- [`tests/Feature/Realtime/ReverbBroadcastTest.php`](../../tests/Feature/Realtime/ReverbBroadcastTest.php)
- [`tests/Feature/Realtime/ChannelAuthorizationTest.php`](../../tests/Feature/Realtime/ChannelAuthorizationTest.php)
- [`tests/Feature/Messaging/ConversationApiTest.php`](../../tests/Feature/Messaging/ConversationApiTest.php)
- [`tests/Feature/Messaging/EngagementAdapterTest.php`](../../tests/Feature/Messaging/EngagementAdapterTest.php)

---

## Related docs

- [`marketplace-gaps-and-solutions.md`](marketplace-gaps-and-solutions.md)
- [`docs/sprints/PHASE-12-engagements-and-ratings.md`](sprints/PHASE-12-engagements-and-ratings.md)
- [Laravel Broadcasting](https://laravel.com/docs/broadcasting)
- [Laravel Reverb](https://laravel.com/docs/reverb)
