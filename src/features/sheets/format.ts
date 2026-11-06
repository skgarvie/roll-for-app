import { formatModifier } from '@/domain/derive';

export type StatFormat = 'modifier' | 'number' | 'feet';

export function formatStat(n: number, format: StatFormat): string {
  if (format === 'modifier') return formatModifier(n);
  if (format === 'feet') return `${n} ft`;
  return String(n);
}
