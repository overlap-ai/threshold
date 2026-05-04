import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-background">
      <main className="app-scroll no-scrollbar safe-top flex-1 px-5 pt-6">
        <div className="pb-6">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
