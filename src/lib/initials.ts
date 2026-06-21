/** Two-letter initials from a display name (e.g. "Sara Ali" → "SA"). */

export function initialsFromName(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

export function isProfileImageUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:image/') || v.startsWith('blob:');
}
