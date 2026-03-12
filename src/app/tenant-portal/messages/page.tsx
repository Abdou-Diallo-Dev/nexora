'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, cardCls, inputCls } from '@/components/ui';
import { formatDate } from '@/lib/utils';

type Message = {
  id: string; content: string; sender_role: string;
  sender_name: string; created_at: string; is_read: boolean;
};

type TenantAccount = { tenant_id: string; company_id: string };

export default function TenantMessagesPage() {
  const { user } = useAuthStore();
  const [ta, setTa] = useState<TenantAccount|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();
    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }
        setTa(data);
        const { data: msgs } = await sb.from('messages')
          .select('id,content,sender_role,sender_name,created_at,is_read')
          .eq('tenant_id', data.tenant_id)
          .order('created_at', { ascending: true });
        setMessages((msgs || []) as Message[]);
        // Marquer comme lus
        await sb.from('messages').update({ is_read: true })
          .eq('tenant_id', data.tenant_id).eq('sender_role', 'company');
        setLoading(false);
      });
  }, [user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !ta || sending) return;
    setSending(true);
    const sb = createClient();
    const { data: msg } = await sb.from('messages').insert({
      tenant_id:   ta.tenant_id,
      company_id:  ta.company_id,
      sender_role: 'tenant',
      sender_name: user?.full_name || 'Locataire',
      content:     text.trim(),
      is_read:     false,
    }).select().single();
    if (msg) setMessages(prev => [...prev, msg as Message]);
    setText('');
    setSending(false);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
          <MessageSquare size={20} className="text-green-600"/>
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Messagerie</h1>
          <p className="text-xs text-muted-foreground">Contactez votre gestionnaire</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 ? (
          <div className={cardCls+' p-8 text-center text-muted-foreground text-sm'}>
            Aucun message. Commencez la conversation !
          </div>
        ) : messages.map(m => {
          const isMine = m.sender_role === 'tenant';
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 border border-border rounded-bl-sm'}`}>
                {!isMine && <p className="text-xs font-semibold text-primary mb-1">{m.sender_name}</p>}
                <p className="text-sm">{m.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}>{formatDate(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="flex gap-2 items-center">
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Écrire un message..."
          className={inputCls+' flex-1'}/>
        <button onClick={send} disabled={!text.trim() || sending}
          className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-50 flex-shrink-0">
          {sending ? <LoadingSpinner size={16}/> : <Send size={16}/>}
        </button>
      </div>
    </div>
  );
}