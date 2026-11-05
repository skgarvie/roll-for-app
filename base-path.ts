/**
 * Public base path the app is served from, read from BASE_PATH.
 * e.g. "RollFor" or "/RollFor" -> "/RollFor/" (GitHub Pages project site).
 * Unset or empty -> "/".
 */
export function basePath(value = process.env.BASE_PATH): string {
  const trimmed = (value ?? '').replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}
