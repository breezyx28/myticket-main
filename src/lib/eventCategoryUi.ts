import {
  Cpu,
  ForkKnife,
  Microphone,
  Monitor,
  MusicNote,
  Palette,
  Smiley,
  Tag,
  TShirt,
  Trophy,
  Users,
  type Icon,
} from '@phosphor-icons/react';

export type CategoryTileVisual = { icon: Icon; color: string };

/**
 * Public `GET /events/categories` does not return `icon_key` / `color_token`;
 * the main app maps known slugs to tile visuals. Unknown slugs use a neutral
 * default so the grid never breaks when admins add categories.
 */
const STYLE_BY_SLUG: Record<string, CategoryTileVisual> = {
  music: { icon: MusicNote, color: 'bg-coral text-white' },
  sports: { icon: Trophy, color: 'bg-lime text-ink' },
  arts: { icon: Palette, color: 'bg-sky text-ink' },
  'arts-and-culture': { icon: Palette, color: 'bg-sky text-ink' },
  comedy: { icon: Smiley, color: 'bg-lemon text-ink' },
  online: { icon: Monitor, color: 'bg-mint text-ink' },
  family: { icon: Users, color: 'bg-teal text-ink' },
  food: { icon: ForkKnife, color: 'bg-amber text-ink' },
  'food-and-drink': { icon: ForkKnife, color: 'bg-amber text-ink' },
  fashion: { icon: TShirt, color: 'bg-blush text-ink' },
  tech: { icon: Cpu, color: 'bg-indigo text-white' },
  theatre: { icon: Microphone, color: 'bg-lavender text-ink' },
};

const DEFAULT_STYLE: CategoryTileVisual = { icon: Tag, color: 'bg-ink-10 text-ink' };

export function categoryTileVisualForSlug(slug: string): CategoryTileVisual {
  const key = slug.trim().toLowerCase();
  return STYLE_BY_SLUG[key] ?? DEFAULT_STYLE;
}

export function parseCategoryEventsCount(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}
