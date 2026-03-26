'use client';
import { useState } from 'react';
import { Users, Plus, X, Loader2, CheckCircle2, Phone, Mail, MapPin, Search, Building2 } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = '#3d2d7d';
const SARPA_YELLOW = '#faab2d';

type TypeClient = 'entreprise' | 'particulier' | 'public';

interface Client {
  id: string;
  nom: string;
  type: TypeClient;
  telephone?: string;
  email?: string;
  adresse?: string;
  contact_principal?: string;
  volume_total_m3?: number;
  nb_commandes?: number;
  statut: 'actif' | 'inactif';
  date_creation: string;
}

const MOCK: Client[] = [
  { id: '1', nom: 'BTP Sénégal SA', type: 'entreprise', telephone: '+221 33 821 00 00', email: 'contact@btpsenegal.sn', adresse: 'Zone Industrielle, Dakar', contact_principal: 'Mamadou Diallo', volume_total_m3: 850, nb_commandes: 12, statut: 'actif', date_creation: '2024-01-15' },
  { id: '2', nom: 'Groupe Diallo Construction', type: 'entreprise', telephone: '+221 77 500 12 34', email: 'gdc@gmail.com', adresse: 'Almadies, Dakar', contact_principal: 'Ibrahima Diallo', volume_total_m3: 420, nb_commandes: 8, statut: 'actif', date_creation: '2024-03-01' },
  { id: '3', nom: 'AGEROUTE — État du Sénégal', type: 'public', telephone: '+221 33 889 00 00', email: 'dg@ageroute.sn', adresse: 'Ministère, Dakar', contact_principal: 'Directeur Technique', volume_total_m3: 2100, nb_commandes: 4, statut: 'actif', date_creation: '2023-06-10' },
  { id: '4', nom: 'Immobilier Futur', type: 'entreprise', telephone: '+221 76 300 45 67', adresse: 'Grand Yoff, Dakar', contact_principal: 'Fatou Diop', volume_total_m3: 280, nb_commandes: 6, statut: 'actif', date_creation: '2024-07-20' },
  { id: '5', nom: 'SOGIP SA', type: 'entreprise', telephone: '+221 33 832 00 00', email: 'sogip@sogip.sn', adresse: 'Mbao, Dakar', volume_total_m3: 310, nb_commandes: 5, statut: 'actif', date_creation: '2024-02-14' },
  { id: '6', nom: 'M. Ousmane Badji', type: 'particulier', telephone: '+221 77 123 45 67', adresse: 'Pikine, Dakar', volume_total_m3: 45, nb_commandes: 2, statut: 'actif', date_creation: '2025-11-05' },
  { id: '7', nom: 'Ancien Client SARL', type: 'entreprise', adresse: 'Thiès', volume_total_m3: 120, nb_commandes: 3, statut: 'inactif', date_creation: '2023-01-01' },
];

