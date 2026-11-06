export type ID = string;

/** Fields every stored entity has. Timestamps are epoch milliseconds. */
export interface Entity {
  id: ID;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
}

export interface Campaign extends Entity {
  name: string;
  description?: string;
  dmName?: string;
  coverBlobId?: ID;
  /** Set when archived. IndexedDB can't index booleans, so we store a timestamp. */
  archivedAt?: number;
  /** Last time the campaign was opened; used for list ordering. Doesn't bump updatedAt. */
  lastOpenedAt?: number;
}

/**
 * At most one non-archived character per campaign (enforced in the character repo).
 * Archived characters are earlier PCs (dead or retired) kept for reference.
 */
export interface Character extends Entity {
  campaignId: ID;
  name: string;
  portraitBlobId?: ID;
  archivedAt?: number;
  /** Ordered Sheet ids. */
  sheetOrder: ID[];
  /** Set while the character is in an alternate form (M5). */
  activeFormSheetId?: ID;
}

export type SheetKind =
  'core' | 'combat' | 'spells' | 'inventory' | 'features' | 'backstory' | 'custom' | 'form';

export interface Sheet extends Entity {
  characterId: ID;
  kind: SheetKind;
  title: string;
  /** Kind-specific data. Typed per kind from M2 onwards. */
  data: Record<string, unknown>;
}

export interface SessionNote extends Entity {
  campaignId: ID;
  title: string;
  /** ISO date (YYYY-MM-DD). */
  sessionDate: string;
  sessionNumber?: number;
  pageIds: ID[];
  thumbnailBlobId?: ID;
  tags: string[];
}

export interface NotePage extends Entity {
  noteId: ID;
  width: number;
  height: number;
  background: 'blank' | 'lined' | 'grid' | 'dot';
  textBlocks: { id: ID; x: number; y: number; w: number; html: string }[];
}

export interface Stroke {
  id: ID;
  pageId: ID;
  tool: 'pen' | 'highlighter';
  color: string;
  size: number;
  opacity: number;
  /** Packed [x, y, pressure, x, y, pressure, ...]. */
  points: Float32Array;
  bbox: [minX: number, minY: number, maxX: number, maxY: number];
  z: number;
}

export interface StoredBlob {
  id: ID;
  mime: string;
  data: Blob;
}
