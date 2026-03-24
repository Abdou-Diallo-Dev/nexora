'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

type Tenant = { id:string; first_name:string; last_name:string };
type Lease = { id:string; tenant_id:string; properties:{name:string}|null };

function NewNoticePageContent() {
  const { company, user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledTenant = searchParams?.get('tenant') || '';
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [filteredLeases, setFilteredLeases] = useState<Lease[]>([]);
  const [form, setForm] = useState({
    tenant_id: prefilledTenant,
    lease_id: '',
    type: 'notice',
    notice_date: new Date().toISOString().split('T')[0],
    exit_date: '',
    reason: '',
    notes: '',
  });
  const set = (k:string,v:string) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    Promise.all([
      sb.from('tenants').select('id,first_name,last_name').eq('company_id',company.id).eq('status','active'),
      sb.from('leases').select('id,tenant_id,properties(name)').eq('company_id',company.id).eq('status','active'),
    ]).then(([{data:t},{data:l}]) => {
      setTenants((t||[]) as Tenant[]);
      setLeases((l||[]) as unknown as Lease[]);
      if (prefilledTenant) {
        setFilteredLeases(((l||[]) as unknown as Lease[]).filter(ls=>ls.tenant_id===prefilledTenant));
      }
    });
  }, [company?.id]);

  const handleTenantChange = (tenantId: string) => {
    set('tenant_id', tenantId);
    set('lease_id', '');
    setFilteredLeases(leases.filter(l=>l.tenant_id===tenantId));
  };

  // Auto-calculate exit date (1 month from notice for standard)
  const handleTypeChange = (type: string) => {
    set('type', type);
    if (type === 'notice' && form.notice_date) {
      const d = new Date(form.notice_date);
      d.setMonth(d.getMonth() + 1);
      set('exit_date', d.toISOString().split('T')[0]);
    }
  };

  const RISK_MAP: Record<string,string> = {
    notice: 'notice',
    expulsion: 'expulsion',
    departure: 'notice',
    renewal: 'normal',
  };

  const save = async () => {
    if (!form.tenant_id || !form.notice_date) { toast.error('Locataire et date requis'); return; }
    setSaving(true);
    const sb = createClient();

    // Insert notice
    const { error } = await sb.from('tenant_notices').insert({
      company_id: company!.id,
      tenant_id: form.tenant_id,
      lease_id: form.lease_id || null,
      type: form.type,
      notice_date: form.notice_date,
      exit_date: form.exit_date || null,
      reason: form.reason || null,
      notes: form.notes || null,
      status: 'active',
      created_by: user?.id,
    });

    if (error) { toast.error(error.message); setSaving(false); return; }

    // Update tenant risk level
    await sb.from('tenants').update({
      risk_level: RISK_MAP[form.type] || 'at_risk',
      notice_date: form.notice_date,
      exit_date: form.exit_date || null,
      exit_reason: form.reason || null,
    }).eq('id', form.tenant_id);

    toast.success('Préavis enregistré ✓');
    router.push('/real-estate/notices');
    setSaving(false);
  };

  const TYPE_INFO: Record<string,string> = {
    notice: '⚠️ Préavis de départ standard — 1 mois minimum recommandé',
    expulsion: '🚨 Procédure d\'expulsion — Motif obligatoire',
    departure: '✅ Départ volontaire du locataire',
    renewal: '🔄 Renouvellement / reconduction du bail',
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/notices" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><ArrowLeft size={18}/></Link>
        <PageHeader title="Nouveau préavis" subtitle="Enregistrer un préavis ou une sortie"/>
      </div>
      <div className="max-w-2xl">
        <div className={cardCls+' p-6 space-y-4'}>

          {/* Type */}
          <div>
            <label className={labelCls}>Type *</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                {v:'notice',    l:'⚠️ Préavis', color:'border-amber-300 bg-amber-50 text-amber-700'},
                {v:'expulsion', l:'🚨 Expulsion', color:'border-red-300 bg-red-50 text-red-700'},
                {v:'departure', l:'✅ Départ volontaire', color:'border-blue-300 bg-blue-50 text-blue-700'},
                {v:'renewal',   l:'🔄 Renouvellement', color:'border-green-300 bg-green-50 text-green-700'},
              ].map(t=>(
                <button key={t.v} type="button" onClick={()=>handleTypeChange(t.v)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${form.type===t.v?t.color:'border-border text-muted-foreground hover:border-primary/40'}`}>
                  {t.l}
                </button>
              ))}
            </div>
            {TYPE_INFO[form.type] && (
              <p className="text-xs text-muted-foreground mt-2 italic">{TYPE_INFO[form.type]}</p>
            )}
          </div>

          {/* Locataire */}
          <div>
            <label className={labelCls}>Locataire *</label>
            <select value={form.tenant_id} onChange={e=>handleTenantChange(e.target.value)} className={selectCls+' w-full'}>
              <option value="">Sélectionner un locataire...</option>
              {tenants.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>

          {/* Bail */}
          {filteredLeases.length > 0 && (
            <div>
              <label className={labelCls}>Bail concerné</label>
              <select value={form.lease_id} onChange={e=>set('lease_id',e.target.value)} className={selectCls+' w-full'}>
                <option value="">— Sélectionner —</option>
                {filteredLeases.map(l=><option key={l.id} value={l.id}>{l.properties?.name}</option>)}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date du préavis *</label>
              <input type="date" value={form.notice_date} onChange={e=>set('notice_date',e.target.value)} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Date de sortie prévue</label>
              <input type="date" value={form.exit_date} onChange={e=>set('exit_date',e.target.value)} className={inputCls}/>
            </div>
          </div>

          {/* Motif */}
          <div>
            <label className={labelCls}>Motif {form.type==='expulsion'?'*':''}</label>
            <select value={form.reason} onChange={e=>set('reason',e.target.value)} className={selectCls+' w-full'}>
              <option value="">Sélectionner un motif...</option>
              <optgroup label="Départ locataire">
                <option value="Fin de bail">Fin de bail</option>
                <option value="Mutation professionnelle">Mutation professionnelle</option>
                <option value="Achat immobilier">Achat immobilier</option>
                <option value="Raisons personnelles">Raisons personnelles</option>
              </optgroup>
              <optgroup label="Initiative bailleur">
                <option value="Non-paiement loyer">Non-paiement loyer</option>
                <option value="Troubles de voisinage">Troubles de voisinage</option>
                <option value="Dégradations du logement">Dégradations du logement</option>
                <option value="Reprise pour usage personnel">Reprise pour usage personnel</option>
                <option value="Vente du bien">Vente du bien</option>
              </optgroup>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes / Observations</label>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} className={inputCls+' resize-none w-full'} placeholder="Détails supplémentaires..."/>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving||!form.tenant_id} className={btnPrimary+' flex-1 justify-center'}>
              {saving?<LoadingSpinner size={15}/>:<Bell size={15}/>}
              {saving?'Enregistrement...':'Enregistrer le préavis'}
            </button>
            <Link href="/real-estate/notices" className={btnSecondary}>Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewNoticePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSpinner size={36}/></div>}>
      <NewNoticePageContent />
    </Suspense>
  );
}
