import Dexie, { type EntityTable } from 'dexie';
import type {
  Campaign,
  Character,
  NotePage,
  SessionNote,
  Sheet,
  StoredBlob,
  Stroke,
} from './types';

/** Bumped when the shape of stored rows changes; see migrations in the constructor. */
export const SCHEMA_VERSION = 1;

export class RollForDB extends Dexie {
  // `declare` so class-field semantics don't overwrite the tables Dexie sets up.
  declare campaigns: EntityTable<Campaign, 'id'>;
  declare characters: EntityTable<Character, 'id'>;
  declare sheets: EntityTable<Sheet, 'id'>;
  declare sessionNotes: EntityTable<SessionNote, 'id'>;
  declare notePages: EntityTable<NotePage, 'id'>;
  declare strokes: EntityTable<Stroke, 'id'>;
  declare blobs: EntityTable<StoredBlob, 'id'>;

  constructor(name = 'rollfor') {
    super(name);
    // Every later change must be a new this.version(n).stores(...).upgrade(...) block.
    this.version(1).stores({
      campaigns: 'id, updatedAt, lastOpenedAt',
      characters: 'id, campaignId',
      sheets: 'id, characterId, kind',
      sessionNotes: 'id, campaignId, [campaignId+sessionDate], *tags',
      notePages: 'id, noteId',
      strokes: 'id, pageId, [pageId+z]',
      blobs: 'id',
    });
  }
}

export const db = new RollForDB();
