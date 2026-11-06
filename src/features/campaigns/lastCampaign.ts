const LAST_CAMPAIGN_KEY = 'rollfor:last-campaign';
const LAUNCHED_KEY = 'rollfor:launched';

export function rememberLastCampaign(id: string): void {
  try {
    localStorage.setItem(LAST_CAMPAIGN_KEY, id);
  } catch {
    // storage blocked; not critical
  }
}

/**
 * Decided once per page load: reopen the last campaign only if this is a fresh
 * app launch (sessionStorage is cleared when the app is relaunched, but not on
 * reload) that started on the campaign list. Launching on a deep link, or
 * navigating back to the list later, never redirects.
 */
let launchCampaign: string | undefined = (() => {
  try {
    const firstLoadThisSession = !sessionStorage.getItem(LAUNCHED_KEY);
    sessionStorage.setItem(LAUNCHED_KEY, '1');
    const base = import.meta.env.BASE_URL;
    const startedOnList =
      window.location.pathname === base || window.location.pathname === base.replace(/\/$/, '');
    return firstLoadThisSession && startedOnList
      ? (localStorage.getItem(LAST_CAMPAIGN_KEY) ?? undefined)
      : undefined;
  } catch {
    return undefined;
  }
})();

/** Returns the campaign to reopen on launch, at most once. */
export function takeLaunchCampaign(): string | undefined {
  const id = launchCampaign;
  launchCampaign = undefined;
  return id;
}
