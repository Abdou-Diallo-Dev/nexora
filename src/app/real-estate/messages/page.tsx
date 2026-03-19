'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Send, MessageSquare, Search, Bell, Wrench, CreditCard, CheckCircle, Clock, AlertTriangle, X, ChevronLeft, Mic, Square, Play, Pause, Pencil, Trash2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, inputCls, Badge, BadgeVariant } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type Tenant  = { id: string; first_name: string; last_name: string; email: string };
type Message = { id: string; content: string; sender_role: string; sender_name: string; sender_id: string | null; created_at: string; is_read: boolean; audio_url: string | null; message_type: string | null };
type Ticket  = { id: string; title: string; category: string; priority: string; status: string; description: string | null; created_at: string };
type Payment = { id: string; amount: number; period_month: number; period_year: number; status: string; due_date: string | null };

const TICKET_STATUS: Record<string, { l: string; v: BadgeVariant }> = {
  open:        { l: 'Ouvert',   v: 'error'   },
  in_progress: { l: 'En cours', v: 'warning' },
  resolved:    { l: 'Résolu',   v: 'success' },
  closed:      { l: 'Fermé',    v: 'default' },
};
const TICKET_PRIORITY: Record<string, string> = { low:'🟢', normal:'🟡', high:'🟠', urgent:'🔴' };
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

function getSupportedMimeType(): string {
  const types = ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg'];
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'audio/webm';
}

