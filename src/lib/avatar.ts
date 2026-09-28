/** Deterministic placeholder tone 1–6 for an id (event or user), see DESIGN.md §5 Avatar. */
export function placeholderIndex(id: string | null | undefined): 1 | 2 | 3 | 4 | 5 | 6 {
  if (!id) return 1;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}

export const PLACEHOLDER_BG_CLASSES = ['bg-ph-1', 'bg-ph-2', 'bg-ph-3', 'bg-ph-4', 'bg-ph-5', 'bg-ph-6'] as const;

export function placeholderClass(id: string | null | undefined): string {
  return PLACEHOLDER_BG_CLASSES[placeholderIndex(id) - 1];
}

/** Two initials from a display name / title: "Sigur Rós" → "SR", "Björk" → "BJ". */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
