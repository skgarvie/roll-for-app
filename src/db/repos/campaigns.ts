import { db } from '../db';
import { newEntity, optionalText, requiredText } from '../entity';
import type { Campaign, ID } from '../types';
import {
  insertCharacterCopy,
  NotFoundError,
  replaceActiveCharacter,
  type NewCharacterInput,
} from './characters';

export interface CampaignInput {
  name: string;
  description?: string;
  dmName?: string;
}

export type InitialCharacter =
  ({ kind: 'new' } & NewCharacterInput) | { kind: 'copy'; characterId: ID };

function cleanCampaignInput(
  input: CampaignInput,
): Pick<Campaign, 'name' | 'description' | 'dmName'> {
  return {
    name: requiredText(input.name, 'Campaign name'),
    description: optionalText(input.description),
    dmName: optionalText(input.dmName),
  };
}

/** Creates a campaign together with its active character, atomically. */
export async function createCampaign(
  input: CampaignInput,
  character: InitialCharacter,
): Promise<{ campaignId: ID; characterId: ID }> {
  const fields = cleanCampaignInput(input);
  if (character.kind === 'new') requiredText(character.name, 'Character name');

  return db.transaction('rw', [db.campaigns, db.characters, db.sheets, db.blobs], async () => {
    const now = Date.now();
    const campaign: Campaign = { ...newEntity(now), ...fields, lastOpenedAt: now };
    await db.campaigns.add(campaign);
    const characterId =
      character.kind === 'new'
        ? await replaceActiveCharacter(campaign.id, character)
        : await insertCharacterCopy(campaign.id, character.characterId);
    return { campaignId: campaign.id, characterId };
  });
}

export async function updateCampaign(id: ID, input: CampaignInput): Promise<void> {
  const updated = await db.campaigns.update(id, {
    ...cleanCampaignInput(input),
    updatedAt: Date.now(),
  });
  if (!updated) throw new NotFoundError('Campaign not found.');
}

export async function setCampaignArchived(id: ID, archived: boolean): Promise<void> {
  const now = Date.now();
  await db.campaigns.update(id, { archivedAt: archived ? now : undefined, updatedAt: now });
}

/** Records that the campaign was opened. Deliberately doesn't change updatedAt. */
export async function markCampaignOpened(id: ID): Promise<void> {
  await db.campaigns.update(id, { lastOpenedAt: Date.now() });
}

export interface CampaignContents {
  characters: number;
  notes: number;
}

export async function getCampaignContents(id: ID): Promise<CampaignContents> {
  const [characters, notes] = await Promise.all([
    db.characters.where('campaignId').equals(id).count(),
    db.sessionNotes.where('campaignId').equals(id).count(),
  ]);
  return { characters, notes };
}

/**
 * Permanently deletes a campaign and everything in it: characters, sheets,
 * session notes, pages, strokes and any blobs they reference.
 */
export async function deleteCampaign(id: ID): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    const campaign = await db.campaigns.get(id);
    if (!campaign) return;

    const characters = await db.characters.where('campaignId').equals(id).toArray();
    const characterIds = characters.map((c) => c.id);
    const notes = await db.sessionNotes.where('campaignId').equals(id).toArray();
    const noteIds = notes.map((n) => n.id);
    const pageIds = await db.notePages.where('noteId').anyOf(noteIds).primaryKeys();

    const blobIds = [
      campaign.coverBlobId,
      ...characters.map((c) => c.portraitBlobId),
      ...notes.map((n) => n.thumbnailBlobId),
    ].filter((b): b is ID => b !== undefined);

    await db.strokes.where('pageId').anyOf(pageIds).delete();
    await db.notePages.bulkDelete(pageIds);
    await db.sessionNotes.bulkDelete(noteIds);
    await db.sheets.where('characterId').anyOf(characterIds).delete();
    await db.characters.bulkDelete(characterIds);
    await db.blobs.bulkDelete(blobIds);
    await db.campaigns.delete(id);
  });
}