function AudioPlayer({ src, isMine }: { src: string; isMine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const toggle = () => { const a = audioRef.current; if (!a) return; playing ? a.pause() : a.play(); setPlaying(!playing); };
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onTime = () => { setCurrentTime(a.currentTime); setProgress(a.duration ? (a.currentTime/a.duration)*100 : 0); };
    const onLoad = () => setDuration(a.duration);
    const onEnd  = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
    a.addEventListener('timeupdate', onTime); a.addEventListener('loadedmetadata', onLoad); a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onLoad); a.removeEventListener('ended', onEnd); };
  }, []);
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a || !a.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
  };
  return (
    <div className="flex items-center gap-2.5 py-1" style={{minWidth:'190px'}}>
      <audio ref={audioRef} src={src} preload="metadata"/>
      <button onClick={toggle} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isMine?'bg-white/20 hover:bg-white/30':'bg-primary/10 hover:bg-primary/20'}`}>
        {playing ? <Pause size={14} className={isMine?'text-white':'text-primary'}/> : <Play size={14} className={isMine?'text-white':'text-primary'} style={{marginLeft:'2px'}}/>}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1.5 rounded-full cursor-pointer overflow-hidden" style={{background:isMine?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.1)'}} onClick={seek}>
          <div className="h-full rounded-full transition-all" style={{width:`${progress}%`, background:isMine?'white':'#3b82f6'}}/>
        </div>
        <div className="flex justify-between">
          <span className={`text-[9px] ${isMine?'text-white/60':'text-muted-foreground'}`}>{fmt(currentTime)}</span>
          <span className={`text-[9px] ${isMine?'text-white/60':'text-muted-foreground'}`}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { company, user } = useAuthStore();
  const [tenants, setTenants]       = useState<Tenant[]>([]);
  const [selected, setSelected]     = useState<Tenant | null>(null);
  const [mobileView, setMobileView] = useState<'list'|'chat'>('list');
  const [messages, setMessages]     = useState<Message[]>([]);
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [text, setText]             = useState('');
  const [loading, setLoading]       = useState(true);
  const [sending, setSending]       = useState(false);
  const [search, setSearch]         = useState('');
  const [unread, setUnread]         = useState<Record<string, number>>({});
  const [rightTab, setRightTab]     = useState<'messages'|'tickets'|'payments'>('messages');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifText, setNotifText]   = useState('');
  const [recording, setRecording]   = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [deletingMsgId, setDeletingMsgId] = useState<string|null>(null);
  const [editingMsgId, setEditingMsgId]   = useState<string|null>(null);
  const [editMsgText, setEditMsgText]     = useState('');
  const [longPressId, setLongPressId]     = useState<string|null>(null);
  const bottomRef      = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder|null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const timerRef         = useRef<NodeJS.Timeout|null>(null);
  const longPressTimer   = useRef<NodeJS.Timeout|null>(null);

  // Load tenants
  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('tenant_accounts').select('tenant_id,tenants(id,first_name,last_name,email)').eq('company_id', company.id)
      .then(async ({ data }) => {
        const list = (data||[]).map((d:any) => d.tenants).filter(Boolean) as Tenant[];
        setTenants(list);
        const { data: unreadData } = await sb.from('messages').select('tenant_id').eq('company_id', company.id).eq('sender_role','tenant').eq('is_read',false);
        const counts: Record<string,number> = {};
        (unreadData||[]).forEach((m:any) => { counts[m.tenant_id] = (counts[m.tenant_id]||0)+1; });
        setUnread(counts);
        setLoading(false);
      });
  }, [company?.id]);

  // Load messages + tickets + payments when tenant selected
  useEffect(() => {
    if (!selected || !company?.id) return;
    const sb = createClient();
    let msgQuery = sb.from('messages')
      .select('id,content,sender_role,sender_name,created_at,is_read,sender_id,audio_url,message_type')
      .eq('tenant_id', selected.id).eq('company_id', company.id);
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      msgQuery = msgQuery.or(`sender_id.eq.${user?.id},sender_role.eq.tenant`);
    }
    msgQuery.order('created_at', { ascending: true }).then(({ data }) => {
      setMessages((data||[]) as Message[]);
      sb.from('messages').update({ is_read: true }).eq('tenant_id', selected.id).eq('sender_role','tenant');
      setUnread(prev => ({ ...prev, [selected.id]: 0 }));
    });
    sb.from('tenant_tickets').select('id,title,category,priority,status,description,created_at').eq('tenant_id', selected.id).order('created_at', { ascending:false }).then(({ data }) => setTickets((data||[]) as Ticket[]));
    sb.from('rent_payments').select('id,amount,period_month,period_year,status,due_date').eq('tenant_id', selected.id).eq('company_id', company.id).order('period_year',{ascending:false}).order('period_month',{ascending:false}).limit(12).then(({ data }) => setPayments((data||[]) as Payment[]));
    const channel = sb.channel(`admin-messages-${selected.id}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`tenant_id=eq.${selected.id}` }, (p) => {
        setMessages(prev => prev.some(m=>m.id===(p.new as Message).id) ? prev : [...prev, p.new as Message]);
      })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'messages', filter:`tenant_id=eq.${selected.id}` }, (p) => {
        setMessages(prev => prev.map(m => m.id===(p.new as Message).id ? p.new as Message : m));
      })
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'messages', filter:`tenant_id=eq.${selected.id}` }, (p) => {
        setMessages(prev => prev.filter(m => m.id!==(p.old as any).id));
      }).subscribe();
    return () => { sb.removeChannel(channel); };
  }, [selected, company?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !selected || !company?.id || sending) return;
    setSending(true);
    const content = text.trim(); setText('');
    await createClient().from('messages').insert({ tenant_id:selected.id, company_id:company.id, sender_role:'company', sender_name:user?.full_name||'Gestionnaire', sender_id:user?.id, content, is_read:false, message_type:'text' });
    setSending(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType?{mimeType}:undefined);
      mediaRecorderRef.current = mr; audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size>0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t=>t.stop());
        if (!selected || !company?.id) return;
        const ext = mimeType.includes('mp4')?'mp4':mimeType.includes('ogg')?'ogg':'webm';
        const blob = new Blob(audioChunksRef.current, { type:mimeType||'audio/webm' });
        const fileName = `voice/${selected.id}/${Date.now()}.${ext}`;
        const sb = createClient();
        const { error:upErr } = await sb.storage.from('messages-audio').upload(fileName, blob, { upsert:true, contentType:mimeType||'audio/webm' });
        if (upErr) { toast.error('Erreur upload : '+upErr.message); return; }
        const { data:url } = sb.storage.from('messages-audio').getPublicUrl(fileName);
        if (!url?.publicUrl) return;
        await sb.from('messages').insert({ tenant_id:selected.id, company_id:company.id, sender_role:'company', sender_name:user?.full_name||'Gestionnaire', sender_id:user?.id, content:'🎤 Note vocale', audio_url:url.publicUrl, message_type:'audio', is_read:false });
        toast.success('Note vocale envoyée ✓');
      };
      mr.start(100); setRecording(true); setRecordingTime(0);
      timerRef.current = setInterval(()=>setRecordingTime(t=>t+1),1000);
    } catch(e) { toast.error('Microphone non disponible'); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); if(timerRef.current)clearInterval(timerRef.current); setRecordingTime(0); };

  const deleteMsg = async (id: string) => {
    setDeletingMsgId(id); setLongPressId(null);
    await createClient().from('messages').delete().eq('id', id);
    setMessages(prev => prev.filter(m=>m.id!==id));
    setDeletingMsgId(null);
  };
  const startEditMsg = (m: Message) => { setEditingMsgId(m.id); setEditMsgText(m.content); setLongPressId(null); };
  const saveEditMsg = async () => {
    if (!editingMsgId||!editMsgText.trim()) return;
    await createClient().from('messages').update({ content:editMsgText.trim() }).eq('id', editingMsgId);
    setMessages(prev=>prev.map(m=>m.id===editingMsgId?{...m,content:editMsgText.trim()}:m));
    setEditingMsgId(null); setEditMsgText('');
  };
  const handleLongPressStart = (id:string) => { longPressTimer.current = setTimeout(()=>setLongPressId(id),500); };
  const handleLongPressEnd = () => { if(longPressTimer.current)clearTimeout(longPressTimer.current); };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    const { error } = await createClient().from('tenant_tickets').update({ status }).eq('id', ticketId).select('id,status');
    if (error) { toast.error('Erreur: '+error.message); return; }
    setTickets(prev=>prev.map(t=>t.id===ticketId?{...t,status}:t));
    toast.success('Statut mis à jour');
  };

  const sendPaymentReminder = async () => {
    if (!selected||!notifText.trim()) return;
    setSendingNotif(true);
    const sb = createClient();
    const { data: ta } = await sb.from('tenant_accounts').select('user_id').eq('tenant_id', selected.id).maybeSingle();
    if (ta?.user_id) {
      await sb.from('notifications').insert({ user_id:ta.user_id, tenant_id:selected.id, company_id:company?.id, type:'info', title:'Rappel de loyer', message:notifText.trim(), link:'/tenant-portal/payments' });
    }
    await sb.from('messages').insert({ tenant_id:selected.id, company_id:company?.id, sender_role:'company', sender_name:user?.full_name||'Gestionnaire', sender_id:user?.id, content:`🔔 ${notifText.trim()}`, is_read:false, message_type:'text' });
    toast.success('Notification envoyée');
    setShowNotifModal(false); setNotifText(''); setSendingNotif(false); setRightTab('messages');
  };

  const filtered = tenants.filter(t => `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()));
  const latePayments = payments.filter(p=>p.status==='late'||p.status==='overdue'||p.status==='pending');
  const grouped: { date:string; msgs:Message[] }[] = [];
  messages.forEach(m => {
    const d = new Date(m.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long' });
    const last = grouped[grouped.length-1];
    if (last&&last.date===d) last.msgs.push(m); else grouped.push({ date:d, msgs:[m] });
  });

  return (
    <>
      {longPressId && <div className="fixed inset-0 z-40" onClick={()=>setLongPressId(null)}/>}
      <div className="relative flex h-[calc(100vh-80px)] gap-0 rounded-2xl overflow-hidden border border-border bg-white dark:bg-slate-900 shadow-sm">

        {/* ── LEFT: Tenants list ── */}
        <div className={`${mobileView==='chat'?'hidden':'flex'} md:flex w-full md:w-72 flex-shrink-0 border-r border-border flex-col`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-foreground mb-3">Messagerie</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher locataire..." className={inputCls+' pl-8 text-xs'}/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loading ? <div className="flex justify-center py-8"><LoadingSpinner size={24}/></div>
              : filtered.length===0 ? <div className="p-6 text-center text-sm text-muted-foreground"><MessageSquare size={28} className="mx-auto mb-2 opacity-20"/>Aucun locataire avec compte</div>
              : filtered.map(t => (
                <button key={t.id} onClick={()=>{ setSelected(t); setRightTab('messages'); setMobileView('chat'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${selected?.id===t.id?'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-primary':''}`}>
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{t.first_name.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{t.first_name} {t.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                  </div>
                  {(unread[t.id]||0)>0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">{unread[t.id]}</span>}
                </button>
              ))}
          </div>
        </div>

        {/* ── RIGHT: Chat ── */}
        <div className={`${mobileView==='list'?'hidden':'flex'} md:flex flex-1 flex-col min-w-0`}>
          {/* Mobile back button */}
          <div className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-border bg-white dark:bg-slate-900">
            <button onClick={()=>setMobileView('list')} className="flex items-center gap-1 text-sm text-primary font-medium">
              <ChevronLeft size={18}/> Retour
            </button>
            {selected && <span className="text-sm font-semibold text-foreground truncate ml-2">{selected.first_name} {selected.last_name}</span>}
          </div>

          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-20"/>
                <p className="font-medium text-foreground mb-1">Sélectionnez un locataire</p>
                <p className="text-sm">pour voir la conversation</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">{selected.first_name.charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{selected.first_name} {selected.last_name}</p>
                    <p className="text-xs text-muted-foreground">{selected.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {latePayments.length>0 && <button onClick={()=>setShowNotifModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"><Bell size={13}/>Rappel ({latePayments.length})</button>}
                  <button onClick={()=>setShowNotifModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"><Bell size={13}/>Notifier</button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border bg-slate-50 dark:bg-slate-800/50">
                {[{key:'messages',label:'Messages',icon:<MessageSquare size={13}/>},{key:'tickets',label:`Tickets (${tickets.length})`,icon:<Wrench size={13}/>},{key:'payments',label:`Paiements (${payments.length})`,icon:<CreditCard size={13}/>}].map(tab=>(
                  <button key={tab.key} onClick={()=>setRightTab(tab.key as any)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${rightTab===tab.key?'border-primary text-primary':'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              {/* MESSAGES TAB */}
              {rightTab==='messages' && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {messages.length===0 ? (
                      <div className="text-center py-12 text-muted-foreground"><MessageSquare size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm">Aucun message — lancez la conversation</p></div>
                    ) : grouped.map(group => (
                      <div key={group.date}>
                        <div className="flex items-center gap-3 my-3">
                          <div className="flex-1 h-px bg-border"/>
                          <span className="text-[10px] text-muted-foreground">{group.date}</span>
                          <div className="flex-1 h-px bg-border"/>
                        </div>
                        {group.msgs.map((m,i) => {
                          const isMine   = m.sender_role==='company';
                          const prevSame = i>0 && group.msgs[i-1].sender_role===m.sender_role;
                          const isAudio  = m.message_type==='audio' && m.audio_url;
                          return (
                            <div key={m.id} className={`flex ${isMine?'justify-end':'justify-start'} ${prevSame?'mt-0.5':'mt-3'} relative`}>
                              {!isMine && !prevSame && <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold mr-2 self-end mb-1 flex-shrink-0">{selected.first_name.charAt(0)}</div>}
                              {!isMine && prevSame && <div className="w-7 mr-2 flex-shrink-0"/>}
                              <div className="max-w-[70%]">
                                {editingMsgId===m.id ? (
                                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-primary rounded-2xl px-3 py-2">
                                    <input value={editMsgText} onChange={e=>setEditMsgText(e.target.value)} className="flex-1 text-sm outline-none bg-transparent text-foreground"/>
                                    <button onClick={saveEditMsg} className="text-green-600"><Check size={14}/></button>
                                    <button onClick={()=>setEditingMsgId(null)} className="text-red-500"><X size={14}/></button>
                                  </div>
                                ) : (
                                  <div
                                    onTouchStart={()=>handleLongPressStart(m.id)} onTouchEnd={handleLongPressEnd}
                                    onContextMenu={e=>{e.preventDefault();setLongPressId(m.id);}}
                                    className={`relative rounded-2xl px-3 py-2 ${isMine?'bg-primary text-white rounded-br-sm':'bg-slate-100 dark:bg-slate-800 rounded-bl-sm'}`}>
                                    {isAudio ? (
                                      <div>
                                        <p className={`text-[10px] mb-1 font-medium ${isMine?'text-white/70':'text-muted-foreground'}`}>🎤 Note vocale</p>
                                        <AudioPlayer src={m.audio_url!} isMine={isMine}/>
                                      </div>
                                    ) : (
                                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                                    )}
                                    <p className={`text-[10px] mt-0.5 text-right ${isMine?'text-white/60':'text-muted-foreground'}`}>
                                      {new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                                    </p>
                                    {longPressId===m.id && (
                                      <div className={`absolute z-50 flex flex-col gap-1 bg-white dark:bg-slate-800 border border-border rounded-xl shadow-lg p-1.5 ${isMine?'right-0':'left-0'} bottom-full mb-1`} onClick={e=>e.stopPropagation()}>
                                        {isMine && !isAudio && <button onClick={()=>startEditMsg(m)} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground whitespace-nowrap"><Pencil size={11}/>Modifier</button>}
                                        <button onClick={()=>deleteMsg(m.id)} disabled={deletingMsgId===m.id} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-red-50 text-red-600 whitespace-nowrap">
                                          {deletingMsgId===m.id?<LoadingSpinner size={11}/>:<Trash2 size={11}/>}Supprimer
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
                  <div className="flex gap-2 p-3 border-t border-border">
                    <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder={`Message à ${selected.first_name}...`} className={inputCls+' flex-1 text-sm'}/>
                    {recording ? (
                      <button onClick={stopRecording} className="flex items-center gap-1.5 px-3 h-9 bg-red-500 rounded-xl text-white text-xs font-bold animate-pulse">
                        <Square size={12}/>{String(recordingTime).padStart(2,'0')}s
                      </button>
                    ) : (
                      <button onClick={startRecording} disabled={sending} className="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-blue-50 transition-colors flex-shrink-0">
                        <Mic size={14}/>
                      </button>
                    )}
                    <button onClick={send} disabled={!text.trim()||sending} className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-50 flex-shrink-0">
                      {sending?<LoadingSpinner size={14}/>:<Send size={14}/>}
                    </button>
                  </div>
                </>
              )}

              {/* TICKETS TAB */}
              {rightTab==='tickets' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {tickets.length===0 ? <div className="text-center py-12 text-muted-foreground"><Wrench size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm">Aucun ticket signalé</p></div>
                    : tickets.map(t => {
                      const sm = TICKET_STATUS[t.status]||{l:t.status,v:'default' as BadgeVariant};
                      return (
                        <div key={t.id} className="bg-white dark:bg-slate-800 rounded-xl border border-border p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <p className="font-semibold text-foreground text-sm">{TICKET_PRIORITY[t.priority]||'⚪'} {t.title}</p>
                              <p className="text-xs text-muted-foreground capitalize mt-0.5">{t.category} · {formatDate(t.created_at)}</p>
                            </div>
                            <Badge variant={sm.v}>{sm.l}</Badge>
                          </div>
                          {t.description && <p className="text-sm text-muted-foreground mb-3">{t.description}</p>}
                          <div className="flex items-center gap-2 flex-wrap">
                            {t.status==='open' && <button onClick={()=>updateTicketStatus(t.id,'in_progress')} className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"><Clock size={11}/>Prendre en charge</button>}
                            {t.status==='in_progress' && <button onClick={()=>updateTicketStatus(t.id,'resolved')} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"><CheckCircle size={11}/>Marquer résolu</button>}
                            {(t.status==='open'||t.status==='in_progress') && <button onClick={()=>updateTicketStatus(t.id,'closed')} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"><X size={11}/>Fermer</button>}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* PAYMENTS TAB */}
              {rightTab==='payments' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {payments.length===0 ? <div className="text-center py-12 text-muted-foreground"><CreditCard size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm">Aucun paiement</p></div>
                    : payments.map(p => {
                      const isLate = p.status==='late'||p.status==='overdue';
                      const isPaid = p.status==='paid';
                      return (
                        <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${isLate?'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800':'bg-white dark:bg-slate-800 border-border'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPaid?'bg-green-100 text-green-600':isLate?'bg-red-100 text-red-600':'bg-amber-100 text-amber-600'}`}>
                              {isPaid?<CheckCircle size={14}/>:isLate?<AlertTriangle size={14}/>:<Clock size={14}/>}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{MONTHS[p.period_month-1]} {p.period_year}</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(p.amount)}</p>
                            </div>
                          </div>
                          <Badge variant={isPaid?'success':isLate?'error':'warning'}>{isPaid?'Payé':isLate?'Impayé':'En attente'}</Badge>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL NOTIFICATION */}
      {showNotifModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div><h3 className="font-semibold text-foreground">Envoyer une notification</h3><p className="text-xs text-muted-foreground mt-0.5">à {selected.first_name} {selected.last_name}</p></div>
              <button onClick={()=>setShowNotifModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16}/></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Modèles rapides</p>
              <div className="grid grid-cols-1 gap-2">
                {['Rappel : votre loyer du mois est en attente. Merci de régulariser votre situation.','Votre loyer est en retard. Veuillez effectuer votre paiement dans les plus brefs délais.','Votre contrat de bail arrive à expiration. Veuillez nous contacter pour le renouvellement.'].map((tpl,i)=>(
                  <button key={i} onClick={()=>setNotifText(tpl)} className="text-left px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-muted-foreground hover:bg-blue-50 hover:text-primary transition-colors border border-border">{tpl}</button>
                ))}
              </div>
              <textarea value={notifText} onChange={e=>setNotifText(e.target.value)} placeholder="Ou écrivez votre message personnalisé..." rows={3} className={inputCls+' resize-none text-sm w-full'}/>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
              <button onClick={()=>setShowNotifModal(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Annuler</button>
              <button onClick={sendPaymentReminder} disabled={!notifText.trim()||sendingNotif} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                {sendingNotif?<LoadingSpinner size={14}/>:<Bell size={14}/>}Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}