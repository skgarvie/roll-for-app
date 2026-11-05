/** True when launched from the Home Screen (iOS) or as an installed PWA. */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * iPadOS reports itself as "Macintosh" by default, so also check for touch.
 */
export function isIOSLike(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}
