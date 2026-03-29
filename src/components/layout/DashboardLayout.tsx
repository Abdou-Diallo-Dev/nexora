'use client';
import Sidebar from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '@/lib/store';
import { getBrandingColors } from '@/lib/branding';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, company } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  // Calcule --primary selon le contexte :
  // super admin → Nexora bleu | autres → couleur primaire de l'entreprise
  const primaryHsl = isSuperAdmin
    ? '224 71% 40%'
    : getBrandingColors(company).primaryHsl;

  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      style={{
        ['--primary' as any]:            primaryHsl,
        ['--primary-foreground' as any]: '0 0% 100%',
      }}
    >
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
