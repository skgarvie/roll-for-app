import { Plus, Settings, Swords } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAllCharacters, useCampaigns } from '@/db/hooks';
import type { Campaign, Character } from '@/db/types';
import { InstallHint } from '@/pwa/InstallHint';
import { buttonBase, buttonStyles } from '@/ui/buttonStyles';
import { cx } from '@/ui/cx';
import { formatRelative } from '@/ui/format';
import { TopBar } from '@/ui/TopBar';
import { takeLaunchCampaign } from './lastCampaign';

export function CampaignListPage() {
  const campaigns = useCampaigns();
  const characters = useAllCharacters();
  const navigate = useNavigate();
  const launchChecked = useRef(false);

  // On app launch, reopen the last campaign the player was in.
  useEffect(() => {
    if (!campaigns || launchChecked.current) return;
    launchChecked.current = true;
    const lastId = takeLaunchCampaign();
    const last = campaigns.find((c) => c.id === lastId && c.archivedAt === undefined);
    if (last) void navigate(`/campaign/${last.id}`, { replace: false });
  }, [campaigns, navigate]);

  const activeCharacterOf = new Map<string, Character>();
  for (const c of characters ?? []) {
    if (c.archivedAt === undefined) activeCharacterOf.set(c.campaignId, c);
  }

  const byRecent = (a: Campaign, b: Campaign) =>
    (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt);
  const active = (campaigns ?? []).filter((c) => c.archivedAt === undefined).sort(byRecent);
  const archived = (campaigns ?? []).filter((c) => c.archivedAt !== undefined).sort(byRecent);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="RollFor"
        leading={<img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="size-9" />}
        actions={
          <Link
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className="inline-flex size-11 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-200/70 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <Settings className="size-6" aria-hidden />
          </Link>
        }
      />

      <main className="px-safe pb-safe mx-auto w-full max-w-5xl flex-1 space-y-6 py-6">
        <InstallHint />

        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Campaigns</h2>
          {campaigns && campaigns.length > 0 && (
            <Link to="/campaigns/new" className={cx(buttonBase, buttonStyles.primary)}>
              <Plus className="size-5" aria-hidden />
              New campaign
            </Link>
          )}
        </div>

        {campaigns && campaigns.length === 0 && (
          <section className="rounded-2xl border-2 border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
            <Swords className="mx-auto size-10 text-amber-500" aria-hidden />
            <p className="mt-3 text-lg font-semibold">No campaigns yet</p>
            <p className="mt-1 text-stone-500">
              Each campaign holds your character and your session notes.
            </p>
            <Link to="/campaigns/new" className={cx(buttonBase, buttonStyles.primary, 'mt-5')}>
              <Plus className="size-5" aria-hidden />
              Start your first campaign
            </Link>
          </section>
        )}

        {active.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((campaign) => (
              <li key={campaign.id}>
                <CampaignCard campaign={campaign} character={activeCharacterOf.get(campaign.id)} />
              </li>
            ))}
          </ul>
        )}

        {archived.length > 0 && (
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-stone-600 dark:text-stone-400">
              Archived campaigns ({archived.length})
            </summary>
            <ul className="mt-3 grid gap-4 opacity-75 sm:grid-cols-2 lg:grid-cols-3">
              {archived.map((campaign) => (
                <li key={campaign.id}>
                  <CampaignCard
                    campaign={campaign}
                    character={activeCharacterOf.get(campaign.id)}
                  />
                </li>
              ))}
            </ul>
          </details>
        )}
      </main>
    </div>
  );
}

function CampaignCard({ campaign, character }: { campaign: Campaign; character?: Character }) {
  return (
    <Link
      to={`/campaign/${campaign.id}`}
      className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 transition hover:shadow-md hover:ring-amber-400 active:scale-[0.99] dark:bg-stone-900 dark:ring-stone-800"
    >
      <h3 className="text-lg font-semibold">{campaign.name}</h3>
      <p className="mt-0.5 text-amber-700 dark:text-amber-400">
        {character?.name ?? 'No active character'}
      </p>
      {campaign.description && (
        <p className="mt-2 line-clamp-2 text-sm text-stone-500">{campaign.description}</p>
      )}
      <p className="mt-auto pt-4 text-xs text-stone-400">
        {campaign.archivedAt
          ? `Archived ${formatRelative(campaign.archivedAt)}`
          : `Opened ${formatRelative(campaign.lastOpenedAt ?? campaign.updatedAt)}`}
      </p>
    </Link>
  );
}
