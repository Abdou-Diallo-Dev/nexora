'use client';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { PageHeader, inputCls, selectCls, labelCls, btnPrimary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

export default function NotificationsPage(){
  const{company}=useAuthStore();
  const[form,setForm]=useState({channel:'email',subject:'',body:'',recipient:''});
  const[loading,setLoading]=useState(false);
  const set=(k:string,v:string)=>setForm(f=>({...f,[k]:v}));

  const send=async(e:React.FormEvent)=>{
    e.preventDefault();setLoading(true);
    try{
      const res=await fetch('/api/notifications/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,company_id:company?.id})});
      if(res.ok){toast.success('Notification envoyée !');setForm({channel:'email',subject:'',body:'',recipient:''});}
      else{const d=await res.json();toast.error(d.error||"Erreur d'envoi");}
    }catch{toast.error('Erreur réseau');}
    finally{setLoading(false);}
  };

  return(
    <div>
      <PageHeader title="Notifications" subtitle="Envoyez des notifications à vos locataires"/>
      <form onSubmit={send} className={cardCls+' p-6 max-w-2xl'}>
        <div className="space-y-4">
          <div><label className={labelCls}>Canal d&apos;envoi</label>
            <select value={form.channel} onChange={e=>set('channel',e.target.value)} className={selectCls}>
              <option value="email">Email</option>
              <option value="sms">SMS (Africa&apos;s Talking)</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div><label className={labelCls}>{form.channel==='email'?'Email destinataire':'Numéro de téléphone'} *</label>
            <input value={form.recipient} onChange={e=>set('recipient',e.target.value)} required placeholder={form.channel==='email'?'locataire@email.com':'+221 77 000 00 00'} className={inputCls}/>
          </div>
          {form.channel==='email'&&<div><label className={labelCls}>Objet *</label><input value={form.subject} onChange={e=>set('subject',e.target.value)} required className={inputCls}/></div>}
          <div><label className={labelCls}>Message *</label>
            <textarea value={form.body} onChange={e=>set('body',e.target.value)} required rows={5} className={inputCls} placeholder="Rédigez votre message..."/>
          </div>
          <button type="submit" disabled={loading} className={btnPrimary}><Send size={16}/>{loading?'Envoi...':'Envoyer'}</button>
        </div>
      </form>
    </div>
  );
}
