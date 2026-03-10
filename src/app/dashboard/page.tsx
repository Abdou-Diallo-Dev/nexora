'use client';
import Link from 'next/link';
import { Building2, Truck, Users, Settings, Shield } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export default function DashboardPage() {
  const { user, company } = useAuthStore();

  const cards = [
    {
      href: '/real-estate',
      label: 'Gestion Immobilière',
      desc: 'Biens, locataires, loyers, maintenance',
      icon: <Building2 size={28} />,
      colorCls:
        'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30',
      show: true,
    },
    {
      href: '/logistics',
      label: 'Gestion Logistique',
      desc: 'Commandes, livraisons, flotte, entrepôt',
      icon: <Truck size={28} />,
      colorCls:
        'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30',
      show: true,
    },
    {
      href: '/admin/users',
      label: 'Utilisateurs',
      desc: 'Gérer les accès et les rôles',
      icon: <Users size={28} />,
      colorCls:
        'text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30',
      show:
        user?.role === 'admin' || user?.role === 'super_admin',
    },
    {
      href: '/admin/settings',
      label: 'Paramètres',
      desc: 'Configuration de la plateforme',
      icon: <Settings size={28} />,
      colorCls:
        'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30',
      show: true,
    },
    {
      href: '/super-admin/dashboard',
      label: 'Super Admin',
      desc: 'Gestion multi-tenant de la plateforme',
      icon: <Shield size={28} />,
      colorCls:
        'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30',
      show: user?.role === 'super_admin',
    },
  ].filter((c) => c.show);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bonjour, {user?.full_name?.split(' ')[0] || 'Utilisateur'}&nbsp;👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {company?.name || 'Tableau de bord principal'}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={
              'flex items-start gap-4 p-6 rounded-2xl border transition-all ' +
              c.colorCls
            }
          >
            <div className="mt-0.5 flex-shrink-0">{c.icon}</div>
            <div>
              <p className="font-semibold text-foreground text-base">
                {c.label}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
