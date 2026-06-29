/** Local hero carousel — `/public/assets/Hero`. Theme is parsed from the filename prefix. */
export type HeroSlideTheme = 'tourism' | 'festival' | 'concert';

export interface HeroSlide {
  id: string;
  src: string;
  alt: string;
  theme: HeroSlideTheme;
}

const HERO_ASSET_BASE = '/assets/Hero';

const HERO_IMAGE_FILES = [
  'tourism-1.jpg',
  'tourism-2.jpg',
  'tourism-3.jpg',
  'concert-1.jpg',
  'concert-2.webp',
  'festival-1.jpg',
  'festival-2.jpg',
] as const;

function themeFromFilename(file: string): HeroSlideTheme {
  const prefix = file.split('-')[0];
  if (prefix === 'tourism' || prefix === 'festival' || prefix === 'concert') {
    return prefix;
  }
  return 'tourism';
}

function slideIdFromFile(file: string): string {
  return file.replace(/\.[^.]+$/, '');
}

export const HERO_SLIDES: HeroSlide[] = HERO_IMAGE_FILES.map((file) => {
  const id = slideIdFromFile(file);
  return {
    id,
    src: `${HERO_ASSET_BASE}/${file}`,
    alt: id.replace(/-/g, ' '),
    theme: themeFromFilename(file),
  };
});

/** @deprecated use HERO_SLIDES */
export const HERO_BACKGROUNDS = HERO_SLIDES;
