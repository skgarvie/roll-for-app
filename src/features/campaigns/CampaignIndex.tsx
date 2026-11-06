import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router';
import { Button } from '@/ui/Button';
import { ReplaceCharacterDialog } from '../characters/CharacterDialogs';
import { useCampaignContext } from './campaignContext';

/** /campaign/:id opens the first sheet, or offers to create a character if there isn't one. */
export function CampaignIndex() {
  const { campaign, character, sheets } = useCampaignContext();
  const [creating, setCreating] = useState(false);

  const first = sheets[0];
  if (character && first) return <Navigate to={`s/${first.id}`} replace />;

  return (
    <section className="rounded-2xl border-2 border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
      <p className="text-lg font-semibold">No active character</p>
      <p className="mt-1 text-stone-500">Create a character for this campaign.</p>
      <Button variant="primary" className="mt-5" onClick={() => setCreating(true)}>
        <UserPlus className="size-5" aria-hidden />
        New character
      </Button>
      {creating && (
        <ReplaceCharacterDialog
          open
          onClose={() => setCreating(false)}
          campaignId={campaign.id}
          current={null}
        />
      )}
    </section>
  );
}
