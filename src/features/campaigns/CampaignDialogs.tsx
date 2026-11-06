import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getCampaignContents, updateCampaign } from '@/db/repos/campaigns';
import type { Campaign } from '@/db/types';
import { FormDialog } from '@/ui/Dialog';
import { TextField } from '@/ui/TextField';

// These dialogs are mounted only while open, so their state starts fresh each time.
interface DialogProps {
  open: boolean;
  onClose: () => void;
  campaign: Campaign;
}

export function EditCampaignDialog({ open, onClose, campaign }: DialogProps) {
  const [name, setName] = useState(campaign.name);
  const [dmName, setDmName] = useState(campaign.dmName ?? '');
  const [description, setDescription] = useState(campaign.description ?? '');

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Edit campaign"
      submitLabel="Save"
      submitDisabled={!name.trim()}
      onSubmit={() => updateCampaign(campaign.id, { name, dmName, description })}
    >
      <TextField
        label="Campaign name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
        autoComplete="off"
      />
      <TextField
        label="Dungeon Master"
        hint="Optional"
        value={dmName}
        onChange={(e) => setDmName(e.target.value)}
        autoComplete="off"
      />
      <TextField
        label="Description"
        hint="Optional"
        multiline
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
    </FormDialog>
  );
}

export function DeleteCampaignDialog({
  open,
  onClose,
  campaign,
  onDelete,
}: DialogProps & { onDelete: () => Promise<void> }) {
  const contents = useLiveQuery(() => getCampaignContents(campaign.id), [campaign.id]);

  const parts: string[] = [];
  if (contents) {
    parts.push(contents.characters === 1 ? '1 character' : `${contents.characters} characters`);
    parts.push(contents.notes === 1 ? '1 session note' : `${contents.notes} session notes`);
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={`Delete “${campaign.name}”?`}
      submitLabel="Delete campaign"
      submitVariant="danger"
      onSubmit={onDelete}
    >
      <p>
        This permanently deletes the campaign
        {contents && <> and everything in it: {parts.join(' and ')}</>}. This can&rsquo;t be undone.
      </p>
      <p className="text-sm text-stone-500">
        If you might want it later, archive the campaign instead.
      </p>
    </FormDialog>
  );
}
