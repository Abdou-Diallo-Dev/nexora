'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, MessageSquare, Mic, Square, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, inputCls } from '@/components/ui';
import { toast } from 'sonner';

type Message = {
  id: string; content: string; sender_role: string;
  sender_name: string; created_at: string; is_read: boolean;
  audio_url: string | null; message_type: string | null;
};
type TenantAccount = { tenant_id: string; company_id: string };

// Detect best supported audio format
function getSupportedMimeType(): string {
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export default function TenantMessagesPage() {
  const { user } = useAuthStore();
  const [ta, setTa]               = useState<TenantAccount | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const mediaRef     = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const timerRef     = useRef<NodeJS.Timeout | null>(null);
  const taRef        = useRef<TenantAccount | null>(null);

  useEffect(() => { taRef.current = ta; }, [ta]);

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();

    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }
        setTa(data);

        const { data: msgs } = await sb.from('messages')
          .select('id,content,sender_role,sender_name,created_at,is_read,audio_url,message_type')
          .eq('tenant_id', data.tenant_id)
          .order('created_at', { ascending: true });
        setMessages((msgs || []) as Message[]);

        await sb.from('messages').update({ is_read: true })
          .eq('tenant_id', data.tenant_id).eq('sender_role', 'company');

        setLoading(false);

        // Realtime — listen for new messages
        const channel = sb.channel(`tenant-messages-${data.tenant_id}`)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'messages',
            filter: `tenant_id=eq.${data.tenant_id}`,
          }, (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.sender_role === 'company') {
              sb.from('messages').update({ is_read: true }).eq('id', newMsg.id);
            }
          })
          .on('postgres_changes', {
            event: 'DELETE', schema: 'public', table: 'messages',
            filter: `tenant_id=eq.${data.tenant_id}`,
          }, (payload) => {
            setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
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
    await sb.from('messages').insert({
      tenant_id: ta.tenant_id, company_id: ta.company_id,
      sender_role: 'tenant', sender_name: user?.full_name || 'Locataire',
      content, is_read: false, message_type: 'text',
    });
    setSending(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const currentTa = taRef.current;
        if (!currentTa) return;
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const fileName = `voice/${currentTa.tenant_id}/${Date.now()}.${ext}`;
        const sb = createClient();
        const { error: upErr } = await sb.storage.from('messages-audio').upload(fileName, blob, { upsert: true, contentType: mimeType || 'audio/webm' });
        if (upErr) { toast.error('Erreur upload audio : ' + upErr.message); return; }
        const { data: urlData } = sb.storage.from('messages-audio').getPublicUrl(fileName);
        if (!urlData?.publicUrl) return;
        await sb.from('messages').insert({
          tenant_id: currentTa.tenant_id, company_id: currentTa.company_id,
          sender_role: 'tenant', sender_name: user?.full_name || 'Locataire',
          content: '🎤 Note vocale', audio_url: urlData.publicUrl,
          message_type: 'audio', is_read: false,
        });
        toast.success('Note vocale envoyée ✓');
      };
      mr.start(100); // collect data every 100ms
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch(e) {
      toast.error('Microphone non disponible');
      console.error(e);
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingTime(0);
  };

  const deleteMessage = async (id: string) => {
    setDeletingId(id);
    const { error } = await createClient().from('messages').delete().eq('id', id);
    if (error) { toast.error('Erreur suppression'); }
    else { setMessages(prev => prev.filter(m => m.id !== id)); }
    setDeletingId(null);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

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
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <MessageSquare size={20} className="text-primary"/>
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Messagerie</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
            <p className="text-xs text-muted-foreground">Votre gestionnaire</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-3 pr-1 space-y-0.5">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare size={36} className="mx-auto mb-3 opacity-20"/>
            <p className="font-medium text-foreground mb-1">Aucun message</p>
            <p className="text-sm">Démarrez la conversation</p>
          </div>
        ) : grouped.map(group => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border"/>
              <span className="text-[10px] text-muted-foreground font-medium px-2">{group.date}</span>
              <div className="flex-1 h-px bg-border"/>
            </div>
            {group.msgs.map((m, i) => {
              const isMine   = m.sender_role === 'tenant';
              const prevSame = i > 0 && group.msgs[i-1].sender_role === m.sender_role;
              const isAudio  = m.message_type === 'audio' && m.audio_url;
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${prevSame ? 'mt-0.5' : 'mt-3'} group`}>
                  {!isMine && !prevSame && (
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end mb-1">
                      {m.sender_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!isMine && prevSame && <div className="w-7 mr-2 flex-shrink-0"/>}
                  <div className="max-w-[75%] flex flex-col">
                    {!isMine && !prevSame && (
                      <p className="text-[10px] font-semibold text-primary mb-1 ml-1">{m.sender_name}</p>
                    )}
                    <div className={`relative rounded-2xl px-3 py-2.5 ${
                      isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 border border-border rounded-bl-sm'
                    }`}>
                      {/* Delete button - only own messages */}
                      {isMine && (
                        <button onClick={() => deleteMessage(m.id)} disabled={deletingId === m.id}
                          className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex transition-all shadow-sm">
                          {deletingId === m.id ? <LoadingSpinner size={10}/> : <Trash2 size={9}/>}
                        </button>
                      )}
                      {isAudio ? (
                        <div>
                          <p className={`text-[11px] mb-1.5 ${isMine ? 'text-white/80' : 'text-muted-foreground'}`}>🎤 Note vocale</p>
                          <audio controls src={m.audio_url!}
                            style={{ height:'36px', minWidth:'200px', maxWidth:'240px' }}
                            preload="metadata"
                          />
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      )}
                      <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                        {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                  </div>
                  {/* Delete for non-mine on long press - hidden by default */}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Input bar */}
      <div className="flex gap-2 items-end flex-shrink-0 bg-white dark:bg-slate-900 pt-2 pb-1 border-t border-border">
        <textarea
          value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
          placeholder="Écrire un message..."
          rows={1} style={{ resize:'none' }}
          className={inputCls + ' flex-1 max-h-24 overflow-y-auto'}
          disabled={recording}
        />
        {recording ? (
          <button onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 h-10 bg-red-500 rounded-xl text-white text-xs font-bold animate-pulse flex-shrink-0">
            <Square size={12}/>{String(recordingTime).padStart(2,'0')}s
          </button>
        ) : (
          <button onClick={startRecording} disabled={sending}
            className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:bg-blue-50 transition-colors flex-shrink-0">
            <Mic size={18}/>
          </button>
        )}
        <button onClick={send} disabled={!text.trim() || sending || recording}
          className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0 hover:opacity-90 transition-opacity">
          {sending ? <LoadingSpinner size={15}/> : <Send size={16}/>}
        </button>
      </div>
    </div>
  );
}