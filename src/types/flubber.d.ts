declare module 'flubber' {
  export function interpolate(
    fromShape: string | [number, number][],
    toShape: string | [number, number][],
    options?: { maxSegmentLength?: number; string?: boolean }
  ): (t: number) => string;
}
