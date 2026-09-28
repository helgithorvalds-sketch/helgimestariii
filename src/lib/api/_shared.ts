/** Small helpers shared by the api modules (not part of the public contract). */

export function uniq<T>(values: (T | null | undefined)[]): T[] {
  return Array.from(new Set(values.filter((v): v is T => v != null)));
}

/**
 * Quote a value for PostgREST `.or()` filters so commas, parentheses and
 * quotes in user input do not break the filter grammar.
 */
export function orValue(v: string): string {
  return '"' + v.replace(/[\\"]/g, '\\$&') + '"';
}

/** `%foo%` for ilike, with the SQL wildcard characters in user input escaped. */
export function ilikePattern(q: string): string {
  return '%' + q.trim().replace(/[%_\\]/g, '\\$&') + '%';
}

export function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5 && /^[a-z0-9]+$/.test(fromName)) return fromName === 'jpeg' ? 'jpg' : fromName;
  switch (file.type) {
    case 'application/pdf':
      return 'pdf';
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

export async function sha256Hex(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
