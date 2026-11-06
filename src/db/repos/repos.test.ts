// @vitest-environment node
import { db } from '../db';
import { DEFAULT_SHEETS } from '../defaultSheets';
import { ValidationError } from '../entity';
import { newId } from '../ids';
import {
  createCampaign,
  deleteCampaign,
  getCampaignContents,
  markCampaignOpened,
  setCampaignArchived,
  updateCampaign,
} from './campaigns';
import {
  ActiveCharacterExistsError,
  createCharacter,
  deleteArchivedCharacter,
  getActiveCharacter,
  getArchivedCharacters,
  makeCharacterActive,
  renameCharacter,
  replaceActiveCharacter,
} from './characters';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function newCampaign(name = 'Curse of Strahd', character = 'Ireena') {
  return createCampaign({ name }, { kind: 'new', name: character });
}

describe('createCampaign', () => {
  it('creates the campaign, its active character and the default sheets', async () => {
    const { campaignId, characterId } = await newCampaign();

    const campaign = await db.campaigns.get(campaignId);
    expect(campaign).toMatchObject({ name: 'Curse of Strahd', schemaVersion: 1 });
    expect(campaign?.archivedAt).toBeUndefined();

    const character = await getActiveCharacter(campaignId);
    expect(character?.id).toBe(characterId);
    expect(character?.name).toBe('Ireena');

    const sheets = await db.sheets.where('characterId').equals(characterId).toArray();
    expect(sheets.map((s) => s.kind).sort()).toEqual(DEFAULT_SHEETS.map((s) => s.kind).sort());
    expect(character?.sheetOrder).toHaveLength(DEFAULT_SHEETS.length);
  });

  it('trims input and drops empty optional fields', async () => {
    const { campaignId } = await createCampaign(
      { name: '  Waterdeep  ', description: '   ', dmName: ' Sam ' },
      { kind: 'new', name: ' Vex ' },
    );
    const campaign = await db.campaigns.get(campaignId);
    expect(campaign).toMatchObject({ name: 'Waterdeep', dmName: 'Sam' });
    expect(campaign?.description).toBeUndefined();
    expect((await getActiveCharacter(campaignId))?.name).toBe('Vex');
  });

  it('rejects a blank campaign or character name and writes nothing', async () => {
    await expect(createCampaign({ name: ' ' }, { kind: 'new', name: 'A' })).rejects.toThrow(
      ValidationError,
    );
    await expect(createCampaign({ name: 'A' }, { kind: 'new', name: '' })).rejects.toThrow(
      ValidationError,
    );
    expect(await db.campaigns.count()).toBe(0);
    expect(await db.characters.count()).toBe(0);
  });

  it('copies an existing character, with fresh ids, into the new campaign', async () => {
    const first = await newCampaign('First', 'Thorin');
    await renameCharacter(first.characterId, 'Thorin Oakenshield');
    const portraitId = newId();
    await db.blobs.add({ id: portraitId, mime: 'image/png', data: new Blob(['x']) });
    await db.characters.update(first.characterId, { portraitBlobId: portraitId });

    const second = await createCampaign(
      { name: 'Second' },
      { kind: 'copy', characterId: first.characterId },
    );

    const copy = await db.characters.get(second.characterId);
    const original = await db.characters.get(first.characterId);
    expect(copy?.id).not.toBe(original?.id);
    expect(copy).toMatchObject({ name: 'Thorin Oakenshield', campaignId: second.campaignId });
    expect(copy?.archivedAt).toBeUndefined();

    // Sheets are copied with new ids, and sheetOrder points at the copies.
    const copiedSheets = await db.sheets.where('characterId').equals(second.characterId).toArray();
    expect(copiedSheets).toHaveLength(DEFAULT_SHEETS.length);
    expect(new Set(copy?.sheetOrder)).toEqual(new Set(copiedSheets.map((s) => s.id)));
    expect(copy?.sheetOrder.some((id) => original?.sheetOrder.includes(id))).toBe(false);

    // The portrait is duplicated so deleting one campaign doesn't break the other.
    expect(copy?.portraitBlobId).toBeDefined();
    expect(copy?.portraitBlobId).not.toBe(portraitId);
    await deleteCampaign(first.campaignId);
    expect(await db.blobs.get(copy!.portraitBlobId!)).toBeDefined();
  });
});

