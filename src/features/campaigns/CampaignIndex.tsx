import { UserPlus } from 'lucide-react';
import { Link, Navigate } from 'react-router';
import { buttonBase, buttonStyles } from '@/ui/buttonStyles';
import { cx } from '@/ui/cx';
import { useCampaignContext } from './campaignContext';

/** /campaign/:id opens the first sheet, or offers to create a character if there isn't one. */
export function CampaignIndex() {
  const { campaign, character, sheets } = useCampaignContext();

  const first = sheets[0];
  if (character && first) return <Navigate to={`s/${first.id}`} replace />;

  return (
    <section className="rounded-2xl border-2 border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
      <p className="text-lg font-semibold">No active character</p>
      <p className="mt-1 text-stone-500">Create a character for this campaign.</p>
      <Link
        to={`/campaign/${campaign.id}/new-character`}
        className={cx(buttonBase, buttonStyles.primary, 'mt-5')}
      >
        <UserPlus className="size-5" aria-hidden />
        New character
      </Link>
    </section>
  );
}
