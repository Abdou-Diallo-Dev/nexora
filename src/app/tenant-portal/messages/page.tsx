'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, inputCls } from '@/components/ui';
import { formatDateRelative } from '@/lib/utils';
import { toast } from 'sonner';

type Message = { id:string; content:string; sender_role:string; created_at:string };

export default function TenantMessagesPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string|null>(null);
  const [companyId, setCompanyId] = useState<string|null>(null);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    createClient().from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(({ data: ta }) => {
        if (!ta) { setLoading(false); return; }
        setTenantId(ta.tenant_id);
        setCompanyId(ta.company_id);
        createClient().from('messages').select('*')
          .eq('tenant_id', ta.tenant_id).eq('company_id', ta.company_id)
          .order('created_at', { ascending:true })
          .then(({ data }) => {
            setMessages((data||[]) as Message[]);
            setLoading(false);
            // Mark company messages as read
            createClient().from('messages').update({ is_read:true } as never)
              .eq('tenant_id', ta.tenant_id).eq('sender_role','company');
            setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}), 100);
          });
      });
  }, [user?.id]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !tenantId || !companyId) return;
    setSending(true);
    const { data, error } = await createClient().from('messages').insert({
      company_id:companyId, tenant_id:tenantId,
      sender_role:'tenant', sender_id:user?.id,
      content:newMsg.trim(), is_read:false,
    } as never).select().single();
    if (error) { toast.error('Erreur envoi'); setSending(false); return; }
    setMessages(prev => [...prev, data as Message]);
    setNewMsg('');
    setSending(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}), 100);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div className="flex flex-col" style={{height:'calc(100vh - 180px)'}}>
      <h1 className="text-xl font-bold text-foreground mb-4">Messagerie</h1>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length===0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <MessageSquare size={36} className="opacity-30"/>
            <p className="text-sm">Aucun message. Posez votre question !</p>
          </div>
        )}
        {messages.map(m => {
          const isTenant = m.sender_role === 'tenant';
          return (
            <div key={m.id} className={'flex '+(isTenant?'justify-end':'justify-start')}>
              <div className={'max-w-xs px-4 py-2.5 rounded-2xl text-sm '+(isTenant?'bg-primary text-white rounded-br-sm':'bg-white dark:bg-slate-800 border border-border text-foreground rounded-bl-sm')}>
                {!isTenant && <p className="text-[10px] font-semibold text-primary mb-1">Votre gestionnaire</p>}
                <p>{m.content}</p>
                <p className={'text-[10px] mt-1 '+(isTenant?'text-blue-200':'text-muted-foreground')}>{formatDateRelative(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      <div className="flex gap-2 pt-3 border-t border-border">
        <input value={newMsg} onChange={e=>setNewMsg(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),sendMessage())}
          placeholder="Votre message..." className={inputCls+' flex-1'}/>
        <button onClick={sendMessage} disabled={sending||!newMsg.trim()}
          className="px-4 py-2 bg-primary text-white rounded-xl disabled:opacity-50 transition-colors">
          {sending ? <LoadingSpinner size={14}/> : <Send size={15}/>}
        </button>
      </div>
    </div>
  );
}