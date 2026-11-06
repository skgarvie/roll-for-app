import type { CoreSheetData } from '@/domain/character';
import { db } from '../db';
import { DEFAULT_SHEETS } from '../defaultSheets';
import { newEntity, requiredText, ValidationError } from '../entity';
import { newId } from '../ids';
import type { Character, ID, Sheet } from '../types';

export interface NewCharacterInput {
  name: string;
  /** Rules data from the creation wizard. Omitted for a blank sheet. */
  core?: CoreSheetData;
}

export class ActiveCharacterExistsError extends Error {
  override name = 'ActiveCharacterExistsError';
  constructor() {
    super('This campaign already has an active character. Archive or replace it first.');
  }
}

export class NotFoundError extends Error {
  override name = 'NotFoundError';
}

const isActive = (c: Character) => c.archivedAt === undefined;

export async function getActiveCharacter(campaignId: ID): Promise<Character | undefined> {
  return db.characters.where('campaignId').equals(campaignId).filter(isActive).first();
}

export async function getArchivedCharacters(campaignId: ID): Promise<Character[]> {
  const all = await db.characters.where('campaignId').equals(campaignId).toArray();
  return all.filter((c) => !isActive(c)).sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
}

/**
 * Inserts a character with the default sheets. Callers must already be inside a
 * transaction that covers characters + sheets and must have checked the
 * one-active-character rule.
 */
async function insertNewCharacter(campaignId: ID, input: NewCharacterInput): Promise<ID> {
  const name = requiredText(input.name, 'Character name');
  const now = Date.now();
  const character: Character = { ...newEntity(now), campaignId, name, sheetOrder: [] };
  const sheets: Sheet[] = DEFAULT_SHEETS.map(({ kind, title }) => ({
    ...newEntity(now),
    characterId: character.id,
    kind,
    title,
    data:
      kind === 'core' && input.core
        ? (structuredClone(input.core) as unknown as Sheet['data'])
        : {},
  }));
  character.sheetOrder = sheets.map((s) => s.id);
  await db.characters.add(character);
  await db.sheets.bulkAdd(sheets);
  return character.id;
}

/**
 * Deep-copies a character (sheets and portrait) into a campaign as its active
 * character. Must run inside a transaction covering characters, sheets and blobs.
 */
export async function insertCharacterCopy(campaignId: ID, sourceId: ID): Promise<ID> {
  const source = await db.characters.get(sourceId);
  if (!source) throw new NotFoundError('The character to copy no longer exists.');
  const sourceSheets = await db.sheets.where('characterId').equals(sourceId).toArray();

  const now = Date.now();
  const characterId = newId();
  const sheetIdMap = new Map<ID, ID>();
  const sheets: Sheet[] = sourceSheets.map((sheet) => {
    const copy: Sheet = {
      ...structuredClone(sheet),
      ...newEntity(now),
      characterId,
    };
    sheetIdMap.set(sheet.id, copy.id);
    return copy;
  });

  let portraitBlobId: ID | undefined;
  if (source.portraitBlobId) {
    const blob = await db.blobs.get(source.portraitBlobId);
    if (blob) {
      portraitBlobId = newId();
      await db.blobs.add({ ...blob, id: portraitBlobId });
    }
  }

  const character: Character = {
    ...structuredClone(source),
    ...newEntity(now),
    id: characterId,
    campaignId,
    archivedAt: undefined,
    portraitBlobId,
    sheetOrder: source.sheetOrder.flatMap((id) => sheetIdMap.get(id) ?? []),
    activeFormSheetId: source.activeFormSheetId
      ? sheetIdMap.get(source.activeFormSheetId)
      : undefined,
  };
  await db.characters.add(character);
  await db.sheets.bulkAdd(sheets);
  return characterId;
}

/** Creates the campaign's active character. Fails if one already exists. */
export async function createCharacter(campaignId: ID, input: NewCharacterInput): Promise<ID> {
  return db.transaction('rw', [db.campaigns, db.characters, db.sheets], async () => {
    if (!(await db.campaigns.get(campaignId))) throw new NotFoundError('Campaign not found.');
    if (await getActiveCharacter(campaignId)) throw new ActiveCharacterExistsError();
    return insertNewCharacter(campaignId, input);
  });
}

/** Archives the current active character (if any) and creates a new one. */
export async function replaceActiveCharacter(
  campaignId: ID,
  input: NewCharacterInput,
): Promise<ID> {
  requiredText(input.name, 'Character name');
  return db.transaction('rw', [db.campaigns, db.characters, db.sheets], async () => {
    if (!(await db.campaigns.get(campaignId))) throw new NotFoundError('Campaign not found.');
    const current = await getActiveCharacter(campaignId);
    const now = Date.now();
    if (current) await db.characters.update(current.id, { archivedAt: now, updatedAt: now });
    return insertNewCharacter(campaignId, input);
  });
}

/** Makes an archived character active again, archiving the current one. */
export async function makeCharacterActive(characterId: ID): Promise<void> {
  await db.transaction('rw', db.characters, async () => {
    const target = await db.characters.get(characterId);
    if (!target) throw new NotFoundError('Character not found.');
    if (isActive(target)) return;
    const current = await getActiveCharacter(target.campaignId);
    const now = Date.now();
    if (current) await db.characters.update(current.id, { archivedAt: now, updatedAt: now });
    await db.characters.update(characterId, { archivedAt: undefined, updatedAt: now });
  });
}

export async function renameCharacter(characterId: ID, name: string): Promise<void> {
  const trimmed = requiredText(name, 'Character name');
  const updated = await db.characters.update(characterId, {
    name: trimmed,
    updatedAt: Date.now(),
  });
  if (!updated) throw new NotFoundError('Character not found.');
}

/** Permanently deletes an archived character and its sheets. The active one can't be deleted. */
export async function deleteArchivedCharacter(characterId: ID): Promise<void> {
  await db.transaction('rw', [db.characters, db.sheets, db.blobs], async () => {
    const character = await db.characters.get(characterId);
    if (!character) return;
    if (isActive(character)) {
      throw new ValidationError('The active character can’t be deleted. Replace it first.');
    }
    await db.sheets.where('characterId').equals(characterId).delete();
    if (character.portraitBlobId) await db.blobs.delete(character.portraitBlobId);
    await db.characters.delete(characterId);
  });
}

/** Replaces a sheet's data (autosave). */
export async function updateSheetData(sheetId: ID, data: Sheet['data']): Promise<void> {
  const updated = await db.sheets.update(sheetId, { data, updatedAt: Date.now() });
  if (!updated) throw new NotFoundError('Sheet not found.');
}

/** Sheets for a character in tab order (falls back to creation order for strays). */
export function orderSheets(character: Character, sheets: Sheet[]): Sheet[] {
  const rank = new Map(character.sheetOrder.map((id, i) => [id, i]));
  return [...sheets].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
      a.createdAt - b.createdAt,
  );
}
