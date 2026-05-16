import type { ComponentType } from 'react';
import * as PhosphorIcons from '@phosphor-icons/react';
import { CalendarBlank, type IconProps } from '@phosphor-icons/react';

type PhosphorIconName = keyof typeof PhosphorIcons;

export type CategoryIconProps = IconProps & {
  iconKey: string | null | undefined;
};

/**
 * Renders a Phosphor icon by API `icon_key` (PascalCase export name, e.g. `MusicNotes`).
 */
export function CategoryIcon({ iconKey, ...props }: CategoryIconProps) {
  if (!iconKey?.trim()) {
    return <CalendarBlank {...props} />;
  }

  const Icon = PhosphorIcons[iconKey.trim() as PhosphorIconName];

  if (typeof Icon !== 'function' && (typeof Icon !== 'object' || Icon === null)) {
    if (import.meta.env.DEV) {
      console.warn(`Unknown Phosphor icon_key: ${iconKey}`);
    }
    return <CalendarBlank {...props} />;
  }

  const Resolved = Icon as ComponentType<IconProps>;
  return <Resolved {...props} />;
}
