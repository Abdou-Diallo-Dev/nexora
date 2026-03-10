'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Smartphone, CheckCircle, Clock, ExternalLink, Copy, Send, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import {
  PageHeader, Badge, LoadingSpinner, cardCls, btnPrimary, btnSecondary,
  selectCls, labelCls, BadgeVariant,
} from '@/components/ui';
import { formatCurrency, formatMonth } from '@/lib/utils';
import { toast } from 'sonner';

type Payment = {
  id: string; amount: number; charges_amount: number;
  period_month: number; period_year: number; status: string;
  payment_method: string; reference: string | null;
  leases: {
    tenants: { first_name: string; last_name: string; email: string; phone: string | null } | null;
    properties: { name: string; address: string } | null;
  } | null;
};

type Transaction = {
  id: string; reference: string; amount: number; provider: string;
  status: string; payment_url: string | null; tenant_name: string | null;
  created_at: string;
};

const PROVIDERS = [
  { id: 'cinetpay',     label: 'CinetPay',    desc: 'Carte + Mobile Money', color: 'bg-blue-500',   available: true  },
  { id: 'wave',         label: 'Wave',         desc: 'Wave Mobile Money',    color: 'bg-teal-500',   available: false },
  { id: 'orange_money', label: 'Orange Money', desc: 'Orange Money SN',      color: 'bg-orange-500', available: false },
  { id: 'free_money',   label: 'Free Money',   desc: 'Free Money SN',        color: 'bg-red-500',    available: false },
];

const TX_STATUS: Record<string,{l:string;v:BadgeVariant}> = {
  pending: { l:'En attente', v:'warning' },
  success: { l:'Reussi',     v:'success' },
  failed:  { l:'Echoue',     v:'error'   },
};

