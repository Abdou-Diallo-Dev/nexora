'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner, Badge, cardCls } from '@/components/ui';
import { PERMISSION_GROUPS, ROLES_CONFIGURABLE, DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { toast } from 'sonner';
import { Save, RefreshCw, ChevronDown, ChevronUp, Building2, Check, X } from 'lucide-react';
import type { UserRole } from '@/lib/store';

type Company = { id: string; name: string; is_active: boolean };
type PermsMap = Record<string, Record<string, boolean>>; // role -> permKey -> bool

const ROLE_COLORS: Record<string, string> = {
  manager:   'info',
  agent:     'success',
  comptable: 'purple',
  viewer:    'default',
};

export default function PermissionsPage() {
  const [companies, setCompanies]   = useState<Company[]>([]);
  const [selected, setSelected]     = useState<string | null>(null);
  const [perms, setPerms]           = useState<PermsMap>({});
  const [activeRole, setActiveRole] = useState<string>('manager');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const sb = createClient();
    sb.from('companies').select('id,name,is_active').order('name').then(({ data }) => {
      setCompanies((data || []) as Company[]);
      setLoading(false);
    });
  }, []);

  const loadPerms = async (companyId: string) => {
    setLoading(true);
    const sb = createClient();
    const { data } = await sb.from('company_role_permissions').select('role,permissions').eq('company_id', companyId);
    const map: PermsMap = {};
    // Init with defaults
    for (const r of ROLES_CONFIGURABLE) {
      map[r.role] = { ...DEFAULT_PERMISSIONS[r.role] };
    }
    // Override with DB values
    for (const row of (data || [])) {
      map[row.role] = { ...map[row.role], ...(row.permissions as Record<string, boolean>) };
    }
    setPerms(map);
    setLoading(false);
  };

  const selectCompany = (id: string) => {
    setSelected(id);
    loadPerms(id);
  };

  const toggle = (role: string, key: string) => {
    setPerms(p => ({
      ...p,
      [role]: { ...p[role], [key]: !p[role]?.[key] },
    }));
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const sb = createClient();
    for (const r of ROLES_CONFIGURABLE) {
      await sb.from('company_role_permissions').upsert({
        company_id: selected,
        role: r.role,
        permissions: perms[r.role] || {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,role' });
    }
    toast.success('Permissions sauvegardees !');
    setSaving(false);
  };

  const resetRole = (role: string) => {
    setPerms(p => ({ ...p, [role]: { ...DEFAULT_PERMISSIONS[role] } }));
    toast.success('Role reinitialise aux valeurs par defaut');
  };

  const toggleGroup = (label: string) => {
    setOpenGroups(g => ({ ...g, [label]: !g[label] }));
  };

  const grantAll = (role: string) => {
    const all: Record<string, boolean> = {};
    PERMISSION_GROUPS.forEach(g => g.perms.forEach(p => { all[p.key] = true; }));
    setPerms(p => ({ ...p, [role]: all }));
  };

  const revokeAll = (role: string) => {
    const none: Record<string, boolean> = {};
    PERMISSION_GROUPS.forEach(g => g.perms.forEach(p => { none[p.key] = false; }));
    setPerms(p => ({ ...p, [role]: none }));
  };

  if (loading && companies.length === 0) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>
  );

  const selectedCompany = companies.find(c => c.id === selected);
  const rolePerms = perms[activeRole] || {};
  const totalPerms = PERMISSION_GROUPS.reduce((s, g) => s + g.perms.length, 0);
  const activeCount = Object.values(rolePerms).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Gestion des permissions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configurez les droits de chaque rôle par entreprise</p>
      </div>

      {/* Sélection entreprise */}
      <div className={cardCls + ' p-5'}>
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Building2 size={16} className="text-primary"/> Sélectionnez une entreprise
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {companies.map(c => (
            <button key={c.id} onClick={() => selectCompany(c.id)}
              className={'flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ' + (
                selected === c.id
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border hover:border-slate-300 text-muted-foreground hover:text-foreground'
              )}>
              <div>
                <p className="font-semibold text-sm">{c.name}</p>
                <p className="text-xs mt-0.5">{c.is_active ? '🟢 Active' : '🔴 Inactive'}</p>
              </div>
              {selected === c.id && <Check size={16} className="text-primary flex-shrink-0"/>}
            </button>
          ))}
        </div>
      </div>

      {selected && !loading && (
        <>
          {/* Header entreprise sélectionnée */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-foreground">{selectedCompany?.name}</h2>
              <p className="text-xs text-muted-foreground">Personnalisez les droits pour chaque rôle</p>
            </div>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? <LoadingSpinner size={14}/> : <Save size={14}/>} Sauvegarder
            </button>
          </div>

          {/* Onglets rôles */}
          <div className="flex gap-2 flex-wrap">
            {ROLES_CONFIGURABLE.map(r => {
              const rp = perms[r.role] || {};
              const count = Object.values(rp).filter(Boolean).length;
              return (
                <button key={r.role} onClick={() => setActiveRole(r.role)}
                  className={'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ' + (
                    activeRole === r.role
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-slate-300 hover:text-foreground'
                  )}>
                  <Badge variant={ROLE_COLORS[r.role] as any}>{r.label}</Badge>
                  <span className="text-xs text-muted-foreground">{count}/{totalPerms}</span>
                </button>
              );
            })}
          </div>

          {/* Description du rôle actif */}
          {ROLES_CONFIGURABLE.find(r => r.role === activeRole) && (
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {ROLES_CONFIGURABLE.find(r => r.role === activeRole)?.label}
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    {activeCount} permission{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ROLES_CONFIGURABLE.find(r => r.role === activeRole)?.desc}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => grantAll(activeRole)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors border border-green-200">
                  <Check size={12}/> Tout activer
                </button>
                <button onClick={() => revokeAll(activeRole)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors border border-red-200">
                  <X size={12}/> Tout désactiver
                </button>
                <button onClick={() => resetRole(activeRole)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors border border-slate-200">
                  <RefreshCw size={12}/> Défaut
                </button>
              </div>
            </div>
          )}

          {/* Groupes de permissions */}
          <div className="space-y-3">
            {PERMISSION_GROUPS.map(group => {
              const isOpen = openGroups[group.label] !== false; // ouvert par défaut
              const activeInGroup = group.perms.filter(p => rolePerms[p.key]).length;
              return (
                <div key={group.label} className={cardCls + ' overflow-hidden'}>
                  <button onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground text-sm">{group.label}</span>
                      <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (
                        activeInGroup === group.perms.length
                          ? 'bg-green-100 text-green-700'
                          : activeInGroup === 0
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-blue-100 text-blue-700'
                      )}>
                        {activeInGroup}/{group.perms.length}
                      </span>
                    </div>
                    {isOpen ? <ChevronUp size={15} className="text-muted-foreground"/> : <ChevronDown size={15} className="text-muted-foreground"/>}
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.perms.map(perm => {
                        const enabled = !!rolePerms[perm.key];
                        return (
                          <button key={perm.key} onClick={() => toggle(activeRole, perm.key)}
                            className={'flex items-center justify-between px-4 py-3 rounded-xl border transition-all ' + (
                              enabled
                                ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                                : 'border-border bg-slate-50 dark:bg-slate-700/20 hover:border-slate-300'
                            )}>
                            <span className={'text-sm font-medium ' + (enabled ? 'text-green-800 dark:text-green-300' : 'text-muted-foreground')}>
                              {perm.label}
                            </span>
                            <div className={'w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ' + (enabled ? 'bg-green-500' : 'bg-slate-300')}>
                              <div className={'w-4 h-4 bg-white rounded-full shadow transition-transform ' + (enabled ? 'translate-x-4' : 'translate-x-0')}/>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? <LoadingSpinner size={14}/> : <Save size={14}/>} Sauvegarder les permissions
            </button>
          </div>
        </>
      )}
    </div>
  );
}