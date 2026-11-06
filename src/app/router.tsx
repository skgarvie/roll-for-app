import { createBrowserRouter } from 'react-router';
import { CampaignIndex } from '@/features/campaigns/CampaignIndex';
import { CampaignLayout } from '@/features/campaigns/CampaignLayout';
import { CampaignListPage } from '@/features/campaigns/CampaignListPage';
import { NewCampaignPage } from '@/features/campaigns/NewCampaignPage';
import { HistoryPage } from '@/features/characters/HistoryPage';
import { NotesPage } from '@/features/notes/NotesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { SheetPage } from '@/features/sheets/SheetPage';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';

// "/roll-for-app/" -> "/roll-for-app"; "/" stays "/".
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      errorElement: <RouteError />,
      children: [
        { path: '/', element: <CampaignListPage /> },
        { path: '/campaigns/new', element: <NewCampaignPage /> },
        {
          path: '/campaign/:campaignId',
          element: <CampaignLayout />,
          children: [
            { index: true, element: <CampaignIndex /> },
            { path: 's/:sheetId', element: <SheetPage /> },
            { path: 'notes', element: <NotesPage /> },
            { path: 'history', element: <HistoryPage /> },
          ],
        },
        { path: '/settings', element: <SettingsPage /> },
        { path: '*', element: <RouteError notFound /> },
      ],
    },
  ],
  { basename },
);
