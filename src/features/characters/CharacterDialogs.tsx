// These dialogs are mounted only while open, so their state starts fresh each time.
import { useState } from 'react';
import { createCharacter, renameCharacter, replaceActiveCharacter } from '@/db/repos/characters';
import type { Character, ID } from '@/db/types';
import { FormDialog } from '@/ui/Dialog';
import { TextField } from '@/ui/TextField';

export function RenameCharacterDialog({
  open,
  onClose,
  character,
}: {
  open: boolean;
  onClose: () => void;
  character: Character;
}) {
  const [name, setName] = useState(character.name);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Rename character"
      submitLabel="Save"
      submitDisabled={!name.trim()}
      onSubmit={() => renameCharacter(character.id, name)}
    >
      <TextField
        label="Character name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
        autoComplete="off"
      />
    </FormDialog>
  );
}

/**
 * Archives the current character (kept under "Previous characters") and starts
 * a new one. With no current character it simply creates one.
 */
export function ReplaceCharacterDialog({
  open,
  onClose,
  campaignId,
  current,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: ID;
  current: Character | null;
}) {
  const [name, setName] = useState('');

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={current ? 'Replace character' : 'New character'}
      submitLabel={current ? 'Replace character' : 'Create character'}
      submitDisabled={!name.trim()}
      onSubmit={async () => {
        if (current) await replaceActiveCharacter(campaignId, { name });
        else await createCharacter(campaignId, { name });
      }}
    >
      {current && (
        <p>
          <strong>{current.name}</strong> will be archived. You can still read their sheets under
          Previous characters, or make them active again later.
        </p>
      )}
      <TextField
        label="New character name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
        autoComplete="off"
      />
    </FormDialog>
  );
}
