'use client';
import { useEffect, useState } from 'react';
import { Search, Phone, Mail, Users, Building2, Truck, UserCog } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, cardCls, inputCls, selectCls, Badge, BadgeVariant } from '@/components/ui';

type Contact = {
  id: string; full_name: string; type: string; category: string | null;
  phone: string | null; email: string | null; company_name: string | null;
  is_active: boolean;
};

const TYPE_CONFIG: Record<string, { l: string; icon: React.ReactNode; v: BadgeVariant; color: string }> = {
  client:   { l: 'Client',   icon: <Building2 size={15} />, v: 'info',    color: 'bg-blue-100 text-blue-700'   },
  driver:   { l: 'Chauffeur',icon: <Truck size={15} />,     v: 'success', color: 'bg-green-100 text-green-700' },
  employee: { l: 'Employé',  icon: <UserCog size={15} />,   v: 'warning', color: 'bg-amber-100 text-amber-700' },
  user:     { l: 'Utilisateur',icon:<Users size={15} />,    v: 'default', color: 'bg-slate-100 text-slate-700' },
};

export default function AnnuairePage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    createClient().from('company_directory')
      .select('*')
      .eq('company_id', company.id)
      .order('type')
      .order('full_name')
      .then(
        ({ data }) => { setItems((data || []) as any); setLoading(false); },
        (err: any) => { console.error('Erreur annuaire:', err); toast.error('Erreur: ' + (err?.message || 'requête échouée')); setLoading(false); }
      );
  }, [company?.id]);

  const filtered = items.filter(c => {
    const matchType = !filterType || c.type === filterType;
    const matchSearch = !search || [c.full_name, c.phone, c.email, c.company_name].some(
      v => v?.toLowerCase().includes(search.toLowerCase())
    );
    return matchType && matchSearch;
  });

  const grouped = Object.keys(TYPE_CONFIG).map(type => ({
    type, config: TYPE_CONFIG[type], contacts: filtered.filter(c => c.type === type),
  })).filter(g => g.contacts.length > 0 || (!filterType && !search));

  return (
    <div>
      <PageHeader title="Annuaire" subtitle={`${items.length} contact(s) au total`} />

      {/* Search + Filter */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className={inputCls + ' w-full pl-9'} placeholder="Rechercher nom, téléphone, email..." />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectCls + ' w-44'}>
          <option value="">Tous types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.l}s</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const count = items.filter(c => c.type === type).length;
          return (
            <button key={type} onClick={() => setFilterType(filterType === type ? '' : type)}
              className={`p-3 rounded-xl border text-left transition-all ${filterType === type ? 'ring-2 ring-primary' : ''} ${cardCls}`}>
              <div className={`inline-flex p-1.5 rounded-lg mb-2 ${cfg.color}`}>{cfg.icon}</div>
              <p className="text-lg font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{cfg.l}s</p>
            </button>
          );
        })}
      </div>

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : filtered.length === 0 ? <EmptyState icon={<Users size={24} />} title="Aucun contact trouvé" />
          : (
            <div className="space-y-6">
              {grouped.map(group => (
                group.contacts.length === 0 ? null : (
                  <div key={group.type}>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4 ${group.config.color}`}>
                      {group.config.icon} {group.config.l}s ({group.contacts.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.contacts.map(c => (
                        <div key={c.id} className={cardCls + ' p-4'}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-foreground text-sm">{c.full_name}</p>
                              {c.category && <p className="text-xs text-muted-foreground capitalize">{c.category}</p>}
                              {c.company_name && <p className="text-xs text-muted-foreground">{c.company_name}</p>}
                            </div>
                            <Badge variant={c.is_active ? group.config.v : 'default'}>
                              {c.is_active ? group.config.l : 'Inactif'}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {c.phone && (
                              <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                                <Phone size={11} /> {c.phone}
                              </a>
                            )}
                            {c.email && (
                              <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                                <Mail size={11} /> {c.email}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
    </div>
  );
}
