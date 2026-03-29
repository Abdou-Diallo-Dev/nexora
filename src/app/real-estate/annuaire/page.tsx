'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Phone, Mail, Building2, Users, UserCog,
  Home, BookOpen, Trash2, Edit, ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, inputCls, btnPrimary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────
type Source = 'tenant' | 'employee' | 'owner' | 'contact_int' | 'contact_ext';

type Contact = {
  id: string;
  source: Source;
  name: string;
  sub: string;       // poste / type / role
  email: string | null;
  phone: string | null;
  phone2?: string | null;
  address?: string | null;
  category?: string | null;
};

const SOURCE_META: Record<Source, { label: string; color: string; icon: React.ReactNode }> = {
  tenant:      { label: 'Locataire',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',     icon: <Home size={10} /> },
  employee:    { label: 'Employe',    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: <UserCog size={10} /> },
  owner:       { label: 'Proprietaire', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: <Building2 size={10} /> },
  contact_int: { label: 'Interne',    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',  icon: <Users size={10} /> },
  contact_ext: { label: 'Externe',    color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',  icon: <BookOpen size={10} /> },
};

const CATEGORIES = [
  'Prestataire', 'Notaire', 'Banque / Financier', 'Syndic', 'Agence immobiliere',
  'Assurance', 'Artisan / Technicien', 'Administration', 'Autre',
];

type Tab = 'tous' | 'internes' | 'externes' | 'base';

export default function AnnuairePage() {
  const { company } = useAuthStore();
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [tab, setTab]             = useState<Tab>('tous');
  const [catFilter, setCat]       = useState('');

  // ── Chargement depuis toutes les tables ──────────────────────
  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    const sb = createClient();

    Promise.all([
      // Locataires
      sb.from('tenants').select('id,first_name,last_name,email,phone').eq('company_id', company.id),
      // Employes
      sb.from('re_employees').select('id,first_name,last_name,email,phone,post,employee_type').eq('company_id', company.id),
      // Proprietaires (depuis properties — dédupliqués par nom)
      sb.from('properties').select('id,owner_name,owner_email,owner_phone,name').eq('company_id', company.id).not('owner_name', 'is', null),
      // Contacts manuels
      sb.from('re_contacts').select('*').eq('company_id', company.id),
    ]).then(([t, e, p, c]) => {
      const list: Contact[] = [];

      // Locataires
      (t.data || []).forEach((x: any) => {
        list.push({ id: 't_' + x.id, source: 'tenant', name: x.first_name + ' ' + x.last_name, sub: 'Locataire', email: x.email, phone: x.phone });
      });

      // Employes
      (e.data || []).forEach((x: any) => {
        list.push({ id: 'e_' + x.id, source: 'employee', name: x.first_name + ' ' + x.last_name, sub: x.post || x.employee_type || 'Employe', email: x.email, phone: x.phone });
      });

      // Proprietaires (dédupliqués sur owner_name)
      const seenOwners = new Set<string>();
      (p.data || []).forEach((x: any) => {
        if (!x.owner_name || seenOwners.has(x.owner_name)) return;
        seenOwners.add(x.owner_name);
        list.push({ id: 'o_' + x.id, source: 'owner', name: x.owner_name, sub: 'Proprietaire — ' + x.name, email: x.owner_email, phone: x.owner_phone });
      });

      // Contacts manuels
      (c.data || []).forEach((x: any) => {
        const name = [x.first_name, x.last_name].filter(Boolean).join(' ') || x.company_name || '—';
        list.push({
          id: 'c_' + x.id,
          source: x.type === 'internal' ? 'contact_int' : 'contact_ext',
          name,
          sub: x.company_name && x.first_name ? x.company_name : (x.category || ''),
          email: x.email,
          phone: x.phone,
          phone2: x.phone2,
          address: x.address,
          category: x.category,
        });
      });

      list.sort((a, b) => a.name.localeCompare(b.name));
      setContacts(list);
      setLoading(false);
    });
  }, [company?.id]);

  // ── Suppression contact manuel ───────────────────────────────
  const del = async (contact: Contact) => {
    if (!contact.id.startsWith('c_')) { toast.error('Impossible de supprimer un contact auto'); return; }
    if (!confirm('Supprimer ce contact ?')) return;
    const realId = contact.id.slice(2);
    await createClient().from('re_contacts').delete().eq('id', realId);
    setContacts(prev => prev.filter(c => c.id !== contact.id));
    toast.success('Contact supprime');
  };

  // ── Filtrage ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return contacts.filter(c => {
      // Onglet
      if (tab === 'internes' && !['employee', 'contact_int'].includes(c.source)) return false;
      if (tab === 'externes' && !['contact_ext', 'owner'].includes(c.source)) return false;
      if (tab === 'base'     && !['tenant', 'employee', 'owner'].includes(c.source)) return false;
      // Catégorie
      if (catFilter && c.category !== catFilter) return false;
      // Recherche
      if (query) {
        const q = query.toLowerCase();
        return c.name.toLowerCase().includes(q)
          || (c.email || '').toLowerCase().includes(q)
          || (c.phone || '').includes(q)
          || (c.sub || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [contacts, tab, query, catFilter]);

  // Grouper par première lettre
  const grouped = useMemo(() => {
    const map = new Map<string, Contact[]>();
    filtered.forEach(c => {
      const letter = c.name.charAt(0).toUpperCase() || '#';
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(c);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'tous',     label: 'Tous',     count: contacts.length },
    { key: 'internes', label: 'Internes', count: contacts.filter(c => ['employee','contact_int'].includes(c.source)).length },
    { key: 'externes', label: 'Externes', count: contacts.filter(c => ['contact_ext','owner'].includes(c.source)).length },
    { key: 'base',     label: 'Base auto',count: contacts.filter(c => ['tenant','employee','owner'].includes(c.source)).length },
  ];

  return (
    <div>
      <PageHeader
        title="Annuaire"
        subtitle={contacts.length + ' contact(s)'}
        actions={<Link href="/real-estate/annuaire/new" className={btnPrimary}><Plus size={16} />Nouveau contact</Link>}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap border-b border-border">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={'px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ' +
              (tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t.label}
            <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded-full ' +
              (tab === t.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom, email, telephone..." className={inputCls + ' pl-9'} />
        </div>
        {(tab === 'tous' || tab === 'externes') && (
          <div className="relative">
            <select value={catFilter} onChange={e => setCat(e.target.value)}
              className={inputCls + ' pr-8 min-w-[170px] appearance-none'}>
              <option value="">Toutes categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><LoadingSpinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<BookOpen size={24} />} title="Aucun contact" description="Ajoutez un contact ou verifiez les filtres"
          action={<Link href="/real-estate/annuaire/new" className={btnPrimary}><Plus size={16} />Nouveau contact</Link>} />
      ) : (
        <div className="space-y-4">
          {grouped.map(([letter, group]) => (
            <div key={letter}>
              <div className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 mb-1.5">{letter}</div>
              <div className={cardCls + ' overflow-hidden divide-y divide-border'}>
                {group.map(contact => {
                  const meta = SOURCE_META[contact.source];
                  const isManual = contact.id.startsWith('c_');
                  const initials = contact.name.split(' ').slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase();
                  return (
                    <div key={contact.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary/10 text-primary">
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{contact.name}</span>
                          <span className={'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ' + meta.color}>
                            {meta.icon} {meta.label}
                          </span>
                        </div>
                        {contact.sub && <p className="text-xs text-muted-foreground truncate">{contact.sub}</p>}
                      </div>

                      {/* Contacts */}
                      <div className="hidden md:flex flex-col gap-0.5 text-right min-w-[160px]">
                        {contact.phone && (
                          <a href={'tel:' + contact.phone} className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Phone size={10} />{contact.phone}
                          </a>
                        )}
                        {contact.phone2 && (
                          <a href={'tel:' + contact.phone2} className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Phone size={10} />{contact.phone2}
                          </a>
                        )}
                        {contact.email && (
                          <a href={'mailto:' + contact.email} className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Mail size={10} />{contact.email}
                          </a>
                        )}
                      </div>

                      {/* Actions (contacts manuels uniquement) */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isManual && (
                          <>
                            <Link href={'/real-estate/annuaire/' + contact.id.slice(2) + '/edit'}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                              <Edit size={13} />
                            </Link>
                            <button onClick={() => del(contact)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
