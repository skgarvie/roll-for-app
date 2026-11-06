import { Outlet, ScrollRestoration } from 'react-router';
import { UpdatePrompt } from '@/pwa/UpdatePrompt';
import { useStorageStatus } from '@/pwa/useStorageStatus';

export function RootLayout() {
  // Ask for persistent storage as soon as the app starts.
  useStorageStatus();
  return (
    <div className="app-chrome min-h-full">
      <Outlet />
      <UpdatePrompt />
      <ScrollRestoration />
    </div>
  );
}
