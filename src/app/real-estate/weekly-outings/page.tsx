'use client';
import { useEffect, useState } from 'react';
import { CalendarRange, Landmark, Plus, Search, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, UserRole } from '@/lib/store';
import { Badge, EmptyState, LoadingSpinner, PageHeader, btnPrimary, cardCls, inputCls, labelCls, selectCls } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type Property = { id: string; name: string };
type Apartment = { id: string; name: string; property_id: string | null };
type Activity = {
  id: string;
  activity_type: string;
  status: string;
  activity_date: string;
  property_id: string | null;
  apartment_id: string | null;
  property_name: string | null;
  apartment_name: string | null;
  amount: number | null;
  bank_name: string | null;
  notes: string | null;
  role_label: string | null;
  created_by_name: string | null;
  created_at: string;
};

const TYPE_OPTIONS: Record<string, { label: string; roles: UserRole[] }> = {
  visit: { label: 'Visite', roles: ['agent', 'manager', 'admin', 'super_admin'] },
  prospection: { label: 'Prospection', roles: ['agent', 'manager', 'admin', 'super_admin'] },
  other: { label: 'Autre', roles: ['agent', 'manager', 'admin', 'super_admin'] },
  bank_deposit: { label: 'Dépôt bancaire', roles: ['comptable', 'manager', 'admin', 'super_admin'] },
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'error' }> = {
  planned: { label: 'Prévu', variant: 'warning' },
  completed: { label: 'Effectué', variant: 'success' },
  cancelled: { label: 'Annulé', variant: 'error' },
};

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent immobilier',
  manager: 'Manager',
  comptable: 'Comptable',
  admin: 'Administrateur',
  super_admin: 'Super Admin',
};

