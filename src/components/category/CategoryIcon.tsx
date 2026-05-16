import { createElement, useEffect, useMemo, useState } from 'react';
import { CalendarBlank, type Icon, type IconProps } from '@phosphor-icons/react';
import {
  isStaticPhosphorIconKey,
  loadPhosphorIconAsync,
  resolvePhosphorIconSync,
} from '@/lib/phosphorIconRegistry';

export type CategoryIconProps = IconProps & {
  iconKey: string | null | undefined;
  /** Used when `icon_key` is missing or fails to resolve. */
  slugFallback?: string;
};

/**
 * Renders a Phosphor icon by API `icon_key` (PascalCase export name, e.g. `MusicNotes`).
 */
export function CategoryIcon({ iconKey, slugFallback, ...props }: CategoryIconProps) {
  const syncIcon = useMemo(
    () => resolvePhosphorIconSync(iconKey, slugFallback, CalendarBlank),
    [iconKey, slugFallback],
  );

  const needsDynamicLoad = Boolean(iconKey?.trim()) && !isStaticPhosphorIconKey(iconKey);
  const [dynamicIcon, setDynamicIcon] = useState<Icon | null>(null);

  useEffect(() => {
    if (!needsDynamicLoad || !iconKey?.trim()) return;

    let cancelled = false;
    void loadPhosphorIconAsync(iconKey.trim(), slugFallback, CalendarBlank).then((loaded) => {
      if (!cancelled) setDynamicIcon(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [iconKey, slugFallback, needsDynamicLoad]);

  const displayIcon = needsDynamicLoad ? (dynamicIcon ?? CalendarBlank) : syncIcon;

  return createElement(displayIcon, props);
}