export default function OnlinePaymentPage() {
  const { company } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('cinetpay');
  const [initiating, setInitiating] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    Promise.all([
      sb.from('rent_payments')
        .select('*,leases(tenants(first_name,last_name,email,phone),properties(name,address))')
        .eq('company_id', company.id)
        .in('status', ['pending', 'late', 'overdue'])
        .order('period_year', { ascending: false })
        .limit(50),
      sb.from('online_transactions')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]).then(([pRes, tRes]) => {
      setPayments(pRes.data as unknown as Payment[] || []);
      setTransactions(tRes.data as unknown as Transaction[] || []);
      setLoading(false);
    });
  }, [company?.id]);

  const handleInitiatePayment = async () => {
    if (!selectedPayment || !company) return;
    const tenant = selectedPayment.leases?.tenants;
    if (!tenant) { toast.error('Locataire introuvable'); return; }

    setInitiating(true);
    setPaymentLink(null);

    const total = (Number(selectedPayment.amount) || 0) + (Number(selectedPayment.charges_amount) || 0);

    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          amount: total,
          tenant_name: `${tenant.first_name} ${tenant.last_name}`,
          tenant_phone: tenant.phone || '',
          tenant_email: tenant.email,
          description: `Loyer ${formatMonth(selectedPayment.period_month, selectedPayment.period_year)}`,
          company_id: company.id,
          payment_id: selectedPayment.id,
        }),
      });

      const data = await res.json();

      if (data.payment_url) {
        setPaymentLink(data.payment_url);
        toast.success('Lien de paiement genere !');
      } else {
        // Mode test fallback
        const fakeUrl = `https://sandbox.cinetpay.com/payment/test?amount=${total}&ref=${data.reference || 'TEST-001'}`;
        setPaymentLink(fakeUrl);
        toast.success('Lien sandbox genere (mode test)');
      }

      // Refresh transactions
      const sb = createClient();
      const { data: txData } = await sb.from('online_transactions')
        .select('*').eq('company_id', company.id)
        .order('created_at', { ascending: false }).limit(20);
      setTransactions(txData as unknown as Transaction[] || []);

    } catch {
      toast.error('Erreur reseau');
    }
    setInitiating(false);
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Lien copie !');
  };

  const sendWhatsApp = (url: string, phone: string | null) => {
    if (!phone) { toast.error('Numero manquant'); return; }
    const clean = phone.replace(/\s/g,'');
    const num = clean.startsWith('221') ? clean : '221' + clean;
    const msg = encodeURIComponent(`Bonjour, veuillez regler votre loyer via ce lien securise : ${url}`);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  return (
    <div>
      <PageHeader
        title="Paiements en ligne"
        subtitle="Generez des liens de paiement pour vos locataires"
        actions={
          <Link href="/real-estate/payments" className={btnSecondary}>
            <ArrowLeft size={16} /> Retour
          </Link>
        }
      />

      {/* Test mode banner */}
      <div className="mb-5 flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
        <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Mode Test (Sandbox CinetPay)</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Carte de test : <strong>4111 1111 1111 1111</strong> — Exp : <strong>12/25</strong> — CVV : <strong>123</strong>
            {' · '}Ajoutez vos cles dans <code>.env.local</code> pour activer la production.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Generer lien */}
        <div className="space-y-4">
          <div className={cardCls + ' p-5'}>
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-primary" />
              Generer un lien de paiement
            </h2>

            {/* 1. Choisir paiement */}
            <div className="mb-4">
              <label className={labelCls}>1. Paiement a encaisser</label>
              {loading ? <LoadingSpinner size={20} /> : (
                <select
                  className={selectCls + ' w-full'}
                  value={selectedPayment?.id || ''}
                  onChange={e => {
                    setSelectedPayment(payments.find(p => p.id === e.target.value) || null);
                    setPaymentLink(null);
                  }}
                >
                  <option value="">-- Choisir un paiement en attente --</option>
                  {payments.map(p => {
                    const t = p.leases?.tenants;
                    const total = (Number(p.amount)||0) + (Number(p.charges_amount)||0);
                    return (
                      <option key={p.id} value={p.id}>
                        {t ? `${t.first_name} ${t.last_name}` : '?'} — {formatMonth(p.period_month, p.period_year)} — {formatCurrency(total)}
                      </option>
                    );
                  })}
                </select>
              )}
              {!loading && payments.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Aucun paiement en attente.</p>
              )}
            </div>

            {/* Info paiement selectionne */}
            {selectedPayment && (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg text-sm space-y-1">
                <p><span className="text-muted-foreground">Locataire :</span> <strong>{selectedPayment.leases?.tenants?.first_name} {selectedPayment.leases?.tenants?.last_name}</strong></p>
                <p><span className="text-muted-foreground">Bien :</span> {selectedPayment.leases?.properties?.name}</p>
                <p><span className="text-muted-foreground">Periode :</span> {formatMonth(selectedPayment.period_month, selectedPayment.period_year)}</p>
                <p><span className="text-muted-foreground">Montant :</span> <strong className="text-primary text-base">{formatCurrency((Number(selectedPayment.amount)||0) + (Number(selectedPayment.charges_amount)||0))}</strong></p>
                {!selectedPayment.leases?.tenants?.phone && (
                  <p className="text-amber-600 text-xs">⚠ Telephone non renseigne — WhatsApp indisponible</p>
                )}
              </div>
            )}

            {/* 2. Choisir provider */}
            <div className="mb-4">
              <label className={labelCls}>2. Moyen de paiement</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => p.available && setSelectedProvider(p.id)}
                    disabled={!p.available}
                    className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                      selectedProvider === p.id && p.available
                        ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                        : p.available
                          ? 'border-border hover:border-primary/50'
                          : 'border-border opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full ${p.color} mb-1.5`} />
                    <p className="text-xs font-semibold text-foreground">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                    {!p.available && <span className="absolute top-1.5 right-1.5 text-[9px] bg-slate-200 dark:bg-slate-600 text-muted-foreground px-1 py-0.5 rounded-full">Bientot</span>}
                    {p.available && <span className="absolute top-1.5 right-1.5 text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full">Test</span>}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleInitiatePayment}
              disabled={!selectedPayment || initiating}
              className={btnPrimary + ' w-full justify-center'}
            >
              {initiating ? <LoadingSpinner size={16} /> : <CreditCard size={16} />}
              {initiating ? 'Generation...' : 'Generer le lien de paiement'}
            </button>
          </div>

          {/* Lien genere */}
          {paymentLink && (
            <div className={cardCls + ' p-5 border-2 border-green-200 dark:border-green-700'}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-green-600" />
                <h3 className="font-semibold text-green-700 dark:text-green-300">Lien genere !</h3>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input value={paymentLink} readOnly
                  className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-border rounded-lg px-3 py-2 font-mono" />
                <button onClick={() => copyLink(paymentLink)} className={btnSecondary + ' !px-3'}><Copy size={14} /></button>
                <a href={paymentLink} target="_blank" rel="noopener noreferrer" className={btnPrimary + ' !px-3'}><ExternalLink size={14} /></a>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => sendWhatsApp(paymentLink, selectedPayment?.leases?.tenants?.phone || null)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                >
                  <Smartphone size={14} /> WhatsApp
                </button>
                <button
                  onClick={() => {
                    const email = selectedPayment?.leases?.tenants?.email;
                    if (email) window.open(`mailto:${email}?subject=Paiement loyer&body=Bonjour, voici votre lien de paiement : ${paymentLink}`);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  <Send size={14} /> Email
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Historique transactions */}
        <div className={cardCls}>
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">Historique des transactions</h2>
          </div>
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Aucune transaction</div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map(tx => {
                const st = TX_STATUS[tx.status] || { l: tx.status, v: 'default' as BadgeVariant };
                return (
                  <div key={tx.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.tenant_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{tx.reference} · {tx.provider}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(tx.amount)}</p>
                      <Badge variant={st.v}>{st.l}</Badge>
                    </div>
                    {tx.payment_url && tx.status === 'pending' && (
                      <button onClick={() => copyLink(tx.payment_url!)} className="p-1.5 text-muted-foreground hover:text-primary">
                        <Copy size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Guide config */}
      <div className={cardCls + ' mt-6 p-5'}>
        <h3 className="font-semibold text-foreground mb-3">Configuration production (.env.local)</h3>
        <pre className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-xs font-mono text-slate-700 dark:text-slate-300 overflow-auto">
{`# CinetPay (sandbox dispo sur cinetpay.com)
CINETPAY_API_KEY=votre_api_key
CINETPAY_SITE_ID=votre_site_id

# Wave (apres inscription marchand sur wave.com)
WAVE_API_KEY=votre_wave_key
WAVE_SECRET_KEY=votre_wave_secret

# Orange Money (apres contrat marchand)
ORANGE_MONEY_CLIENT_ID=votre_client_id
ORANGE_MONEY_SECRET=votre_secret

# URL de votre application deployee
NEXT_PUBLIC_APP_URL=https://votre-domaine.com

# Webhooks a configurer dans les dashboards providers :
# CinetPay  -> https://votre-domaine.com/api/payments/webhook/cinetpay
# Wave      -> https://votre-domaine.com/api/payments/webhook/wave`}
        </pre>
      </div>
    </div>
  );
}