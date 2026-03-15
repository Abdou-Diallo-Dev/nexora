'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, inputCls } from '@/components/ui';
import { toast } from 'sonner';

type Message = {
  id: string; content: string; sender_role: string;
  sender_name: string; created_at: string; is_read: boolean;
  audio_url?: string; message_type?: string;
  is_deleted?: boolean; edited_at?: string;
};
type TenantAccount = { tenant_id: string; company_id: string };

export default function TenantMessagesPage() {
  const { user } = useAuthStore();
  const [ta, setTa]               = useState<TenantAccount | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [msgMenuOpen, setMsgMenuOpen] = useState<string | null>(null);
  const [editingMsg, setEditingMsg]   = useState<string | null>(null);
  const [editText, setEditText]       = useState('');
  const [recording, setRecording]     = useState(false);
  const [recordTime, setRecordTime]   = useState(0);
  const bottomRef        = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const recordTimerRef   = useRef<any>(null);

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();
    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }
        setTa(data);
        const { data: msgs } = await sb.from('messages')
          .select('id,content,sender_role,sender_name,created_at,is_read,audio_url,message_type,is_deleted,edited_at')
          .eq('tenant_id', data.tenant_id)
          .order('created_at', { ascending: true });
        setMessages((msgs || []) as Message[]);
        await sb.from('messages').update({ is_read: true })
          .eq('tenant_id', data.tenant_id).eq('sender_role', 'company');
        setLoading(false);

        const channel = sb.channel(`messages-${data.tenant_id}`)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'messages',
            filter: `tenant_id=eq.${data.tenant_id}`,
          }, (payload) => {
            setMessages(prev => {
              if (prev.some(m => m.id === (payload.new as Message).id)) return prev;
              return [...prev, payload.new as Message];
            });
            if ((payload.new as Message).sender_role === 'company') {
              sb.from('messages').update({ is_read: true }).eq('id', (payload.new as Message).id);
            }
          })
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'messages',
            filter: `tenant_id=eq.${data.tenant_id}`,
          }, (payload) => {
            setMessages(prev => prev.map(m => m.id === (payload.new as Message).id ? payload.new as Message : m));
          })
          .subscribe();

        return () => { sb.removeChannel(channel); };
      });
  }, [user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !ta || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');

    const tempMsg: Message = {
      id: `temp_${Date.now()}`, content,
      sender_role: 'tenant', sender_name: user?.full_name || 'Locataire',
      created_at: new Date().toISOString(), is_read: false,
    };
    setMessages(prev => [...prev, tempMsg]);

    const sb = createClient();
    const { data: msg } = await sb.from('messages').insert({
      tenant_id: ta.tenant_id, company_id: ta.company_id,
      sender_role: 'tenant', sender_name: user?.full_name || 'Locataire',
      content, is_read: false,
    }).select().single();

    if (msg) setMessages(prev => prev.map(m => m.id === tempMsg.id ? msg as Message : m));
    setSending(false);
  };

  const deleteMessage = async (msgId: string) => {
    const sb = createClient();
    const msgToDelete = messages.find(m => m.id === msgId);
    if (msgToDelete?.audio_url) {
      const fileName = msgToDelete.audio_url.split('/').pop();
      if (fileName) await sb.storage.from('voice-messages').remove([fileName]);
    }
    await sb.from('messages').update({ is_deleted: true }).eq('id', msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_deleted: true } : m));
    setMsgMenuOpen(null);
    toast.success('Message supprimé');
  };

  const startEdit = (msg: Message) => {
    setEditingMsg(msg.id);
    setEditText(msg.content);
    setMsgMenuOpen(null);
  };

  const saveEdit = async (msgId: string) => {
    if (msgId === 'cancel') { setEditingMsg(null); setEditText(''); return; }
    if (!editText.trim()) return;
    const sb = createClient();
    await sb.from('messages').update({
      content: editText.trim(), edited_at: new Date().toISOString(),
    }).eq('id', msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editText.trim(), edited_at: new Date().toISOString() } : m));
    setEditingMsg(null);
    setEditText('');
    toast.success('Message modifié');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>;

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
        ) : grouped.map(group => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground font-medium bg-slate-50 dark:bg-slate-900 px-2">{group.date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {group.msgs.map((m, i) => {
              const isMine   = m.sender_role === 'tenant';
              const prevSame = i > 0 && group.msgs[i - 1].sender_role === m.sender_role;

              if (m.is_deleted) return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${prevSame ? 'mt-0.5' : 'mt-3'}`}>
                  <div className="max-w-[75%] rounded-2xl px-4 py-2.5 bg-slate-100 dark:bg-slate-800 opacity-50">
                    <p className="text-xs italic text-muted-foreground">Message supprimé</p>
                  </div>
                </div>
              );

              return (
                <div key={m.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${prevSame ? 'mt-0.5' : 'mt-3'} group/msg relative`}>
                  {!isMine && !prevSame && (
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end mb-1">
                      {m.sender_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!isMine && prevSame && <div className="w-7 mr-2 flex-shrink-0" />}

                  <div className="relative flex flex-col" style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                    {!isMine && !prevSame && (
                      <p className="text-[10px] font-semibold text-primary mb-1 ml-1">{m.sender_name}</p>
                    )}

                    {/* Menu bouton pour ses propres messages */}
                    {isMine && (
                      <div className="absolute -left-8 top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity z-10">
                        <button
                          onClick={() => setMsgMenuOpen(msgMenuOpen === m.id ? null : m.id)}
                          className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-300 text-xs"
                        >⋮</button>
                        {msgMenuOpen === m.id && (
                          <div className="absolute bottom-8 left-0 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-border py-1 z-20 min-w-[120px]">
                            {m.message_type !== 'audio' && (
                              <button onClick={() => startEdit(m)}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-foreground flex items-center gap-2">
                                ✏️ Modifier
                              </button>
                            )}
                            <button onClick={() => deleteMessage(m.id)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2">
                              🗑️ Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {editingMsg === m.id ? (
                      <div className="flex gap-2 items-center" style={{ maxWidth: '75vw' }}>
                        <input value={editText} onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit(m.id)}
                          className="flex-1 text-sm px-3 py-2 rounded-xl border border-primary outline-none bg-white dark:bg-slate-800"
                          autoFocus />
                        <button onClick={() => saveEdit(m.id)} className="text-xs bg-primary text-white px-2 py-1 rounded-lg flex-shrink-0">✓</button>
                        <button onClick={() => saveEdit('cancel')} className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-lg flex-shrink-0">✕</button>
                      </div>
                    ) : (
                      <div style={{ maxWidth: '75vw' }} className={`rounded-2xl px-4 py-2.5 ${isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 border border-border rounded-bl-sm'}`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                        <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {m.edited_at && <span className="ml-1 italic">· modifié</span>}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-center flex-shrink-0">
        <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
          placeholder="Écrire un message..." rows={1} style={{ resize: 'none' }}
          className={inputCls + ' flex-1 max-h-24 overflow-y-auto'} />
        <button onClick={send} disabled={!text.trim() || sending}
          className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-50 flex-shrink-0">
          {sending ? <LoadingSpinner size={16} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}