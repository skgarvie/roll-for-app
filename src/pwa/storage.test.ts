import { formatBytes } from './storage';

describe('formatBytes', () => {
  it('formats undefined as a dash', () => {
    expect(formatBytes(undefined)).toBe('—');
  });

  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
