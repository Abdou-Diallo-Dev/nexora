'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, Shield, Bell, Database, Globe, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminSettings() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const [generalSettings, setGeneralSettings] = useState({
    platform_name: 'SaaS Platform',
    support_email: 'support@saasplatform.com',
    max_companies: 1000,
    max_users_per_company: 50,
    allow_registration: true,
    maintenance_mode: false,
  });

  const [notifSettings, setNotifSettings] = useState({
    notify_new_registration: true,
    notify_payment_failed: true,
    notify_company_inactive: false,
    admin_email: 'admin@saasplatform.com',
  });

  const handleSave = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success('Paramètres sauvegardés');
    setLoading(false);
  };

  const tabs = [
    { id: 'general', label: 'Général', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'maintenance', label: 'Maintenance', icon: Database },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Paramètres plateforme</h1>
        <p className="text-slate-400 text-sm mt-1">Configuration globale du système</p>
      </div>

      <div className="flex gap-6">
        {/* Tabs sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-red-600/10 text-red-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}>
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <h2 className="font-semibold text-white text-lg">Configuration générale</h2>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom de la plateforme</label>
                <input value={generalSettings.platform_name}
                  onChange={e => setGeneralSettings(s => ({ ...s, platform_name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email du support</label>
                <input type="email" value={generalSettings.support_email}
                  onChange={e => setGeneralSettings(s => ({ ...s, support_email: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Max entreprises</label>
                  <input type="number" value={generalSettings.max_companies}
                    onChange={e => setGeneralSettings(s => ({ ...s, max_companies: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Max users / entreprise</label>
                  <input type="number" value={generalSettings.max_users_per_company}
                    onChange={e => setGeneralSettings(s => ({ ...s, max_users_per_company: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { key: 'allow_registration', label: 'Autoriser les nouvelles inscriptions', desc: 'Les utilisateurs peuvent créer un compte' },
                  { key: 'maintenance_mode', label: 'Mode maintenance', desc: 'Bloque l\'accès sauf pour les super admins' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                    <div>
                      <p className="font-medium text-white text-sm">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={generalSettings[key as keyof typeof generalSettings] as boolean}
                        onChange={e => setGeneralSettings(s => ({ ...s, [key]: e.target.checked }))}
                        className="sr-only peer" />
                      <div className="w-10 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={handleSave} disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Sauvegarder
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <h2 className="font-semibold text-white text-lg">Notifications admin</h2>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email de l&apos;admin</label>
                <input type="email" value={notifSettings.admin_email}
                  onChange={e => setNotifSettings(s => ({ ...s, admin_email: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-3">
                {[
                  { key: 'notify_new_registration', label: 'Nouvelle inscription', desc: 'Notifier quand une entreprise s\'inscrit' },
                  { key: 'notify_payment_failed', label: 'Paiement échoué', desc: 'Alertes sur les échecs de paiement' },
                  { key: 'notify_company_inactive', label: 'Entreprise inactive', desc: 'Notification d\'inactivité prolongée' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                    <div>
                      <p className="font-medium text-white text-sm">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={notifSettings[key as keyof typeof notifSettings] as boolean}
                        onChange={e => setNotifSettings(s => ({ ...s, [key]: e.target.checked }))}
                        className="sr-only peer" />
                      <div className="w-10 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={handleSave} disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Sauvegarder
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-white text-lg">Sécurité</h2>
              <div className="p-4 bg-slate-800/50 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white text-sm">Authentification 2FA</p>
                    <p className="text-xs text-slate-500 mt-0.5">Obliger la 2FA pour tous les super admins</p>
                  </div>
                  <span className="text-xs bg-orange-900/30 text-orange-400 border border-orange-800 px-2 py-0.5 rounded-full">Recommandé</span>
                </div>
                <button className="text-sm text-blue-400 hover:underline">Configurer</button>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-xl">
                <p className="font-medium text-white text-sm mb-1">Sessions actives</p>
                <p className="text-xs text-slate-500 mb-3">Gérer toutes les sessions connectées</p>
                <button className="text-sm text-red-400 hover:underline">Révoquer toutes les sessions</button>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-xl">
                <p className="font-medium text-white text-sm mb-1">Journaux d&apos;audit</p>
                <p className="text-xs text-slate-500 mb-3">Historique complet des actions admin</p>
                <button className="text-sm text-blue-400 hover:underline">Voir les journaux</button>
              </div>
            </motion.div>
          )}

          {activeTab === 'maintenance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-white text-lg">Maintenance</h2>
              <div className="p-4 bg-amber-900/20 border border-amber-800/50 rounded-xl flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300">Ces opérations affectent toutes les entreprises. Procédez avec précaution.</p>
              </div>
              {[
                { label: 'Vider le cache', desc: 'Supprimer les données mises en cache', btn: 'Vider', color: 'bg-slate-700 hover:bg-slate-600' },
                { label: 'Recalculer les statistiques', desc: 'Forcer la mise à jour de toutes les métriques', btn: 'Recalculer', color: 'bg-blue-700 hover:bg-blue-600' },
                { label: 'Exporter les données', desc: 'Exporter toutes les données en CSV', btn: 'Exporter', color: 'bg-emerald-700 hover:bg-emerald-600' },
                { label: 'Purger les logs anciens', desc: 'Supprimer les logs de plus de 90 jours', btn: 'Purger', color: 'bg-red-700 hover:bg-red-600' },
              ].map(({ label, desc, btn, color }) => (
                <div key={label} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                  <div>
                    <p className="font-medium text-white text-sm">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                  <button onClick={() => { toast.info(`${label} en cours...`); }}
                    className={`px-4 py-2 text-white text-xs font-medium rounded-lg transition-colors ${color}`}>
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
