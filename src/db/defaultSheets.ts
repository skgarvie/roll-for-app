import type { SheetKind } from './types';

/** Sheets every new character starts with, in tab order. Forms are added on demand (M5). */
export const DEFAULT_SHEETS: readonly { kind: SheetKind; title: string }[] = [
  { kind: 'core', title: 'Core' },
  { kind: 'combat', title: 'Combat' },
  { kind: 'spells', title: 'Spells' },
  { kind: 'inventory', title: 'Inventory' },
  { kind: 'features', title: 'Features & Traits' },
  { kind: 'backstory', title: 'Backstory' },
];
