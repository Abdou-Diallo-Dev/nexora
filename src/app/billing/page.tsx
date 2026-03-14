'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { Zap, Check, Crown } from 'lucide-react';

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    price: 30000,
    popular: true,
    features: [
      'Biens illimités',
      'Locataires illimités',
      'Paiement en ligne Wave & Orange Money',
      'Génération de contrats PDF',
      'Résiliation et décharge automatiques',
      'Messagerie locataires',
      'Signalements et tickets',
      'Analyse financière',
      'Support prioritaire',
    ],
  },
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const { user, company } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('subscriptions')
      .select('*')
      .eq('company_id', company.id)
      .maybeSingle()
      .then(({ data }) => setSubscription(data));
  }, [company?.id]);

  const handleSubscribe = async (plan: typeof PLANS[0]) => {
    if (!user || !company) return;
    setLoading(plan.id);
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          itemName: `Abonnement Nexora ${plan.name} — 1 mois`,
          amount: plan.price,
          commandName: `SUB_${plan.id.toUpperCase()}_${company.id}`,
        }),
      });
      const data = await res.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch {
      alert('Erreur réseau');
    }
    setLoading(null);
  };

  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', color: '#F8FAFC', fontFamily: 'DM Sans, sans-serif', padding: '3rem 1.5rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem' }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#3B82F6,#2563EB)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} color="#fff" />
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Nexora</span>
        </div>

        {reason === 'trial_expired' && (
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            <p style={{ color: '#FCA5A5', fontWeight: 600 }}>Votre période d'essai gratuit est terminée</p>
            <p style={{ color: '#94A3B8', fontSize: '.875rem', marginTop: '.25rem' }}>Abonnez-vous pour continuer à utiliser Nexora.</p>
          </div>
        )}

        {reason === 'subscription_expired' && (
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            <p style={{ color: '#FCA5A5', fontWeight: 600 }}>Votre abonnement a expiré</p>
            <p style={{ color: '#94A3B8', fontSize: '.875rem', marginTop: '.25rem' }}>Renouvelez votre abonnement pour continuer.</p>
          </div>
        )}

        {subscription?.status === 'trial' && trialDaysLeft > 0 && (
          <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            <p style={{ color: '#86EFAC', fontWeight: 600 }}>🎉 Essai gratuit — {trialDaysLeft} jours restants</p>
            <p style={{ color: '#94A3B8', fontSize: '.875rem', marginTop: '.25rem' }}>Profitez de toutes les fonctionnalités gratuitement.</p>
          </div>
        )}

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '.75rem' }}>Choisissez votre plan</h1>
        <p style={{ color: '#94A3B8', fontSize: '1rem' }}>Paiement sécurisé via Wave, Orange Money ou carte bancaire</p>
      </div>

      {/* Plan */}
      <div style={{ maxWidth: '420px', margin: '0 auto' }}>
        {PLANS.map(plan => (
          <div key={plan.id} style={{
            background: 'rgba(37,99,235,.12)',
            border: '2px solid rgba(37,99,235,.5)',
            borderRadius: '20px',
            padding: '2.5rem',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#fff', padding: '.35rem 1.25rem', borderRadius: '100px', fontSize: '.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <Crown size={12} /> Accès complet à toutes les fonctionnalités
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '.5rem', textAlign: 'center' }}>Plan {plan.name}</h2>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{plan.price.toLocaleString()}</span>
              <span style={{ color: '#94A3B8', fontSize: '.9rem' }}> FCFA / mois</span>
            </div>
            <ul style={{ listStyle: 'none', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '.9rem', color: '#CBD5E1' }}>
                  <Check size={16} color="#22C55E" strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan)}
              disabled={loading === plan.id}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg,#3B82F6,#2563EB)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading === plan.id ? 'not-allowed' : 'pointer',
                opacity: loading === plan.id ? .7 : 1,
              }}
            >
              {loading === plan.id ? 'Redirection...' : 'S\'abonner maintenant →'}
            </button>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', color: '#475569', fontSize: '.8rem', marginTop: '2.5rem' }}>
        Paiement sécurisé via PayTech · Wave · Orange Money · Visa/Mastercard
      </p>
    </div>
  );
}