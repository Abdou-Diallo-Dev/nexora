'use client';
import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, Search, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, inputCls, cardCls } from '@/components/ui';
import { formatDateRelative, getInitials } from '@/lib/utils';
import { toast } from 'sonner';

type Tenant = { id:string; first_name:string; last_name:string; email:string };
type Message = { id:string; content:string; sender_role:string; created_at:string; is_read:boolean };
type Conversation = { tenant: Tenant; lastMessage: string; lastDate: string; unread: number };

export default function MessagesPage() {
  const { company, user } = useAuthStore();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Tenant|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    // Load tenants with messages
    createClient().from('tenants')
      .select('id,first_name,last_name,email')
      .eq('company_id', company.id)
      .order('first_name')
      .then(async ({ data: tenants }) => {
        if (!tenants) { setLoading(false); return; }
        const sb = createClient();
        const convList = await Promise.all(tenants.map(async t => {
          const { data: msgs } = await sb.from('messages')
            .select('content,created_at,is_read,sender_role')
            .eq('company_id', company.id)
            .eq('tenant_id', t.id)
            .order('created_at', { ascending:false })
            .limit(1);
          const last = msgs?.[0];
          const { count } = await sb.from('messages')
            .select('id', { count:'exact' })
            .eq('company_id', company.id)
            .eq('tenant_id', t.id)
            .eq('is_read', false)
            .eq('sender_role', 'tenant');
          return { tenant:t, lastMessage:last?.content||'', lastDate:last?.created_at||'', unread:count||0 };
        }));
        setConvs(convList.sort((a,b) => b.lastDate.localeCompare(a.lastDate)));
        setLoading(false);
      });
  }, [company?.id]);

  const loadMessages = async (tenant: Tenant) => {
    setSelected(tenant);
    const { data } = await createClient().from('messages')
      .select('*').eq('company_id', company!.id).eq('tenant_id', tenant.id)
      .order('created_at', { ascending:true });
    setMessages((data||[]) as Message[]);
    // Mark as read
    await createClient().from('messages').update({ is_read:true } as never)
      .eq('company_id', company!.id).eq('tenant_id', tenant.id).eq('sender_role','tenant');
    setConvs(prev => prev.map(c => c.tenant.id===tenant.id ? {...c, unread:0} : c));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selected || !company) return;
    setSending(true);
    const { data, error } = await createClient().from('messages').insert({
      company_id: company.id, tenant_id: selected.id,
      sender_role: 'company', sender_id: user?.id,
      content: newMsg.trim(), is_read: false,
    } as never).select().single();
    if (error) { toast.error('Erreur envoi'); setSending(false); return; }
    setMessages(prev => [...prev, data as Message]);
    setConvs(prev => prev.map(c => c.tenant.id===selected.id ? {...c, lastMessage:newMsg, lastDate:new Date().toISOString()} : c));
    setNewMsg('');
    setSending(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
  };

  const filtered = convs.filter(c =>
    (c.tenant.first_name+' '+c.tenant.last_name).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-5">Messagerie Locataires</h1>
      <div className={'flex gap-0 overflow-hidden rounded-2xl border border-border bg-white dark:bg-slate-800 '} style={{height:'calc(100vh - 200px)'}}>

        {/* Left: conversations */}
        <div className="w-72 flex-shrink-0 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." className={inputCls+' pl-8 text-xs py-2'}/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="flex justify-center py-8"><LoadingSpinner size={24}/></div>
              : filtered.length===0 ? <p className="text-sm text-muted-foreground text-center py-8">Aucun locataire</p>
              : filtered.map(c => (
                <button key={c.tenant.id} onClick={()=>loadMessages(c.tenant)}
                  className={'w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-border text-left '+(selected?.id===c.tenant.id?'bg-blue-50 dark:bg-blue-900/20':'')}>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {getInitials(c.tenant.first_name+' '+c.tenant.last_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground truncate">{c.tenant.first_name} {c.tenant.last_name}</p>
                      {c.unread>0 && <span className="w-5 h-5 bg-primary rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{c.unread}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.lastMessage||'Aucun message'}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Right: messages */}
        <div className="flex-1 flex flex-col">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquare size={36} className="opacity-30"/>
              <p className="text-sm">Selectionnez un locataire pour commencer</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {getInitials(selected.first_name+' '+selected.last_name)}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{selected.first_name} {selected.last_name}</p>
                  <p className="text-xs text-muted-foreground">{selected.email}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length===0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun message. Commencez la conversation !</p>}
                {messages.map(m => {
                  const isCompany = m.sender_role === 'company';
                  return (
                    <div key={m.id} className={'flex '+(isCompany?'justify-end':'justify-start')}>
                      <div className={'max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm '+(isCompany?'bg-primary text-white rounded-br-sm':'bg-slate-100 dark:bg-slate-700 text-foreground rounded-bl-sm')}>
                        <p>{m.content}</p>
                        <p className={'text-[10px] mt-1 '+(isCompany?'text-blue-200':'text-muted-foreground')}>{formatDateRelative(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef}/>
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <input value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),sendMessage())}
                  placeholder="Ecrire un message..." className={inputCls+' flex-1'}/>
                <button onClick={sendMessage} disabled={sending||!newMsg.trim()}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
                  {sending ? <LoadingSpinner size={14}/> : <Send size={15}/>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}