export default function WeeklyOutingsPage() {
  const { company, user } = useAuthStore();
  const role = (user?.role || 'viewer') as UserRole;
  const sb = createClient();

  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schemaError, setSchemaError] = useState('');
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [form, setForm] = useState({
    activity_type: role === 'comptable' ? 'bank_deposit' : 'visit',
    property_id: '',
    apartment_id: '',
    activity_date: new Date().toISOString().slice(0, 16),
    status: 'planned',
    amount: '',
    bank_name: '',
    notes: '',
  });

  const allowedTypes = Object.entries(TYPE_OPTIONS).filter(([, cfg]) => cfg.roles.includes(role));
  const isBankDeposit = form.activity_type === 'bank_deposit';
  const filteredApartments = apartments.filter((apt) => !form.property_id || apt.property_id === form.property_id);

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [propsRes, apartmentsRes, activitiesRes] = await Promise.all([
      sb.from('properties').select('id,name').eq('company_id', company.id).order('name'),
      sb.from('apartments').select('id,name,property_id').eq('company_id', company.id).order('name'),
      sb.from('field_activities')
        .select('id,activity_type,status,activity_date,property_id,apartment_id,property_name,apartment_name,amount,bank_name,notes,role_label,created_by_name,created_at')
        .eq('company_id', company.id)
        .order('activity_date', { ascending: false })
        .limit(200),
    ]);

    setProperties((propsRes.data || []) as Property[]);
    setApartments((apartmentsRes.data || []) as Apartment[]);

    if (activitiesRes.error) {
      setSchemaError("La table 'field_activities' n'est pas encore disponible dans Supabase. Lance la migration SQL pour activer le module.");
      setItems([]);
    } else {
      setSchemaError('');
      setItems((activitiesRes.data || []) as Activity[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [company?.id]);

  useEffect(() => {
    if (role === 'comptable' && form.activity_type !== 'bank_deposit') {
      set('activity_type', 'bank_deposit');
    }
  }, [role]);

  const handleSave = async () => {
    if (!company?.id || !user?.id) return;
    if (schemaError) {
      toast.error("Migration SQL requise avant d'utiliser ce module");
      return;
    }
    if (!form.activity_type || !form.activity_date) {
      toast.error('Type et date requis');
      return;
    }
    if (isBankDeposit && (!form.amount || !form.bank_name.trim())) {
      toast.error('Montant et banque requis pour un dépôt bancaire');
      return;
    }

    const propertyName = properties.find((p) => p.id === form.property_id)?.name || null;
    const apartmentName = apartments.find((a) => a.id === form.apartment_id)?.name || null;

    setSaving(true);
    const { error } = await sb.from('field_activities').insert({
      company_id: company.id,
      created_by: user.id,
      created_by_name: user.full_name,
      role: role,
      role_label: ROLE_LABELS[role] || role,
      activity_type: form.activity_type,
      property_id: form.property_id || null,
      apartment_id: form.apartment_id || null,
      property_name: propertyName,
      apartment_name: apartmentName,
      activity_date: form.activity_date,
      status: form.status,
      amount: form.amount ? Number(form.amount) : null,
      bank_name: form.bank_name || null,
      notes: form.notes || null,
    } as never);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success('Sortie enregistrée');
    setForm({
      activity_type: role === 'comptable' ? 'bank_deposit' : 'visit',
      property_id: '',
      apartment_id: '',
      activity_date: new Date().toISOString().slice(0, 16),
      status: 'planned',
      amount: '',
      bank_name: '',
      notes: '',
    });
    setSaving(false);
    load();
  };

  const visibleItems = items.filter((item) => {
    const text = `${item.property_name || ''} ${item.apartment_name || ''} ${item.created_by_name || ''} ${item.bank_name || ''} ${item.notes || ''}`.toLowerCase();
    if (filterStatus && item.status !== filterStatus) return false;
    if (filterRole && item.role_label !== filterRole) return false;
    if (query && !text.includes(query.toLowerCase())) return false;
    return true;
  });

  const weeklyCount = items.filter((item) => {
    const itemDate = new Date(item.activity_date);
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    return itemDate >= start;
  }).length;

  const statsByRole = Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      const key = item.role_label || 'Autre';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sorties hebdomadaires"
        subtitle="Suivi des visites terrain, prospections et dépôts bancaires"
      />

      {schemaError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {schemaError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={cardCls + ' p-5'}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarRange size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{weeklyCount}</p>
              <p className="text-sm text-muted-foreground">sortie(s) cette semaine</p>
            </div>
          </div>
        </div>
        <div className={cardCls + ' p-5 lg:col-span-2'}>
          <div className="mb-3 flex items-center gap-2">
            <UserCheck size={16} className="text-primary" />
            <h3 className="font-semibold text-foreground">Statistiques par rôle</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statsByRole.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground">Aucune sortie enregistrée pour le moment.</p>
            ) : (
              statsByRole.map(([label, count]) => (
                <div key={label} className="rounded-xl border border-border bg-slate-50 p-3 dark:bg-slate-700/20">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{count}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px,1fr]">
        <div className={cardCls + ' p-6'}>
          <div className="mb-4 flex items-center gap-2">
            <Plus size={16} className="text-primary" />
            <h3 className="font-semibold text-foreground">Nouvelle sortie</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.activity_type} onChange={(e) => set('activity_type', e.target.value)} className={selectCls + ' w-full'}>
                {allowedTypes.map(([value, cfg]) => (
                  <option key={value} value={value}>{cfg.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>{isBankDeposit ? 'Date' : 'Date & heure'}</label>
              <input
                type={isBankDeposit ? 'date' : 'datetime-local'}
                value={isBankDeposit ? form.activity_date.slice(0, 10) : form.activity_date}
                onChange={(e) => set('activity_date', e.target.value)}
                className={inputCls}
              />
            </div>

            {!isBankDeposit && (
              <>
                <div>
                  <label className={labelCls}>Bien concerné</label>
                  <select
                    value={form.property_id}
                    onChange={(e) => {
                      set('property_id', e.target.value);
                      set('apartment_id', '');
                    }}
                    className={selectCls + ' w-full'}
                  >
                    <option value="">Sélectionner un bien</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Appartement concerné</label>
                  <select value={form.apartment_id} onChange={(e) => set('apartment_id', e.target.value)} className={selectCls + ' w-full'}>
                    <option value="">Sélectionner un appartement</option>
                    {filteredApartments.map((apartment) => (
                      <option key={apartment.id} value={apartment.id}>{apartment.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {isBankDeposit && (
              <>
                <div>
                  <label className={labelCls}>Montant versé</label>
                  <input type="number" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} className={inputCls} placeholder="250000" />
                </div>
                <div>
                  <label className={labelCls}>Banque</label>
                  <input value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} className={inputCls} placeholder="CBAO, BOA, Ecobank..." />
                </div>
              </>
            )}

            <div>
              <label className={labelCls}>Statut</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={selectCls + ' w-full'}>
                {Object.entries(STATUS_MAP).map(([value, cfg]) => (
                  <option key={value} value={value}>{cfg.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Notes</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={4} className={inputCls + ' resize-none'} placeholder="Commentaires, objectif de la visite, résultat du dépôt..." />
            </div>

            <button onClick={handleSave} disabled={saving || !!schemaError} className={btnPrimary + ' w-full justify-center'}>
              {saving ? <LoadingSpinner size={16} /> : <CalendarRange size={16} />}
              {saving ? 'Enregistrement...' : 'Enregistrer la sortie'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} className={inputCls + ' pl-9'} placeholder="Rechercher une sortie..." />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls + ' w-40'}>
              <option value="">Tous statuts</option>
              {Object.entries(STATUS_MAP).map(([value, cfg]) => (
                <option key={value} value={value}>{cfg.label}</option>
              ))}
            </select>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={selectCls + ' w-44'}>
              <option value="">Tous rôles</option>
              {Object.values(ROLE_LABELS).map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center"><LoadingSpinner size={32} /></div>
          ) : visibleItems.length === 0 ? (
            <EmptyState
              icon={<Landmark size={24} />}
              title="Aucune sortie trouvée"
              description="Crée la première activité terrain pour démarrer le suivi hebdomadaire."
            />
          ) : (
            <div className={cardCls}>
              <div className="divide-y divide-border">
                {visibleItems.map((item) => {
                  const typeLabel = TYPE_OPTIONS[item.activity_type]?.label || item.activity_type;
                  const status = STATUS_MAP[item.status] || STATUS_MAP.planned;
                  return (
                    <div key={item.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{typeLabel}</p>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {item.role_label && <Badge>{item.role_label}</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatDate(item.activity_date)}
                            {item.created_by_name ? ` • ${item.created_by_name}` : ''}
                          </p>
                        </div>
                        {item.amount ? (
                          <div className="text-right">
                            <p className="text-sm font-bold text-foreground">{formatCurrency(item.amount)}</p>
                            {item.bank_name && <p className="text-xs text-muted-foreground">{item.bank_name}</p>}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {item.property_name && <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700/40">Bien: {item.property_name}</span>}
                        {item.apartment_name && <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700/40">Appartement: {item.apartment_name}</span>}
                        {item.bank_name && <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700/40">Banque: {item.bank_name}</span>}
                      </div>

                      {item.notes && (
                        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-700/20 dark:text-slate-300">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
