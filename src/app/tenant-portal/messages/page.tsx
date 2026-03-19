'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, MessageSquare, Mic, Square, Trash2, Pencil, Check, X, Play, Pause } from 'lucide-react';
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

function getSupportedMimeType(): string {
  const types = ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg'];
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'audio/webm';
}

// Custom Audio Player
function AudioPlayer({ src, isMine }: { src: string; isMine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
    setPlaying(!playing);
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => { setCurrentTime(a.currentTime); setProgress(a.duration ? (a.currentTime/a.duration)*100 : 0); };
    const onLoad = () => setDuration(a.duration);
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onLoad);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onLoad); a.removeEventListener('ended', onEnd); };
  }, []);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    a.currentTime = pct * a.duration;
  };

  return (
    <div className="flex items-center gap-2.5 py-1" style={{minWidth:'190px'}}>
      <audio ref={audioRef} src={src} preload="metadata"/>
      <button onClick={toggle} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMine?'bg-white/20 hover:bg-white/30':'bg-primary/10 hover:bg-primary/20'} transition-colors`}>
        {playing ? <Pause size={14} className={isMine?'text-white':'text-primary'}/> : <Play size={14} className={isMine?'text-white':'text-primary'} style={{marginLeft:'2px'}}/>}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1.5 rounded-full cursor-pointer overflow-hidden" style={{background: isMine?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.1)'}} onClick={seek}>
          <div className="h-full rounded-full transition-all" style={{width:`${progress}%`, background: isMine?'white':'var(--color-primary, #3b82f6)'}}/>
        </div>
        <div className="flex justify-between">
          <span className={`text-[9px] ${isMine?'text-white/60':'text-muted-foreground'}`}>{fmt(currentTime)}</span>
          <span className={`text-[9px] ${isMine?'text-white/60':'text-muted-foreground'}`}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
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
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [editingId, setEditingId]   = useState<string|null>(null);
  const [editText, setEditText]     = useState('');
  const [longPressId, setLongPressId] = useState<string|null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const mediaRef   = useRef<MediaRecorder|null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const timerRef   = useRef<NodeJS.Timeout|null>(null);
  const taRef      = useRef<TenantAccount|null>(null);
  const longPressTimer = useRef<NodeJS.Timeout|null>(null);

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
          .eq('tenant_id', data.tenant_id).order('created_at', { ascending: true });
        setMessages((msgs||[]) as Message[]);
        await sb.from('messages').update({ is_read: true }).eq('tenant_id', data.tenant_id).eq('sender_role', 'company');
        setLoading(false);
        const channel = sb.channel(`tenant-msg-${data.tenant_id}`)
          .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`tenant_id=eq.${data.tenant_id}` }, (p) => {
            setMessages(prev => prev.some(m=>m.id===(p.new as Message).id) ? prev : [...prev, p.new as Message]);
          })
          .on('postgres_changes', { event:'UPDATE', schema:'public', table:'messages', filter:`tenant_id=eq.${data.tenant_id}` }, (p) => {
            setMessages(prev => prev.map(m=>m.id===(p.new as Message).id ? p.new as Message : m));
          })
          .on('postgres_changes', { event:'DELETE', schema:'public', table:'messages', filter:`tenant_id=eq.${data.tenant_id}` }, (p) => {
            setMessages(prev => prev.filter(m=>m.id!==(p.old as any).id));
          }).subscribe();
        return () => { sb.removeChannel(channel); };
      });
  }, [user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !ta || sending) return;
    setSending(true);
    const content = text.trim(); setText('');
    await createClient().from('messages').insert({ tenant_id:ta.tenant_id, company_id:ta.company_id, sender_role:'tenant', sender_name:user?.full_name||'Locataire', content, is_read:false, message_type:'text' });
    setSending(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType?{mimeType}:undefined);
      mediaRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size>0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t=>t.stop());
        const currentTa = taRef.current; if (!currentTa) return;
        const ext = mimeType.includes('mp4')?'mp4':mimeType.includes('ogg')?'ogg':'webm';
        const blob = new Blob(chunksRef.current, { type: mimeType||'audio/webm' });
        const fileName = `voice/${currentTa.tenant_id}/${Date.now()}.${ext}`;
        const sb = createClient();
        const { error:upErr } = await sb.storage.from('messages-audio').upload(fileName, blob, { upsert:true, contentType:mimeType||'audio/webm' });
        if (upErr) { toast.error('Erreur upload'); return; }
        const { data:urlData } = sb.storage.from('messages-audio').getPublicUrl(fileName);
        if (!urlData?.publicUrl) return;
        await sb.from('messages').insert({ tenant_id:currentTa.tenant_id, company_id:currentTa.company_id, sender_role:'tenant', sender_name:user?.full_name||'Locataire', content:'🎤 Note vocale', audio_url:urlData.publicUrl, message_type:'audio', is_read:false });
        toast.success('Note vocale envoyée ✓');
      };
      mr.start(100); setRecording(true); setRecordingTime(0);
      timerRef.current = setInterval(()=>setRecordingTime(t=>t+1),1000);
    } catch { toast.error('Microphone non disponible'); }
  };

  const stopRecording = () => { mediaRef.current?.stop(); setRecording(false); if(timerRef.current)clearInterval(timerRef.current); setRecordingTime(0); };

  const deleteMessage = async (id: string) => {
    setDeletingId(id); setLongPressId(null);
    await createClient().from('messages').delete().eq('id', id);
    setDeletingId(null);
  };

  const startEdit = (m: Message) => { setEditingId(m.id); setEditText(m.content.replace('✏️','')); setLongPressId(null); };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    const newContent = editText.trim()+'✏️';
    await createClient().from('messages').update({ content: newContent }).eq('id', editingId);
    setMessages(prev=>prev.map(m=>m.id===editingId?{...m,content:newContent}:m));
    setEditingId(null); setEditText('');
  };

  const handleLongPressStart = (id: string) => {
    longPressTimer.current = setTimeout(() => setLongPressId(id), 500);
  };
  const handleLongPressEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const handleKey = (e: React.KeyboardEvent) => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  const grouped: { date:string; msgs:Message[] }[] = [];
  messages.forEach(m => {
    const d = new Date(m.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
    const last = grouped[grouped.length-1];
    if (last && last.date===d) last.msgs.push(m); else grouped.push({ date:d, msgs:[m] });
  });

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Overlay long press */}
      {longPressId && <div className="fixed inset-0 z-40" onClick={()=>setLongPressId(null)}/>}

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
      <div className="flex-1 overflow-y-auto mb-3 space-y-0.5">
        {messages.length===0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare size={36} className="mx-auto mb-3 opacity-20"/>
            <p className="font-medium text-foreground mb-1">Aucun message</p>
            <p className="text-sm">Démarrez la conversation</p>
          </div>
        ) : grouped.map(group => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border"/>
              <span className="text-[10px] text-muted-foreground px-2">{group.date}</span>
              <div className="flex-1 h-px bg-border"/>
            </div>
            {group.msgs.map((m,i) => {
              const isMine   = m.sender_role==='tenant';
              const prevSame = i>0 && group.msgs[i-1].sender_role===m.sender_role;
              const isAudio  = m.message_type==='audio' && m.audio_url;
              const isLongPressed = longPressId===m.id;
              return (
                <div key={m.id} className={`flex ${isMine?'justify-end':'justify-start'} ${prevSame?'mt-0.5':'mt-3'} relative`}>
                  {!isMine && !prevSame && (
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end mb-1">
                      {m.sender_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!isMine && prevSame && <div className="w-7 mr-2 flex-shrink-0"/>}
                  <div className="max-w-[78%] flex flex-col">
                    {!isMine && !prevSame && <p className="text-[10px] font-semibold text-primary mb-1 ml-1">{m.sender_name}</p>}

                    {/* Editing mode */}
                    {editingId===m.id ? (
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-primary rounded-2xl px-3 py-2">
                        <input value={editText} onChange={e=>setEditText(e.target.value)} className="flex-1 text-sm outline-none bg-transparent text-foreground"/>
                        <button onClick={saveEdit} className="text-green-600"><Check size={15}/></button>
                        <button onClick={()=>setEditingId(null)} className="text-red-500"><X size={15}/></button>
                      </div>
                    ) : (
                      <div
                        onTouchStart={()=>handleLongPressStart(m.id)}
                        onTouchEnd={handleLongPressEnd}
                        onContextMenu={e=>{e.preventDefault();setLongPressId(m.id);}}
                        style={{WebkitUserSelect:'none',userSelect:'none',WebkitTouchCallout:'none'}}
                        className={`relative rounded-2xl px-3 py-2.5 ${isMine?'bg-primary text-white rounded-br-sm':'bg-white dark:bg-slate-800 border border-border rounded-bl-sm'}`}>
                        {isAudio ? (
                          <div>
                            <p className={`text-[10px] mb-1 font-medium ${isMine?'text-white/70':'text-muted-foreground'}`}>🎤 Note vocale</p>
                            <AudioPlayer src={m.audio_url!} isMine={isMine}/>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        )}
                        <p className={`text-[10px] mt-1 text-right ${isMine?'text-white/60':'text-muted-foreground'}`}>
                          {new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                        </p>

                        {/* Context menu on long press */}
                        {isLongPressed && m.content!=='_deleted_' && (
                          <div className={`absolute z-50 flex flex-col gap-1 bg-white dark:bg-slate-800 border border-border rounded-xl shadow-lg p-1.5 ${isMine?'right-0':'left-0'} bottom-full mb-1`}>
                            {isMine && !isAudio && m.content!=='_deleted_' && (
                              <button onClick={()=>startEdit(m)} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground whitespace-nowrap">
                                <Pencil size={12}/> Modifier
                              </button>
                            )}
                            <button onClick={()=>deleteMessage(m.id)} disabled={deletingId===m.id} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-red-50 text-red-600 whitespace-nowrap">
                              {deletingId===m.id?<LoadingSpinner size={12}/>:<Trash2 size={12}/>} Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end flex-shrink-0 pt-2 border-t border-border">
        <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={handleKey}
          placeholder="Écrire un message..." rows={1} style={{resize:'none'}}
          className={inputCls+' flex-1 max-h-24 overflow-y-auto'} disabled={recording}/>
        {recording ? (
          <button onClick={stopRecording} className="flex items-center gap-1 px-3 h-10 bg-red-500 rounded-xl text-white text-xs font-bold animate-pulse flex-shrink-0">
            <Square size={11}/>{String(recordingTime).padStart(2,'0')}s
          </button>
        ) : (
          <button onClick={startRecording} disabled={sending} className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:bg-blue-50 transition-colors flex-shrink-0">
            <Mic size={18}/>
          </button>
        )}
        <button onClick={send} disabled={!text.trim()||sending||recording} className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0 hover:opacity-90 transition-opacity">
          {sending?<LoadingSpinner size={15}/>:<Send size={16}/>}
        </button>
      </div>
    </div>
  );
}