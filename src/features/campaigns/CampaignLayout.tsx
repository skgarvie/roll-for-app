import {
  Archive,
  ArchiveRestore,
  Copy,
  History,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  UserPen,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router';
import { useActiveCharacter, useCampaign, useSheets } from '@/db/hooks';
import { deleteCampaign, markCampaignOpened, setCampaignArchived } from '@/db/repos/campaigns';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { Menu } from '@/ui/Menu';
import { TopBar } from '@/ui/TopBar';
import { RenameCharacterDialog, ReplaceCharacterDialog } from '../characters/CharacterDialogs';
import { DeleteCampaignDialog, EditCampaignDialog } from './CampaignDialogs';
import type { CampaignContext } from './campaignContext';
import { rememberLastCampaign } from './lastCampaign';

type OpenDialog = 'edit' | 'rename' | 'replace' | 'delete' | null;

/** Campaign home: top bar, sheet tabs + Notes tab, and the campaign/character actions. */
export function CampaignLayout() {
  const { campaignId } = useParams();
  const campaign = useCampaign(campaignId);
  const character = useActiveCharacter(campaignId);
  const sheets = useSheets(character);
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const closeDialog = () => setDialog(null);
  // While deleting, stop rendering the sheet routes: their "sheet not found"
  // redirects would otherwise race the navigation back to the campaign list.
  const [deleting, setDeleting] = useState(false);

  const openedId = campaign?.id;
  useEffect(() => {
    if (!openedId) return;
    void markCampaignOpened(openedId);
    rememberLastCampaign(openedId);
  }, [openedId]);

  if (campaign === undefined || character === undefined || sheets === undefined) {
    return <div className="min-h-full" aria-busy="true" />;
  }

  if (campaign === null && deleting) return <div className="min-h-full" aria-busy="true" />;

  if (campaign === null) {
    return (
      <div className="flex min-h-full flex-col">
        <TopBar title="Campaign not found" back={{ to: '/', label: 'Back to campaigns' }} />
        <main className="px-safe mx-auto w-full max-w-2xl py-10 text-center">
          <p className="text-stone-500">This campaign doesn&rsquo;t exist on this device.</p>
          <Link to="/" className="mt-4 inline-block font-semibold text-amber-700 underline">
            Go to campaigns
          </Link>
        </main>
      </div>
    );
  }

  const archived = campaign.archivedAt !== undefined;
  const context: CampaignContext = { campaign, character, sheets };

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-30">
        <TopBar
          sticky={false}
          title={campaign.name}
          subtitle={character?.name ?? 'No active character'}
          back={{ to: '/', label: 'Back to campaigns' }}
          actions={
            <Menu
              label="Campaign actions"
              trigger={<MoreHorizontal className="size-6" aria-hidden />}
              items={[
                {
                  label: 'Edit campaign',
                  icon: <Pencil className="size-5" />,
                  onSelect: () => setDialog('edit'),
                },
                {
                  label: 'Rename character',
                  icon: <UserPen className="size-5" />,
                  onSelect: () => setDialog('rename'),
                  hidden: !character,
                },
                {
                  label: character ? 'Replace character…' : 'New character…',
                  icon: <RefreshCw className="size-5" />,
                  onSelect: () => setDialog('replace'),
                },
                {
                  label: 'Copy character to new campaign',
                  icon: <Copy className="size-5" />,
                  onSelect: () => void navigate(`/campaigns/new?copyFrom=${character?.id}`),
                  hidden: !character,
                },
                {
                  label: 'Previous characters',
                  icon: <History className="size-5" />,
                  onSelect: () => void navigate(`/campaign/${campaign.id}/history`),
                },
                {
                  label: archived ? 'Unarchive campaign' : 'Archive campaign',
                  icon: archived ? (
                    <ArchiveRestore className="size-5" />
                  ) : (
                    <Archive className="size-5" />
                  ),
                  onSelect: () => void setCampaignArchived(campaign.id, !archived),
                },
                {
                  label: 'Delete campaign…',
                  icon: <Trash2 className="size-5" />,
                  onSelect: () => setDialog('delete'),
                  danger: true,
                },
              ]}
            />
          }
        />

        {archived && (
          <div className="px-safe flex flex-wrap items-center justify-between gap-2 bg-amber-100 py-2 text-sm text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
            <span>This campaign is archived.</span>
            <Button
              variant="ghost"
              className="min-h-9"
              onClick={() => void setCampaignArchived(campaign.id, false)}
            >
              <ArchiveRestore className="size-4" aria-hidden />
              Unarchive
            </Button>
          </div>
        )}

        <nav
          aria-label="Sheets"
          className="px-safe flex gap-1 overflow-x-auto border-b border-stone-200 bg-stone-100/90 py-2 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90"
        >
          {sheets.map((sheet) => (
            <TabLink key={sheet.id} to={`s/${sheet.id}`}>
              {sheet.title}
            </TabLink>
          ))}
          <span className="mx-1 w-px shrink-0 self-stretch bg-stone-300 dark:bg-stone-700" />
          <TabLink to="notes">Notes</TabLink>
        </nav>
      </div>

      <main className="px-safe pb-safe mx-auto w-full max-w-5xl flex-1 py-6">
        {!deleting && <Outlet context={context} />}
      </main>

      {dialog === 'edit' && <EditCampaignDialog open onClose={closeDialog} campaign={campaign} />}
      {dialog === 'rename' && character && (
        <RenameCharacterDialog open onClose={closeDialog} character={character} />
      )}
      {dialog === 'replace' && (
        <ReplaceCharacterDialog
          open
          onClose={closeDialog}
          campaignId={campaign.id}
          current={character}
        />
      )}
      {dialog === 'delete' && (
        <DeleteCampaignDialog
          open
          onClose={closeDialog}
          campaign={campaign}
          onDelete={async () => {
            setDeleting(true);
            try {
              await deleteCampaign(campaign.id);
            } catch (err) {
              setDeleting(false);
              throw err;
            }
            await navigate('/', { replace: true });
          }}
        />
      )}
    </div>
  );
}

function TabLink({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          'inline-flex min-h-11 shrink-0 items-center rounded-lg px-4 font-medium whitespace-nowrap transition-colors',
          isActive
            ? 'bg-white text-stone-950 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800 dark:text-white dark:ring-stone-700'
            : 'text-stone-600 hover:bg-stone-200/70 dark:text-stone-400 dark:hover:bg-stone-800/60',
        )
      }
    >
      {children}
    </NavLink>
  );
}
