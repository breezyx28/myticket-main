import { HERO_SLIDES } from '@/data/heroBackgrounds';

/** ponytail: module-level warm cache; upgrade path is service worker if offline hero matters */
const loaded = new Set<string>();

export function preloadHeroImages(): void {
  if (typeof window === 'undefined') return;
  for (const slide of HERO_SLIDES) {
    if (loaded.has(slide.src)) continue;
    loaded.add(slide.src);
    const img = new Image();
    img.decoding = 'async';
    img.src = slide.src;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = slide.src;
    document.head.append(link);
  }
}
