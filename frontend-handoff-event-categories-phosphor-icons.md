# Frontend handoff: event categories + Phosphor icons

How to load category chips/filters from the main API and render icons with [`@phosphor-icons/react`](https://phosphoricons.com).

**Base path:** `https://<host>/api/v1/main`  
**Auth:** none (public)

---

## 1. API endpoint

```http
GET /api/v1/main/events/categories
```

**Response:** `{ "data": [ … ] }`

Each item:

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Use for event list filter: `GET /api/v1/main/events?category={id}` |
| `slug` | string | Stable key (`concerts`, `sports`, …) — analytics, routes |
| `name` | string | English label (`name_en` in DB) |
| `name_ar` | string | Arabic label |
| `icon_key` | string \| null | **Exact** Phosphor React export name (PascalCase), e.g. `MusicNotes` |
| `color_token` | string \| null | Design token for your theme (`primary`, `accent`, …) — not a Phosphor name |
| `events_count` | number | Published events in this category (non-deleted) |

**Example:**

```json
{
  "data": [
    {
      "id": 1,
      "slug": "concerts",
      "name": "Concerts",
      "name_ar": "حفلات",
      "icon_key": "MusicNotes",
      "color_token": "primary",
      "events_count": 1
    }
  ]
}
```

Only **active** categories are returned, ordered by `display_order` then `name`.

---

## 2. What `icon_key` must be

`icon_key` is **not** a file URL and **not** kebab-case (`music-notes`). It must match a **named export** from `@phosphor-icons/react`:

```tsx
import { MusicNotes } from '@phosphor-icons/react';
//              ^^^^^^^^^^ same string as API icon_key
```

Verify names in your installed package:

- [phosphoricons.com](https://phosphoricons.com)
- Or `node_modules/@phosphor-icons/react/dist/index.d.ts`

### Seeded mapping (reference)

| `slug` | `icon_key` |
|--------|------------|
| concerts | `MusicNotes` |
| festivals | `Confetti` |
| sports | `Trophy` |
| theater | `MaskHappy` |
| comedy | `Smiley` |
| conferences | `Microphone` |
| workshops | `Hammer` |
| exhibitions | `Images` |
| family | `UsersThree` |
| food_drink | `ForkKnife` |
| religious | `Mosque` |
| cultural | `GlobeHemisphereWest` |
| motorsport | `Car` |
| esports | `GameController` |
| charity | `Heart` |

Backend source: `database/seeders/Reference/EventCategoriesSeeder.php`. Re-run on the server to refresh DB values:

```bash
php artisan db:seed --class=Database\\Seeders\\Reference\\EventCategoriesSeeder
```

---

## 3. Install Phosphor (main website)

```bash
npm install @phosphor-icons/react
```

---

## 4. Dynamic icon component (recommended)

Import the full icon map once, then resolve by `icon_key`:

```tsx
import * as PhosphorIcons from '@phosphor-icons/react';
import type { IconProps } from '@phosphor-icons/react';

type PhosphorIconName = keyof typeof PhosphorIcons;

type CategoryIconProps = IconProps & {
  iconKey: string | null | undefined;
};

export function CategoryIcon({ iconKey, ...props }: CategoryIconProps) {
  if (!iconKey) {
    return null;
  }

  const Icon = PhosphorIcons[iconKey as PhosphorIconName];

  if (typeof Icon !== 'function' && typeof Icon !== 'object') {
    if (import.meta.env.DEV) {
      console.warn(`Unknown Phosphor icon_key: ${iconKey}`);
    }
    return null;
  }

  return <Icon {...props} />;
}
```

**Usage:**

```tsx
<CategoryIcon iconKey={category.icon_key} size={24} weight="duotone" />
```

---

## 5. Typed category model (TypeScript)

```ts
export type EventCategoryListItem = {
  id: number;
  slug: string;
  name: string;
  name_ar: string;
  icon_key: string | null;
  color_token: string | null;
  events_count: number;
};

export type EventCategoriesResponse = {
  data: EventCategoryListItem[];
};
```

---

## 6. `color_token` (theme, not Phosphor)

`color_token` is a **semantic token** stored by admin/seed (`primary`, `accent`, `success`, `warning`, `info`, `neutral`, `danger`). Map it in your design system, for example:

```tsx
const categoryColorClass: Record<string, string> = {
  primary: 'text-primary',
  accent: 'text-accent',
  success: 'text-green-600',
  warning: 'text-amber-600',
  info: 'text-sky-600',
  neutral: 'text-muted-foreground',
  danger: 'text-red-600',
};

function categoryColorClassName(token: string | null): string {
  return (token && categoryColorClass[token]) ?? 'text-muted-foreground';
}
```

```tsx
<CategoryIcon
  iconKey={category.icon_key}
  className={categoryColorClassName(category.color_token)}
  size={22}
/>
```

---

## 7. Fetching categories + filtering events

```ts
const res = await fetch(`${API_BASE}/api/v1/main/events/categories`);
const { data: categories } = (await res.json()) as EventCategoriesResponse;

// Filter discover feed by category id (not slug):
const eventsRes = await fetch(
  `${API_BASE}/api/v1/main/events?category=${selectedCategoryId}`,
);
```

---

## 8. Admin: changing icons without a deploy

Organizers/admins can patch categories (admin API):

```http
PATCH /api/v1/admin/event-categories/{id}
Authorization: Bearer <admin token>
Content-Type: application/json

{
  "icon_key": "MicrophoneStage",
  "color_token": "accent"
}
```

`icon_key` must still be a valid Phosphor export name if the main site uses Phosphor dynamically.

---

## 9. Fallbacks

| Situation | Suggested UI |
|-----------|------------|
| `icon_key` is `null` | Hide icon or use a default e.g. `CalendarBlank` |
| `icon_key` unknown (typo / old DB) | Log in dev, show default icon |
| `events_count === 0` | Still show category; optionally de-emphasize in UI |

---

## 10. RTL / Arabic

Use `name_ar` when locale is Arabic; `slug` and `id` are locale-independent. Icon components are direction-neutral; only labels flip with layout.
