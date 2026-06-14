import {
  CalendarBlank,
  Car,
  Confetti,
  ForkKnife,
  GameController,
  GlobeHemisphereWest,
  Hammer,
  Heart,
  Images,
  MaskHappy,
  Microphone,
  Mosque,
  MusicNotes,
  Smiley,
  Trophy,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react';

/** Seeded + common API `icon_key` values (PascalCase Phosphor export names). */
const ICON_BY_KEY: Record<string, Icon> = {
  MusicNotes,
  Confetti,
  Trophy,
  MaskHappy,
  Smiley,
  Microphone,
  Hammer,
  Images,
  UsersThree,
  ForkKnife,
  Mosque,
  GlobeHemisphereWest,
  Car,
  GameController,
  Heart,
  CalendarBlank,
};

/** When `icon_key` is missing, map slug → icon (handoff seeder). */
const ICON_BY_SLUG: Record<string, Icon> = {
  concerts: MusicNotes,
  festivals: Confetti,
  sports: Trophy,
  theater: MaskHappy,
  theatre: MaskHappy,
  comedy: Smiley,
  conferences: Microphone,
  workshops: Hammer,
  exhibitions: Images,
  family: UsersThree,
  food_drink: ForkKnife,
  'food-and-drink': ForkKnife,
  food: ForkKnife,
  religious: Mosque,
  cultural: GlobeHemisphereWest,
  motorsport: Car,
  esports: GameController,
  charity: Heart,
  music: MusicNotes,
  arts: Images,
  online: GameController,
  tech: GameController,
  fashion: Heart,
  // Shorthand keys some API rows send instead of PascalCase Phosphor export names.
  sparkles: Confetti,
  mask: MaskHappy,
  smile: Smiley,
  mic: Microphone,
  gallery: Images,
  utensils: ForkKnife,
  globe: GlobeHemisphereWest,
  gamepad: GameController,
};

const dynamicIconCache = new Map<string, Icon>();

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/-/g, '_');
}

/** `music_notes` / `music-notes` → `MusicNotes` */
export function normalizePhosphorIconKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (ICON_BY_KEY[trimmed]) return trimmed;
  const parts = trimmed.split(/[-_\s]+/).filter(Boolean);
  if (parts.length === 0) return trimmed;
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
}

export function isStaticPhosphorIconKey(iconKey: string | null | undefined): boolean {
  if (!iconKey?.trim()) return false;
  if (ICON_BY_SLUG[normalizeSlug(iconKey)]) return true;
  const normalized = normalizePhosphorIconKey(iconKey);
  return Boolean(normalized && ICON_BY_KEY[normalized]);
}

function resolveKnownPhosphorIcon(
  iconKey: string | null | undefined,
  slugFallback: string | undefined,
): Icon | null {
  if (iconKey?.trim()) {
    const aliasIcon = ICON_BY_SLUG[normalizeSlug(iconKey)];
    if (aliasIcon) return aliasIcon;
    const normalized = normalizePhosphorIconKey(iconKey);
    if (normalized && ICON_BY_KEY[normalized]) {
      return ICON_BY_KEY[normalized];
    }
    if (normalized && dynamicIconCache.has(normalized)) {
      return dynamicIconCache.get(normalized)!;
    }
  }
  if (slugFallback) {
    const slugIcon = ICON_BY_SLUG[normalizeSlug(slugFallback)];
    if (slugIcon) return slugIcon;
  }
  return null;
}

export function resolvePhosphorIconSync(
  iconKey: string | null | undefined,
  slugFallback: string | undefined,
  fallback: Icon,
): Icon {
  return resolveKnownPhosphorIcon(iconKey, slugFallback) ?? fallback;
}

/**
 * Loads icons not in the static map (admin-patched keys). Vite code-splits per icon file.
 */
export async function loadPhosphorIconAsync(
  iconKey: string,
  slugFallback: string | undefined,
  fallback: Icon,
): Promise<Icon> {
  const known = resolveKnownPhosphorIcon(iconKey, slugFallback);
  if (known) return known;

  const normalized = normalizePhosphorIconKey(iconKey);
  if (!normalized) {
    return resolvePhosphorIconSync(null, slugFallback, fallback);
  }

  try {
    const mod = (await import(
      /* @vite-ignore */
      `@phosphor-icons/react/dist/csr/${normalized}.es.js`
    )) as Record<string, Icon>;
    const Icon = mod[normalized] ?? mod[`${normalized}Icon`];
    if (Icon) {
      dynamicIconCache.set(normalized, Icon);
      ICON_BY_KEY[normalized] = Icon;
      return Icon;
    }
  } catch {
    /* fall through */
  }

  if (import.meta.env.DEV) {
    console.warn(`Unknown Phosphor icon_key: ${iconKey}`);
  }
  return resolvePhosphorIconSync(null, slugFallback, fallback);
}

export function resolvePhosphorIcon(
  iconKey: string | null | undefined,
  fallback: Icon,
  slugFallback?: string,
): Icon {
  return resolvePhosphorIconSync(iconKey, slugFallback, fallback);
}
