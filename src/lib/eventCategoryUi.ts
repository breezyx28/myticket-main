import { CalendarBlank, Tag, type Icon } from '@phosphor-icons/react';
import type { EventCategoryRef } from '@/api/types/reference';
import { resolvePhosphorIcon } from '@/lib/phosphorIconRegistry';

export type CategoryTileVisual = { icon: Icon; color: string };

const DEFAULT_ICON: Icon = CalendarBlank;
const DEFAULT_TILE_COLOR = 'bg-ink-10 text-ink';

/**
 * Maps API `color_token` (semantic or hue name) to category tile Tailwind classes
 * using the site palette — never raw CSS colors like `purple-500`.
 */
const COLOR_TOKEN_TO_TILE: Record<string, string> = {
  // Admin / handoff semantic tokens
  primary: 'bg-coral text-white',
  accent: 'bg-lemon text-ink',
  secondary: 'bg-sky text-ink',
  success: 'bg-lime text-ink',
  warning: 'bg-amber text-ink',
  info: 'bg-sky text-ink',
  neutral: 'bg-ink-10 text-ink',
  danger: 'bg-coral text-white',
  // Theme color names (as stored in DB)
  coral: 'bg-coral text-white',
  lemon: 'bg-lemon text-ink',
  lime: 'bg-lime text-ink',
  sky: 'bg-sky text-ink',
  lavender: 'bg-lavender text-ink',
  mint: 'bg-mint text-ink',
  teal: 'bg-teal text-ink',
  amber: 'bg-amber text-ink',
  blush: 'bg-blush text-ink',
  indigo: 'bg-indigo text-white',
  ink: 'bg-ink-10 text-ink',
  // Common hue aliases → nearest theme token
  purple: 'bg-lavender text-ink',
  violet: 'bg-lavender text-ink',
  pink: 'bg-blush text-ink',
  rose: 'bg-blush text-ink',
  red: 'bg-coral text-white',
  orange: 'bg-amber text-ink',
  yellow: 'bg-lemon text-ink',
  green: 'bg-lime text-ink',
  blue: 'bg-sky text-ink',
  cyan: 'bg-mint text-ink',
  turquoise: 'bg-teal text-ink',
  gray: 'bg-ink-10 text-ink',
  grey: 'bg-ink-10 text-ink',
};

/** Legacy slug → tile colors when `color_token` is missing. */
const STYLE_BY_SLUG: Record<string, string> = {
  music: 'bg-coral text-white',
  concerts: 'bg-coral text-white',
  festivals: 'bg-lemon text-ink',
  sports: 'bg-lime text-ink',
  arts: 'bg-sky text-ink',
  'arts-and-culture': 'bg-sky text-ink',
  cultural: 'bg-sky text-ink',
  comedy: 'bg-lemon text-ink',
  online: 'bg-mint text-ink',
  esports: 'bg-mint text-ink',
  family: 'bg-teal text-ink',
  food: 'bg-amber text-ink',
  food_drink: 'bg-amber text-ink',
  'food-and-drink': 'bg-amber text-ink',
  fashion: 'bg-blush text-ink',
  tech: 'bg-indigo text-white',
  theatre: 'bg-lavender text-ink',
  theater: 'bg-lavender text-ink',
  conferences: 'bg-lavender text-ink',
  workshops: 'bg-amber text-ink',
  exhibitions: 'bg-sky text-ink',
  religious: 'bg-teal text-ink',
  motorsport: 'bg-lime text-ink',
  charity: 'bg-blush text-ink',
};

function normalizeColorToken(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase().replace(/_/g, '-');
}

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/-/g, '_');
}

/**
 * Tile background + text classes from `color_token`, with optional slug fallback.
 */
export function categoryTileColorClasses(
  colorToken: string | null | undefined,
  slugFallback?: string,
): string {
  const key = normalizeColorToken(colorToken);
  if (key && COLOR_TOKEN_TO_TILE[key]) {
    return COLOR_TOKEN_TO_TILE[key];
  }
  if (slugFallback) {
    const slugKey = normalizeSlug(slugFallback);
    return STYLE_BY_SLUG[slugKey] ?? DEFAULT_TILE_COLOR;
  }
  return DEFAULT_TILE_COLOR;
}

/** Resolves API `icon_key` to a Phosphor component for `CategoryTile`. */
export function resolveCategoryIcon(
  iconKey: string | null | undefined,
  slugFallback?: string,
): Icon {
  return resolvePhosphorIcon(iconKey, DEFAULT_ICON, slugFallback);
}

/** @deprecated Prefer `categoryTileVisualForCategory` with API fields. */
export function categoryTileVisualForSlug(slug: string): CategoryTileVisual {
  const key = normalizeSlug(slug);
  return {
    icon: Tag,
    color: STYLE_BY_SLUG[key] ?? DEFAULT_TILE_COLOR,
  };
}

/** Full tile styling from `GET /events/categories` row. */
export function categoryTileVisualForCategory(
  cat: Pick<EventCategoryRef, 'slug' | 'icon_key' | 'color_token'>,
): CategoryTileVisual {
  return {
    icon: resolveCategoryIcon(cat.icon_key, cat.slug),
    color: categoryTileColorClasses(cat.color_token, cat.slug),
  };
}

export function parseCategoryEventsCount(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}