describe('one active character per campaign', () => {
  it('refuses to create a second active character', async () => {
    const { campaignId } = await newCampaign();
    await expect(createCharacter(campaignId, { name: 'Second' })).rejects.toThrow(
      ActiveCharacterExistsError,
    );
  });

  it('replace archives the current character and makes the new one active', async () => {
    const { campaignId, characterId: firstId } = await newCampaign();
    const secondId = await replaceActiveCharacter(campaignId, { name: 'Ismark' });

    expect((await getActiveCharacter(campaignId))?.id).toBe(secondId);
    const archived = await getArchivedCharacters(campaignId);
    expect(archived.map((c) => c.id)).toEqual([firstId]);
    expect(archived[0]?.archivedAt).toBeTypeOf('number');
  });

  it('makeCharacterActive swaps the active and archived characters', async () => {
    const { campaignId, characterId: firstId } = await newCampaign();
    const secondId = await replaceActiveCharacter(campaignId, { name: 'Ismark' });

    await makeCharacterActive(firstId);

    expect((await getActiveCharacter(campaignId))?.id).toBe(firstId);
    expect((await getArchivedCharacters(campaignId)).map((c) => c.id)).toEqual([secondId]);
  });

  it('only archived characters can be deleted', async () => {
    const { campaignId, characterId: firstId } = await newCampaign();
    await expect(deleteArchivedCharacter(firstId)).rejects.toThrow(ValidationError);

    await replaceActiveCharacter(campaignId, { name: 'Ismark' });
    await deleteArchivedCharacter(firstId);
    expect(await db.characters.get(firstId)).toBeUndefined();
    expect(await db.sheets.where('characterId').equals(firstId).count()).toBe(0);
  });
});

describe('campaign updates', () => {
  it('updates details and archives / unarchives', async () => {
    const { campaignId } = await newCampaign();
    await updateCampaign(campaignId, { name: 'Strahd', dmName: 'Alex' });
    expect(await db.campaigns.get(campaignId)).toMatchObject({ name: 'Strahd', dmName: 'Alex' });

    await setCampaignArchived(campaignId, true);
    expect((await db.campaigns.get(campaignId))?.archivedAt).toBeTypeOf('number');
    await setCampaignArchived(campaignId, false);
    expect((await db.campaigns.get(campaignId))?.archivedAt).toBeUndefined();
  });

  it('markCampaignOpened sets lastOpenedAt without touching updatedAt', async () => {
    const { campaignId } = await newCampaign();
    const before = await db.campaigns.get(campaignId);
    await new Promise((r) => setTimeout(r, 5));
    await markCampaignOpened(campaignId);
    const after = await db.campaigns.get(campaignId);
    expect(after?.updatedAt).toBe(before?.updatedAt);
    expect(after!.lastOpenedAt!).toBeGreaterThan(before!.lastOpenedAt!);
  });
});

describe('deleteCampaign', () => {
  it('deletes everything in the campaign and nothing in other campaigns', async () => {
    const keep = await newCampaign('Keep', 'Keeper');
    const doomed = await newCampaign('Doomed', 'Doomed PC');
    await replaceActiveCharacter(doomed.campaignId, { name: 'Second PC' });

    // A session note with one page, one stroke and a thumbnail.
    const now = Date.now();
    const base = { createdAt: now, updatedAt: now, schemaVersion: 1 };
    const noteId = newId();
    const pageId = newId();
    const thumbId = newId();
    await db.blobs.add({ id: thumbId, mime: 'image/png', data: new Blob(['t']) });
    await db.sessionNotes.add({
      ...base,
      id: noteId,
      campaignId: doomed.campaignId,
      title: 'Session 1',
      sessionDate: '2026-11-05',
      pageIds: [pageId],
      thumbnailBlobId: thumbId,
      tags: [],
    });
    await db.notePages.add({
      ...base,
      id: pageId,
      noteId,
      width: 1000,
      height: 1400,
      background: 'blank',
      textBlocks: [],
    });
    await db.strokes.add({
      id: newId(),
      pageId,
      tool: 'pen',
      color: '#000',
      size: 2,
      opacity: 1,
      points: new Float32Array([0, 0, 0.5]),
      bbox: [0, 0, 0, 0],
      z: 0,
    });

    expect(await getCampaignContents(doomed.campaignId)).toEqual({ characters: 2, notes: 1 });

    await deleteCampaign(doomed.campaignId);

    expect(await db.campaigns.get(doomed.campaignId)).toBeUndefined();
    expect(await db.characters.where('campaignId').equals(doomed.campaignId).count()).toBe(0);
    expect(await db.sessionNotes.count()).toBe(0);
    expect(await db.notePages.count()).toBe(0);
    expect(await db.strokes.count()).toBe(0);
    expect(await db.blobs.count()).toBe(0);

    // The other campaign is untouched.
    expect(await db.campaigns.get(keep.campaignId)).toBeDefined();
    expect((await getActiveCharacter(keep.campaignId))?.id).toBe(keep.characterId);
    expect(await db.sheets.where('characterId').equals(keep.characterId).count()).toBe(
      DEFAULT_SHEETS.length,
    );
  });
});
