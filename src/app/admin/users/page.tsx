'use client';
import { useEffect, useState } from 'react';
import { Users, UserPlus, Shield, Eye, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, AppUser } from '@/lib/store';
import { PageHeader, Badge, LoadingSpinner, EmptyState, Pagination, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls, BadgeVariant } from '@/components/ui';
import { formatDate, getInitials } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const ROLE_META: Record<string, { label: string; variant: BadgeVariant }> = {
  super_admin: { label: 'Super Admin', variant: 'error' },
  admin: { label: 'Admin', variant: 'purple' },
  manager: { label: 'Manager', variant: 'info' },
  agent: { label: 'Agent', variant: 'success' },
  viewer: { label: 'Lecteur', variant: 'default' },
};

export default function UsersPage() {
  const { company, user: me } = useAuthStore();
  const [items, setItems] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'agent', password: '' });
  const [saving, setSaving] = useState(false);
  const { debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(15);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    createClient().from('users')
      .select('*', { count: 'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .then(({ data, count }) => { setItems((data || []) as AppUser[]); setTotal(count || 0); setLoading(false); });
  };

  useEffect(load, [company?.id, debounced, offset, pageSize]);

  const toggleActive = async (u: AppUser) => {
    await createClient().from('users').update({ is_active: !u.is_active } as never).eq('id', u.id);
    toast.success(u.is_active ? 'Compte désactivé' : 'Compte activé');
    load();
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const sb = createClient();
    const { data, error } = await sb.auth.admin?.createUser?.({
      email: form.email,
      password: form.password,
      email_confirm: true,
      user_metadata: { full_name: form.full_name },
    }) ?? {};
    if (error || !data?.user) {
      // Fallback: insert into users table directly
      const { error: e2 } = await sb.from('users').insert({
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        company_id: company?.id,
        is_active: true,
      } as never);
      if (e2) { toast.error(e2.message); setSaving(false); return; }
    } else {
      await sb.from('users').update({ role: form.role, company_id: company?.id } as never).eq('id', data.user.id);
    }
    toast.success('Utilisateur créé');
    setSaving(false);
    setShowModal(false);
    setForm({ email: '', full_name: '', role: 'agent', password: '' });
    load();
  };

  return (
    <div>
      <PageHeader title="Gestion des utilisateurs" subtitle={total + ' utilisateur(s)'}
        actions={
          <button onClick={() => setShowModal(true)} className={btnPrimary}>
            <UserPlus size={16} />Inviter un utilisateur
          </button>
        } />

      {loading
        ? <div className="flex items-center justify-center h-48"><LoadingSpinner size={32} /></div>
        : items.length === 0
          ? <EmptyState icon={<Users size={24} />} title="Aucun utilisateur" />
          : (
            <div className={cardCls}>
              <div className="divide-y divide-border">
                {items.map(u => {
                  const rm = ROLE_META[u.role] || { label: u.role, variant: 'default' as BadgeVariant };
                  return (
                    <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {getInitials(u.full_name || u.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{u.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="hidden md:flex items-center gap-2">
                        <Badge variant={rm.variant}>{rm.label}</Badge>
                        <Badge variant={u.is_active ? 'success' : 'default'}>{u.is_active ? 'Actif' : 'Inactif'}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(u.created_at)}</span>
                      </div>
                      {me?.id !== u.id && (
                        <button onClick={() => toggleActive(u)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          {u.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
            </div>
          )}

      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl max-w-md w-full border border-border"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h2 className="font-bold text-foreground mb-5">Inviter un utilisateur</h2>
              <form onSubmit={invite} className="space-y-4">
                <div><label className={labelCls}>Nom complet *</label><input value={form.full_name} onChange={e => set('full_name', e.target.value)} required className={inputCls} /></div>
                <div><label className={labelCls}>Email *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} required className={inputCls} /></div>
                <div><label className={labelCls}>Mot de passe temporaire *</label><input type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} className={inputCls} /></div>
                <div><label className={labelCls}>Rôle</label>
                  <select value={form.role} onChange={e => set('role', e.target.value)} className={selectCls}>
                    {[['admin', 'Administrateur'], ['manager', 'Manager'], ['agent', 'Agent'], ['viewer', 'Lecteur']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className={btnSecondary}>Annuler</button>
                  <button type="submit" disabled={saving} className={btnPrimary}>{saving ? <LoadingSpinner size={16} /> : <UserPlus size={16} />}Créer</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
