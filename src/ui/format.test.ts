import { formatRelative } from './format';

describe('formatRelative', () => {
  const now = new Date('2026-11-05T12:00:00Z').getTime();

  it('says "just now" for under a minute', () => {
    expect(formatRelative(now - 30_000, now)).toBe('just now');
  });

  it('uses the largest whole unit', () => {
    expect(formatRelative(now - 5 * 60_000, now)).toMatch(/5 minutes ago/);
    expect(formatRelative(now - 3 * 24 * 3_600_000, now)).toMatch(/3 days ago/);
  });
});
