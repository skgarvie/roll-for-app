// These dialogs are mounted only while open, so their state starts fresh each time.
import { useState } from 'react';
import { renameCharacter } from '@/db/repos/characters';
import type { Character } from '@/db/types';
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
