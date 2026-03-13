'use client';
import { useEffect, useState } from 'react';
import { Save, LogOut, Lock, Eye, EyeOff } from 'lucide-react';
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

  // Password change
  const [pwdForm, setPwdForm] = useState({ current:'', newPwd:'', confirm:'' });
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

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

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPwd.length < 8) { toast.error('Minimum 8 caractères'); return; }
    if (pwdForm.newPwd !== pwdForm.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    setSavingPwd(true);
    const { error } = await createClient().auth.updateUser({ password: pwdForm.newPwd });
    setSavingPwd(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Mot de passe modifié !');
    setPwdForm({ current:'', newPwd:'', confirm:'' });
  };

  const logout = async () => {
    await createClient().auth.signOut();
    router.push('/auth/login');
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-foreground">Mon profil</h1>

      {/* Infos personnelles */}
      <form onSubmit={save} className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-5 space-y-5">
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

      {/* Changer mot de passe */}
      <form onSubmit={changePassword} className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-primary"/>
          <h2 className="font-semibold text-foreground">Changer mon mot de passe</h2>
        </div>
        <div>
          <label className={labelCls}>Nouveau mot de passe</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} value={pwdForm.newPwd} required
              onChange={e=>setPwdForm(f=>({...f,newPwd:e.target.value}))}
              placeholder="Minimum 8 caractères" className={inputCls+' pr-9'}/>
            <button type="button" onClick={()=>setShowPwd(v=>!v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
        </div>
        <div>
          <label className={labelCls}>Confirmer le mot de passe</label>
          <input type={showPwd ? 'text' : 'password'} value={pwdForm.confirm} required
            onChange={e=>setPwdForm(f=>({...f,confirm:e.target.value}))}
            placeholder="Répétez le mot de passe" className={inputCls}/>
        </div>
        <button type="submit" disabled={savingPwd}
          className="w-full py-2.5 bg-slate-800 dark:bg-slate-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          {savingPwd ? <LoadingSpinner size={15}/> : <Lock size={15}/>} Modifier le mot de passe
        </button>
      </form>

      <button onClick={logout} className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
        <LogOut size={15}/> Se déconnecter
      </button>
    </div>
  );
}