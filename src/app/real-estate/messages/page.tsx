'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, MessageSquare, Search, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, cardCls, inputCls, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

type Tenant = { id: string; first_name: string; last_name: string; email: string };
type Message = { id:string; content:string; sender_role:string; sender_name:string; created_at:string; is_read:boolean };

export default function MessagesPage() {
  const { company, user } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selected, setSelected] = useState<Tenant|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [unread, setUnread] = useState<Record<string,number>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    // Charger locataires qui ont un compte
    sb.from('tenant_accounts').select('tenant_id,tenants(id,first_name,last_name,email)').eq('company_id', company.id)
      .then(async ({ data }) => {
        const list = (data || []).map((d:any) => d.tenants).filter(Boolean) as Tenant[];
        setTenants(list);
        // Compter messages non lus par tenant
        const { data: unreadData } = await sb.from('messages')
          .select('tenant_id').eq('company_id', company.id)
          .eq('sender_role', 'tenant').eq('is_read', false);
        const counts: Record<string,number> = {};
        (unreadData || []).forEach((m:any) => { counts[m.tenant_id] = (counts[m.tenant_id]||0) + 1; });
        setUnread(counts);
        setLoading(false);
      });
  }, [company?.id]);

  useEffect(() => {
    if (!selected || !company?.id) return;
    const sb = createClient();
    sb.from('messages')
      .select('id,content,sender_role,sender_name,created_at,is_read')
      .eq('tenant_id', selected.id)
      .eq('company_id', company.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data || []) as Message[]);
        // Marquer comme lus
        sb.from('messages').update({ is_read: true })
          .eq('tenant_id', selected.id).eq('sender_role', 'tenant');
        setUnread(prev => ({ ...prev, [selected.id]: 0 }));
      });
  }, [selected, company?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !selected || !company?.id || sending) return;
    setSending(true);
    const sb = createClient();
    const { data: msg } = await sb.from('messages').insert({
      tenant_id:   selected.id,
      company_id:  company.id,
      sender_role: 'company',
      sender_name: user?.full_name || 'Gestionnaire',
      content:     text.trim(),
      is_read:     false,
    }).select().single();
    if (msg) setMessages(prev => [...prev, msg as Message]);
    setText('');
    setSending(false);
  };

  const filtered = tenants.filter(t =>
    `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
          <MessageSquare size={20} className="text-green-600"/>
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Messagerie</h1>
          <p className="text-xs text-muted-foreground">Communication avec les locataires</p>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-180px)]">
        {/* Liste locataires */}
        <div className={cardCls+' w-72 flex-shrink-0 flex flex-col p-3'}>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..." className={inputCls+' pl-8 !py-2 text-sm'}/>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun locataire avec compte</p>
            ) : filtered.map(t => (
              <button key={t.id} onClick={() => setSelected(t)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${selected?.id === t.id ? 'bg-primary text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${selected?.id === t.id ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                  {t.first_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${selected?.id === t.id ? 'text-white' : 'text-foreground'}`}>
                    {t.first_name} {t.last_name}
                  </p>
                </div>
                {(unread[t.id] || 0) > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {unread[t.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Zone messages */}
        <div className={cardCls+' flex-1 flex flex-col p-4'}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users size={40} className="mx-auto mb-3 opacity-30"/>
                <p className="text-sm">Sélectionnez un locataire pour démarrer une conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 pb-3 border-b border-border mb-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                  {selected.first_name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{selected.first_name} {selected.last_name}</p>
                  <p className="text-xs text-muted-foreground">{selected.email}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">Aucun message. Commencez la conversation !</div>
                ) : messages.map(m => {
                  const isMine = m.sender_role === 'company';
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-700 rounded-bl-sm'}`}>
                        {!isMine && <p className="text-xs font-semibold text-primary mb-1">{m.sender_name}</p>}
                        <p className="text-sm">{m.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}>{formatDate(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef}/>
              </div>

              <div className="flex gap-2">
                <input value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder={`Message à ${selected.first_name}...`}
                  className={inputCls+' flex-1'}/>
                <button onClick={send} disabled={!text.trim() || sending}
                  className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-50">
                  {sending ? <LoadingSpinner size={16}/> : <Send size={16}/>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}