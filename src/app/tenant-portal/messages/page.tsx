'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, MessageSquare, Paperclip } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, inputCls } from '@/components/ui';
import { formatDate } from '@/lib/utils';

type Message = {
  id: string; content: string; sender_role: string;
  sender_name: string; created_at: string; is_read: boolean;
};
type TenantAccount = { tenant_id: string; company_id: string };

export default function TenantMessagesPage() {
  const { user } = useAuthStore();
  const [ta, setTa]             = useState<TenantAccount | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();

    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }
        setTa(data);

        // Load messages
        const { data: msgs } = await sb.from('messages')
          .select('id,content,sender_role,sender_name,created_at,is_read')
          .eq('tenant_id', data.tenant_id)
          .order('created_at', { ascending: true });
        setMessages((msgs || []) as Message[]);

        // Mark company messages as read
        await sb.from('messages')
          .update({ is_read: true })
          .eq('tenant_id', data.tenant_id)
          .eq('sender_role', 'company');

        setLoading(false);

        // Realtime subscription
        const channel = sb.channel(`messages-${data.tenant_id}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `tenant_id=eq.${data.tenant_id}`,
          }, (payload) => {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === (payload.new as Message).id)) return prev;
              return [...prev, payload.new as Message];
            });
            // Auto-mark as read if from company
            if ((payload.new as Message).sender_role === 'company') {
              sb.from('messages').update({ is_read: true }).eq('id', (payload.new as Message).id);
            }
          })
          .subscribe();

        return () => { sb.removeChannel(channel); };
      });
  }, [user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !ta || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');

    const sb = createClient();
    const { data: msg } = await sb.from('messages').insert({
      tenant_id:   ta.tenant_id,
      company_id:  ta.company_id,
      sender_role: 'tenant',
      sender_name: user?.full_name || 'Locataire',
      content,
      is_read:     false,
    }).select().single();

    // Optimistic update (realtime will also fire, dedup handled above)
    if (msg && !messages.some(m => m.id === (msg as Message).id)) {
      setMessages(prev => [...prev, msg as Message]);
    }
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>;

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(m => {
    const d = new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) last.msgs.push(m);
    else grouped.push({ date: d, msgs: [m] });
  });

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
          <MessageSquare size={20} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Messagerie</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <p className="text-xs text-muted-foreground">Votre gestionnaire</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-1 mb-4 pr-1">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare size={36} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium text-foreground mb-1">Aucun message</p>
            <p className="text-sm">Démarrez la conversation avec votre gestionnaire</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground font-medium bg-slate-50 dark:bg-slate-900 px-2">{group.date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {group.msgs.map((m, i) => {
                const isMine   = m.sender_role === 'tenant';
                const prevSame = i > 0 && group.msgs[i - 1].sender_role === m.sender_role;
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${prevSame ? 'mt-0.5' : 'mt-3'}`}>
                    {!isMine && !prevSame && (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end mb-1">
                        {m.sender_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!isMine && prevSame && <div className="w-7 mr-2 flex-shrink-0" />}
                    <div className={`max-w-[75%] ${isMine ? '' : ''}`}>
                      {!isMine && !prevSame && (
                        <p className="text-[10px] font-semibold text-primary mb-1 ml-1">{m.sender_name}</p>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-white dark:bg-slate-800 border border-border rounded-bl-sm'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end flex-shrink-0">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Écrire un message... (Entrée pour envoyer)"
          rows={1}
          style={{ resize: 'none' }}
          className={inputCls + ' flex-1 max-h-24 overflow-y-auto'}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-50 flex-shrink-0 hover:opacity-90 transition-opacity"
        >
          {sending ? <LoadingSpinner size={16} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}