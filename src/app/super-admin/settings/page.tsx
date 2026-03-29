'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, Shield, Bell, Database, Globe, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cardCls, inputCls, labelCls, btnPrimary } from '@/components/ui';

const NX_BLUE   = '#1e40af';
const NX_ACCENT = '#93c5fd';

export default function SuperAdminSettings() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const [generalSettings, setGeneralSettings] = useState({
    platform_name: 'Nexora',
    support_email: 'support@nexora.sn',
    max_companies: 1000,
    max_users_per_company: 50,
    allow_registration: true,
    maintenance_mode: false,
  });

  const [notifSettings, setNotifSettings] = useState({
    notify_new_registration: true,
    notify_payment_failed: true,
    notify_company_inactive: false,
    admin_email: 'admin@nexora.sn',
  });

  const handleSave = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success('Paramètres sauvegardés');
    setLoading(false);
  };

  const tabs = [
    { id: 'general',       label: 'Général',       icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security',      label: 'Sécurité',      icon: Shield },
    { id: 'maintenance',   label: 'Maintenance',   icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-foreground">Paramètres plateforme</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configuration globale du système Nexora</p>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">

        {/* Tabs sidebar */}
        <div className="md:w-44 flex-shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
                  style={active
                    ? { background: `rgba(30,64,175,0.10)`, color: NX_BLUE, borderLeft: `3px solid ${NX_BLUE}` }
                    : { color: 'var(--muted-foreground)', borderLeft: '3px solid transparent' }
                  }>
                  <Icon size={15}/>
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">

          {activeTab === 'general' && (
            <motion.div key="general" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cardCls+' p-6 space-y-5'}>
              <h2 className="font-bold text-foreground text-base">Configuration générale</h2>

              <div>
                <label className={labelCls}>Nom de la plateforme</label>
                <input value={generalSettings.platform_name}
                  onChange={e => setGeneralSettings(s => ({ ...s, platform_name: e.target.value }))}
                  className={inputCls}/>
              </div>

              <div>
                <label className={labelCls}>Email du support</label>
                <input type="email" value={generalSettings.support_email}
                  onChange={e => setGeneralSettings(s => ({ ...s, support_email: e.target.value }))}
                  className={inputCls}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Max filiales</label>
                  <input type="number" value={generalSettings.max_companies}
                    onChange={e => setGeneralSettings(s => ({ ...s, max_companies: Number(e.target.value) }))}
                    className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Max users / filiale</label>
                  <input type="number" value={generalSettings.max_users_per_company}
                    onChange={e => setGeneralSettings(s => ({ ...s, max_users_per_company: Number(e.target.value) }))}
                    className={inputCls}/>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {[
                  { key: 'allow_registration', label: 'Autoriser les nouvelles inscriptions', desc: 'Les utilisateurs peuvent créer un compte' },
                  { key: 'maintenance_mode',   label: 'Mode maintenance', desc: "Bloque l'accès sauf pour les super admins" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox"
                        checked={generalSettings[key as keyof typeof generalSettings] as boolean}
                        onChange={e => setGeneralSettings(s => ({ ...s, [key]: e.target.checked }))}
                        className="sr-only peer"/>
                      <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"
                        data-active={generalSettings[key as keyof typeof generalSettings]}/>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-1">
                <button onClick={handleSave} disabled={loading} className={btnPrimary}>
                  {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                  Sauvegarder
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cardCls+' p-6 space-y-5'}>
              <h2 className="font-bold text-foreground text-base">Notifications admin</h2>
              <div>
                <label className={labelCls}>Email de l'admin</label>
                <input type="email" value={notifSettings.admin_email}
                  onChange={e => setNotifSettings(s => ({ ...s, admin_email: e.target.value }))}
                  className={inputCls}/>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'notify_new_registration', label: 'Nouvelle inscription',    desc: "Notifier quand une filiale s'inscrit" },
                  { key: 'notify_payment_failed',   label: 'Paiement échoué',         desc: "Alertes sur les échecs de paiement" },
                  { key: 'notify_company_inactive', label: 'Filiale inactive',         desc: "Notification d'inactivité prolongée" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox"
                        checked={notifSettings[key as keyof typeof notifSettings] as boolean}
                        onChange={e => setNotifSettings(s => ({ ...s, [key]: e.target.checked }))}
                        className="sr-only peer"/>
                      <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"/>
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={handleSave} disabled={loading} className={btnPrimary}>
                  {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                  Sauvegarder
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div key="security" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cardCls+' p-6 space-y-4'}>
              <h2 className="font-bold text-foreground text-base">Sécurité</h2>
              <div className="p-4 rounded-xl border border-border space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">Authentification 2FA</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Obliger la 2FA pour tous les super admins</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(30,64,175,0.12)', color: '#1e3a8a' }}>Recommandé</span>
                </div>
                <button className="text-sm font-semibold hover:underline" style={{ color: NX_BLUE }}>Configurer</button>
              </div>
              <div className="p-4 rounded-xl border border-border">
                <p className="font-semibold text-foreground text-sm mb-1">Sessions actives</p>
                <p className="text-xs text-muted-foreground mb-3">Gérer toutes les sessions connectées</p>
                <button className="text-sm text-red-500 font-semibold hover:underline">Révoquer toutes les sessions</button>
              </div>
              <div className="p-4 rounded-xl border border-border">
                <p className="font-semibold text-foreground text-sm mb-1">Journaux d'audit</p>
                <p className="text-xs text-muted-foreground mb-3">Historique complet des actions admin</p>
                <button className="text-sm font-semibold hover:underline" style={{ color: NX_BLUE }}>Voir les journaux</button>
              </div>
            </motion.div>
          )}

          {activeTab === 'maintenance' && (
            <motion.div key="maintenance" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cardCls+' p-6 space-y-4'}>
              <h2 className="font-bold text-foreground text-base">Maintenance</h2>
              <div className="p-4 rounded-2xl flex items-start gap-3"
                style={{ background: 'rgba(30,64,175,0.06)', border: '1px solid rgba(30,64,175,0.20)' }}>
                <AlertTriangle size={18} style={{ color: NX_ACCENT }} className="flex-shrink-0 mt-0.5"/>
                <p className="text-sm" style={{ color: '#1e3a8a' }}>
                  Ces opérations affectent toutes les filiales. Procédez avec précaution.
                </p>
              </div>
              {[
                { label: 'Vider le cache',             desc: 'Supprimer les données mises en cache',          btn: 'Vider',      style: { background: 'rgba(30,64,175,0.10)', color: NX_BLUE } },
                { label: 'Recalculer les statistiques', desc: 'Forcer la mise à jour de toutes les métriques', btn: 'Recalculer', style: { background: NX_BLUE, color: '#fff' } },
                { label: 'Exporter les données',        desc: 'Exporter toutes les données en CSV',            btn: 'Exporter',   style: { background: 'rgba(34,197,94,0.12)', color: '#15803d' } },
                { label: 'Purger les logs anciens',     desc: 'Supprimer les logs de plus de 90 jours',        btn: 'Purger',     style: { background: 'rgba(239,68,68,0.10)', color: '#dc2626' } },
              ].map(({ label, desc, btn, style }) => (
                <div key={label} className="flex items-center justify-between p-4 rounded-xl border border-border">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <button onClick={() => toast.info(`${label} en cours...`)}
                    className="px-4 py-2 text-xs font-bold rounded-lg transition-opacity hover:opacity-80"
                    style={style}>
                    {btn}
                  </button>
                </div>
              ))}
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
