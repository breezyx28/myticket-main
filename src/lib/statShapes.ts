/** SVG assets under `/public/assets/shapes` — cycled globally in Stats section */
export const STAT_SHAPE_FILES = [
  '000074.svg',
  '000079.svg',
  '000092.svg',
  '000100.svg',
  '000181.svg',
  '000187.svg',
  '000218.svg',
  '000262.svg',
  '000324.svg',
  '000359.svg',
  '000441.svg',
  '000451.svg',
  '001126.svg',
] as const;

export function statShapeUrl(file: (typeof STAT_SHAPE_FILES)[number]) {
  return `/assets/shapes/${file}`;
}
