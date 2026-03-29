'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, Phone, Mail, Edit, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, Badge, LoadingSpinner, EmptyState, inputCls, btnPrimary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  employee_type: string;
  post: string | null;
  department: string | null;
  salary: number | null;
  hire_date: string | null;
  status: string;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  administration:  { label: 'Administration',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  femme_menagere:  { label: 'Femme de menage',   color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  gardien:         { label: 'Gardien',            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  technicien:      { label: 'Technicien',         color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  comptable:       { label: 'Comptable',          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  chauffeur:       { label: 'Chauffeur',          color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  autre:           { label: 'Autre',              color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300' },
};

const STATUS_COLORS: Record<string, string> = {
  active:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-700/30 dark:text-slate-400',
  conge:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
};

export default function EmployesPage() {
  const { company } = useAuthStore();
  const [items, setItems]     = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState('');
  const [typeFilter, setType] = useState('');

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    createClient()
      .from('re_employees')
      .select('*')
      .eq('company_id', company.id)
      .order('last_name')
      .then(({ data }) => { setItems((data || []) as Employee[]); setLoading(false); });
  }, [company?.id]);

  const del = async (id: string) => {
    if (!confirm('Supprimer cet employe ?')) return;
    await createClient().from('re_employees').delete().eq('id', id);
    setItems(prev => prev.filter(e => e.id !== id));
    toast.success('Employe supprime');
  };

  const filtered = items.filter(e => {
    const name = (e.first_name + ' ' + e.last_name).toLowerCase();
    const matchQ = !query || name.includes(query.toLowerCase()) || (e.post || '').toLowerCase().includes(query.toLowerCase());
    const matchT = !typeFilter || e.employee_type === typeFilter;
    return matchQ && matchT;
  });

  return (
    <div>
      <PageHeader
        title="Employes"
        subtitle={items.length + ' employe(s)'}
        actions={<Link href="/real-estate/employes/new" className={btnPrimary}><Plus size={16} />Ajouter</Link>}
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher..." className={inputCls + ' pl-9'} />
        </div>
        <select value={typeFilter} onChange={e => setType(e.target.value)}
          className={inputCls + ' max-w-[180px]'}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><LoadingSpinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users size={24} />} title="Aucun employe" description="Ajoutez votre premier employe"
          action={<Link href="/real-estate/employes/new" className={btnPrimary}><Plus size={16} />Ajouter</Link>} />
      ) : (
        <div className={cardCls + ' overflow-hidden'}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Poste</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(e => {
                  const typeInfo = TYPE_LABELS[e.employee_type] || TYPE_LABELS.autre;
                  return (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary/10 text-primary">
                            {e.first_name.charAt(0)}{e.last_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{e.first_name} {e.last_name}</p>
                            {e.department && <p className="text-xs text-muted-foreground">{e.department}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{e.post || '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + typeInfo.color}>{typeInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="space-y-0.5">
                          {e.phone && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone size={10}/>{e.phone}</p>}
                          {e.email && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Mail size={10}/>{e.email}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (STATUS_COLORS[e.status] || STATUS_COLORS.inactive)}>
                          {e.status === 'active' ? 'Actif' : e.status === 'conge' ? 'Conge' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Link href={'/real-estate/employes/' + e.id + '/edit'}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                            <Edit size={14} />
                          </Link>
                          <button onClick={() => del(e.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
