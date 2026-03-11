'use client';
import Sidebar from './Sidebar';
import { Topbar } from './Topbar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — cachée sur mobile, visible desktop */}
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar/>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}