const TYPE_CONFIG: Record<TypeClient, { label: string; color: string; bg: string }> = {
  entreprise: { label: 'Entreprise', color: SARPA_PURPLE, bg: SARPA_PURPLE + '15' },
  particulier: { label: 'Particulier', color: '#0ea5e9', bg: '#0ea5e915' },
  public:      { label: 'Secteur public', color: '#f59e0b', bg: '#f59e0b15' },
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TypeClient | 'tous'>('tous');
  const [selected, setSelected] = useState<Client | null>(null);
  const [form, setForm] = useState({ nom: '', type: 'entreprise' as TypeClient, telephone: '', email: '', adresse: '', contact_principal: '' });

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (!q || c.nom.toLowerCase().includes(q) || (c.contact_principal || '').toLowerCase().includes(q))
      && (filterType === 'tous' || c.type === filterType);
  });

  const actifs = clients.filter(c => c.statut === 'actif').length;
  const totalM3 = clients.reduce((s, c) => s + (c.volume_total_m3 || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setClients(prev => [{
      id: Date.now().toString(), nom: form.nom, type: form.type,
      telephone: form.telephone || undefined, email: form.email || undefined,
      adresse: form.adresse || undefined, contact_principal: form.contact_principal || undefined,
      volume_total_m3: 0, nb_commandes: 0, statut: 'actif',
      date_creation: new Date().toISOString().split('T')[0],
    }, ...prev]);
    setForm({ nom: '', type: 'entreprise', telephone: '', email: '', adresse: '', contact_principal: '' });
    setShowForm(false); setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: `linear-gradient(135deg, ${SARPA_PURPLE}, #5b3ea8)` }}>
          <Users size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">Répertoire clients SARPA Béton</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Nouveau client
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Clients actifs', value: actifs },
          { label: 'Volume total livré', value: totalM3 + ' M3' },
          { label: 'Secteur public', value: clients.filter(c => c.type === 'public').length },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-5'}>
            <p className="text-2xl font-black text-foreground">{k.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={inputCls + ' pl-9'} placeholder="Rechercher client..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={selectCls + ' w-auto'} value={filterType} onChange={e => setFilterType(e.target.value as any)}>
          <option value="tous">Tous les types</option>
          {(Object.keys(TYPE_CONFIG) as TypeClient[]).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => {
          const t = TYPE_CONFIG[c.type];
          return (
            <div key={c.id} className={cardCls + ' p-5 cursor-pointer hover:shadow-md transition-shadow'} onClick={() => setSelected(c)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: t.bg }}>
                  {c.type === 'particulier' ? <Users size={18} style={{ color: t.color }} /> : <Building2 size={18} style={{ color: t.color }} />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: t.bg, color: t.color }}>{t.label}</span>
                  <span className="w-2 h-2 rounded-full" style={{ background: c.statut === 'actif' ? '#22c55e' : '#94a3b8' }} title={c.statut} />
                </div>
              </div>
              <p className="font-bold text-foreground">{c.nom}</p>
              {c.contact_principal && <p className="text-xs text-muted-foreground mt-0.5">{c.contact_principal}</p>}
              <div className="mt-3 space-y-1">
                {c.telephone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone size={11} />{c.telephone}</div>}
                {c.adresse && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin size={11} />{c.adresse}</div>}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs">
                <span className="text-muted-foreground">{c.nb_commandes || 0} commandes</span>
                <span className="font-bold" style={{ color: SARPA_PURPLE }}>{c.volume_total_m3 || 0} M3 total</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className={cardCls + ' col-span-3 py-12 text-center'}>
            <Users size={32} className="mx-auto mb-3 opacity-20 text-foreground" />
            <p className="text-sm text-muted-foreground">Aucun client trouvé</p>
          </div>
        )}
      </div>

      {/* Fiche client */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Fiche client</h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: TYPE_CONFIG[selected.type].bg }}>
                  <Building2 size={22} style={{ color: TYPE_CONFIG[selected.type].color }} />
                </div>
                <div>
                  <p className="font-black text-foreground text-lg">{selected.nom}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: TYPE_CONFIG[selected.type].bg, color: TYPE_CONFIG[selected.type].color }}>{TYPE_CONFIG[selected.type].label}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {selected.contact_principal && <div className="flex items-center gap-2 text-muted-foreground"><Users size={13} /> {selected.contact_principal}</div>}
                {selected.telephone && <div className="flex items-center gap-2 text-muted-foreground"><Phone size={13} /> {selected.telephone}</div>}
                {selected.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail size={13} /> {selected.email}</div>}
                {selected.adresse && <div className="flex items-center gap-2 text-muted-foreground"><MapPin size={13} /> {selected.adresse}</div>}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                {[
                  { label: 'Commandes', value: selected.nb_commandes || 0 },
                  { label: 'Volume M3', value: selected.volume_total_m3 || 0 },
                  { label: 'Client depuis', value: selected.date_creation.slice(0, 7) },
                ].map(k => (
                  <div key={k.label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-700">
                    <p className="font-black text-foreground">{k.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nouveau client */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Nouveau client</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Nom / Raison sociale</label>
                <input className={inputCls} value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Type</label>
                  <select className={selectCls} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as TypeClient }))}>
                    {(Object.keys(TYPE_CONFIG) as TypeClient[]).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Contact principal</label><input className={inputCls} value={form.contact_principal} onChange={e => setForm(p => ({ ...p, contact_principal: e.target.value }))} /></div>
                <div><label className={labelCls}>Téléphone</label><input className={inputCls} value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} placeholder="+221 77..." /></div>
                <div><label className={labelCls}>Email</label><input type="email" className={inputCls} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Adresse</label><input className={inputCls} value={form.adresse} onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enreg...</> : <><CheckCircle2 size={14} /> Créer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
