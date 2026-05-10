import { STAT_SHAPE_FILES, statShapeUrl } from '@/lib/statShapes';

let cached: string[] | null = null;

/** Concatenate all <path d="..."> from an SVG into one compound path for flubber. */
export function extractCompoundPath(svgText: string): string {
  const matches = [...svgText.matchAll(/<path[^>]*\sd="([^"]*)"/gi)];
  const ds = matches.map((m) => m[1].trim()).filter(Boolean);
  if (ds.length === 0) return 'M0,0 L100,0 L100,100 L0,100 Z';
  return ds.join(' ');
}

export async function loadAllStatShapePaths(): Promise<string[]> {
  if (cached) return cached;

  const paths = await Promise.all(
    STAT_SHAPE_FILES.map(async (file) => {
      const res = await fetch(statShapeUrl(file));
      if (!res.ok) throw new Error(`Failed to load ${file}`);
      const text = await res.text();
      return extractCompoundPath(text);
    })
  );

  cached = paths;
  return paths;
}
