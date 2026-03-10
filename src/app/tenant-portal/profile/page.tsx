'use client';
import { useEffect, useState } from 'react';
import { Save, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, inputCls, labelCls } from '@/components/ui';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { toast } from 'sonner';

export default function TenantProfilePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string|null>(null);
  const [form, setForm] = useState({ first_name:'', last_name:'', phone:'' });
  const [avatarUrl, setAvatarUrl] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    createClient().from('tenant_accounts').select('tenant_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data: ta }) => {
        if (!ta) { setLoading(false); return; }
        setTenantId(ta.tenant_id);
        const { data } = await createClient().from('tenants').select('first_name,last_name,phone,avatar_url').eq('id', ta.tenant_id).maybeSingle();
        if (data) {
          setForm({ first_name:data.first_name||'', last_name:data.last_name||'', phone:data.phone||'' });
          setAvatarUrl(data.avatar_url||null);
        }
        setLoading(false);
      });
  }, [user?.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    await createClient().from('tenants').update({ ...form, avatar_url:avatarUrl } as never).eq('id', tenantId);
    setSaving(false);
    toast.success('Profil mis à jour !');
  };

  const logout = async () => {
    await createClient().auth.signOut();
    router.push('/auth/login');
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-foreground">Mon profil</h1>

      <form onSubmit={save} className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-5 space-y-5">
        {/* Avatar */}
        <div className="flex justify-center">
          <ImageUpload bucket="avatars" folder={tenantId||'tenants'} value={avatarUrl} onChange={setAvatarUrl} shape="circle" size="lg"/>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Prénom</label>
            <input value={form.first_name} onChange={e=>setForm(f=>({...f,first_name:e.target.value}))} className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Nom</label>
            <input value={form.last_name} onChange={e=>setForm(f=>({...f,last_name:e.target.value}))} className={inputCls}/>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Téléphone</label>
            <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+221 77 000 00 00" className={inputCls}/>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Email</label>
            <input value={user?.email||''} disabled className={inputCls+' opacity-60 cursor-not-allowed'}/>
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
          {saving ? <LoadingSpinner size={15}/> : <Save size={15}/>} Enregistrer
        </button>
      </form>

      <button onClick={logout} className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
        <LogOut size={15}/> Se déconnecter
      </button>
    </div>
  );
}