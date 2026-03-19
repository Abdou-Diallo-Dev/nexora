'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Send, MessageSquare, Search, Bell, Wrench, CreditCard, CheckCircle, Clock, AlertTriangle, X, ChevronLeft, Mic, Square, Play, Pause, Pencil, Trash2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, inputCls, Badge, BadgeVariant } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type Tenant  = { id:string; first_name:string; last_name:string; email:string };
type Message = { id:string; content:string; sender_role:string; sender_name:string; sender_id:string|null; created_at:string; is_read:boolean; audio_url:string|null; message_type:string|null };
type Ticket  = { id:string; title:string; category:string; priority:string; status:string; description:string|null; created_at:string };
type Payment = { id:string; amount:number; period_month:number; period_year:number; status:string };

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const PRIORITY_ICON: Record<string,string> = { low:'🟢', normal:'🟡', high:'🟠', urgent:'🔴' };
const TICKET_STATUS: Record<string,{l:string;v:BadgeVariant}> = {
  open:{l:'Ouvert',v:'error'}, in_progress:{l:'En cours',v:'warning'}, resolved:{l:'Résolu',v:'success'}, closed:{l:'Fermé',v:'default'}
};

function getMimeType() {
  for (const t of ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg'])
    if (typeof MediaRecorder!=='undefined' && MediaRecorder.isTypeSupported(t)) return t;
  return 'audio/webm';
}

function AudioPlayer({ src, isMine }: { src:string; isMine:boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);
  const fmt = (s:number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const toggle = () => { const a=ref.current; if(!a)return; playing?a.pause():a.play(); setPlaying(!playing); };
  useEffect(()=>{
    const a=ref.current; if(!a)return;
    const onT=()=>{setCur(a.currentTime);setProg(a.duration?(a.currentTime/a.duration)*100:0);};
    const onL=()=>setDur(a.duration);
    const onE=()=>{setPlaying(false);setProg(0);setCur(0);};
    a.addEventListener('timeupdate',onT); a.addEventListener('loadedmetadata',onL); a.addEventListener('ended',onE);
    return ()=>{a.removeEventListener('timeupdate',onT); a.removeEventListener('loadedmetadata',onL); a.removeEventListener('ended',onE);};
  },[]);
  const seek=(e:React.MouseEvent<HTMLDivElement>)=>{const a=ref.current;if(!a||!a.duration)return;const r=e.currentTarget.getBoundingClientRect();a.currentTime=((e.clientX-r.left)/r.width)*a.duration;};
  return (
    <div className="flex items-center gap-2 py-1" style={{minWidth:180}}>
      <audio ref={ref} src={src} preload="metadata"/>
      <button onClick={toggle} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMine?'bg-white/20':'bg-primary/10'}`}>
        {playing?<Pause size={13} className={isMine?'text-white':'text-primary'}/>:<Play size={13} className={isMine?'text-white':'text-primary'} style={{marginLeft:2}}/>}
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-1.5 rounded-full cursor-pointer" style={{background:isMine?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.1)'}} onClick={seek}>
          <div className="h-full rounded-full" style={{width:`${prog}%`,background:isMine?'white':'#3b82f6',transition:'width 0.1s'}}/>
        </div>
        <div className="flex justify-between">
          <span className={`text-[9px] ${isMine?'text-white/60':'text-muted-foreground'}`}>{fmt(cur)}</span>
          <span className={`text-[9px] ${isMine?'text-white/60':'text-muted-foreground'}`}>{fmt(dur)}</span>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { company, user } = useAuthStore();
  const [tenants, setTenants]     = useState<Tenant[]>([]);
  const [selected, setSelected]   = useState<Tenant|null>(null);
  const [mobileView, setMobileView] = useState<'list'|'chat'>('list');
  const [messages, setMessages]   = useState<Message[]>([]);
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [payments, setPayments]   = useState<Payment[]>([]);
  const [text, setText]           = useState('');
  const [search, setSearch]       = useState('');
  const [unread, setUnread]       = useState<Record<string,number>>({});
  const [rightTab, setRightTab]   = useState<'messages'|'tickets'|'payments'>('messages');
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingMsgs, setLoadingMsgs]       = useState(false);
  const [sending, setSending]     = useState(false);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime]     = useState(0);
  const [editId, setEditId]       = useState<string|null>(null);
  const [editText, setEditText]   = useState('');
  const [menuId, setMenuId]       = useState<string|null>(null);
  const [showNotif, setShowNotif] = useState(false);
  const [notifText, setNotifText] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const mediaRef    = useRef<MediaRecorder|null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<NodeJS.Timeout|null>(null);
  const longRef     = useRef<NodeJS.Timeout|null>(null);
  const selectedRef = useRef<Tenant|null>(null);
  const channelRef  = useRef<any>(null);

  useEffect(()=>{ selectedRef.current=selected; },[selected]);

  // Load tenants once
  useEffect(()=>{
    if(!company?.id) return;
    const sb=createClient();
    // Only tenants with active portal accounts
    Promise.all([
      sb.from('tenant_accounts').select('tenant_id,tenants(id,first_name,last_name,email)').eq('company_id',company.id),
      sb.from('messages').select('tenant_id').eq('company_id',company.id).eq('sender_role','tenant').eq('is_read',false),
    ]).then(([{data:taData},{data:ur}])=>{
      const seen = new Set<string>();
      const list: Tenant[] = [];
      (taData||[]).forEach((d:any)=>{
        const t = d.tenants;
        if(t && !seen.has(t.id)){ seen.add(t.id); list.push(t as Tenant); }
      });
      setTenants(list);
      const counts:Record<string,number>={};
      (ur||[]).forEach((m:any)=>{counts[m.tenant_id]=(counts[m.tenant_id]||0)+1;});
      setUnread(counts);
      setLoadingTenants(false);
    });
  },[company?.id]);

  // Subscribe/unsubscribe on tenant change
  const subscribeTenant = useCallback((t: Tenant)=>{
    if(!company?.id) return;
    const sb=createClient();
    // Cleanup old channel
    if(channelRef.current){ sb.removeChannel(channelRef.current); }
    const ch=sb.channel(`admin-chat-${t.id}-${Date.now()}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`tenant_id=eq.${t.id}`},(p)=>{
        const msg=p.new as Message;
        setMessages(prev=>prev.some(m=>m.id===msg.id)?prev:[...prev,msg]);
        if(msg.sender_role==='tenant'){
          sb.from('messages').update({is_read:true}).eq('id',msg.id);
          setUnread(prev=>({...prev,[t.id]:0}));
        }
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:`tenant_id=eq.${t.id}`},(p)=>{
        setMessages(prev=>prev.map(m=>m.id===(p.new as Message).id?p.new as Message:m));
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'messages',filter:`tenant_id=eq.${t.id}`},(p)=>{
        setMessages(prev=>prev.filter(m=>m.id!==(p.old as any).id));
      })
      .subscribe();
    channelRef.current=ch;
  },[company?.id]);

  const selectTenant = useCallback(async(t: Tenant)=>{
    setSelected(t);
    setMobileView('chat');
    setRightTab('messages');
    setLoadingMsgs(true);
    setMessages([]);
    setUnread(prev=>({...prev,[t.id]:0}));
    const sb=createClient();
    // Mark as read immediately
    sb.from('messages').update({is_read:true}).eq('tenant_id',t.id).eq('sender_role','tenant');
    // Load messages
    let q=sb.from('messages').select('id,content,sender_role,sender_name,created_at,is_read,sender_id,audio_url,message_type').eq('tenant_id',t.id).eq('company_id',company!.id);
    if(user?.role!=='admin'&&user?.role!=='super_admin') q=q.or(`sender_id.eq.${user?.id},sender_role.eq.tenant`);
    const {data:msgs}=await q.order('created_at',{ascending:true});
    setMessages((msgs||[]) as Message[]);
    setLoadingMsgs(false);
    // Load tickets + payments
    sb.from('tenant_tickets').select('id,title,category,priority,status,description,created_at').eq('tenant_id',t.id).order('created_at',{ascending:false}).then(({data})=>setTickets((data||[]) as Ticket[]));
    sb.from('rent_payments').select('id,amount,period_month,period_year,status').eq('tenant_id',t.id).eq('company_id',company!.id).order('period_year',{ascending:false}).order('period_month',{ascending:false}).limit(12).then(({data})=>setPayments((data||[]) as Payment[]));
    subscribeTenant(t);
  },[company?.id, user?.role, subscribeTenant]);

  useEffect(()=>()=>{ if(channelRef.current) createClient().removeChannel(channelRef.current); },[]);
  useEffect(()=>{ if(messages.length>0) bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

  const send = async()=>{
    if(!text.trim()||!selected||sending) return;
    setSending(true);
    const c=text.trim(); setText('');
    await createClient().from('messages').insert({tenant_id:selected.id,company_id:company!.id,sender_role:'company',sender_name:user?.full_name||'Gestionnaire',sender_id:user?.id,content:c,is_read:false,message_type:'text'});
    setSending(false);
  };

  const startRec=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mt=getMimeType();
      const mr=new MediaRecorder(stream,mt?{mimeType:mt}:undefined);
      mediaRef.current=mr; chunksRef.current=[];
      mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
      mr.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        const t=selectedRef.current; if(!t||!company?.id)return;
        const ext=mt.includes('mp4')?'mp4':mt.includes('ogg')?'ogg':'webm';
        const blob=new Blob(chunksRef.current,{type:mt||'audio/webm'});
        const fn=`voice/${t.id}/${Date.now()}.${ext}`;
        const sb=createClient();
        const{error}=await sb.storage.from('messages-audio').upload(fn,blob,{upsert:true,contentType:mt||'audio/webm'});
        if(error){toast.error('Upload failed');return;}
        const{data:url}=sb.storage.from('messages-audio').getPublicUrl(fn);
        if(!url?.publicUrl)return;
        await sb.from('messages').insert({tenant_id:t.id,company_id:company.id,sender_role:'company',sender_name:user?.full_name||'Gestionnaire',sender_id:user?.id,content:'🎤 Note vocale',audio_url:url.publicUrl,message_type:'audio',is_read:false});
        toast.success('Note vocale envoyée ✓');
      };
      mr.start(100); setRecording(true); setRecTime(0);
      timerRef.current=setInterval(()=>setRecTime(t=>t+1),1000);
    }catch{toast.error('Microphone non disponible');}
  };
  const stopRec=()=>{mediaRef.current?.stop();setRecording(false);if(timerRef.current)clearInterval(timerRef.current);setRecTime(0);};

  const softDelete=async(id:string)=>{
    setMenuId(null);
    await createClient().from('messages').update({content:'_deleted_',message_type:'text',audio_url:null}).eq('id',id);
  };
  const startEdit=(m:Message)=>{ setEditId(m.id); setEditText(m.content.replace(/✏️$/,'')); setMenuId(null); };
  const saveEdit=async()=>{
    if(!editId||!editText.trim())return;
    await createClient().from('messages').update({content:editText.trim()+'✏️'}).eq('id',editId);
    setEditId(null); setEditText('');
  };

  const updateTicket=async(id:string,status:string)=>{
    await createClient().from('tenant_tickets').update({status}).eq('id',id);
    setTickets(prev=>prev.map(t=>t.id===id?{...t,status}:t));
    toast.success('Statut mis à jour');
  };

  const sendNotif=async()=>{
    if(!selected||!notifText.trim())return;
    setSendingNotif(true);
    const sb=createClient();
    const{data:ta}=await sb.from('tenant_accounts').select('user_id').eq('tenant_id',selected.id).maybeSingle();
    if(ta?.user_id) await sb.from('notifications').insert({user_id:ta.user_id,tenant_id:selected.id,company_id:company?.id,type:'info',title:'Rappel',message:notifText.trim(),link:'/tenant-portal/payments'});
    await sb.from('messages').insert({tenant_id:selected.id,company_id:company?.id,sender_role:'company',sender_name:user?.full_name||'Gestionnaire',sender_id:user?.id,content:`🔔 ${notifText.trim()}`,is_read:false,message_type:'text'});
    toast.success('Notification envoyée');
    setShowNotif(false); setNotifText(''); setSendingNotif(false);
  };

  const filtered=tenants.filter(t=>`${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()));
  const grouped:{ date:string; msgs:Message[] }[]=[];
  messages.forEach(m=>{
    const d=new Date(m.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long'});
    const last=grouped[grouped.length-1];
    if(last&&last.date===d) last.msgs.push(m); else grouped.push({date:d,msgs:[m]});
  });
  const latePayments=payments.filter(p=>p.status==='late'||p.status==='overdue'||p.status==='pending');

  return (
    <>
      {menuId && <div className="fixed inset-0 z-40" onClick={()=>setMenuId(null)}/>}
      <div className="relative flex h-[calc(100vh-80px)] gap-0 rounded-2xl overflow-hidden border border-border bg-white dark:bg-slate-900 shadow-sm">

        {/* LEFT: Tenants */}
        <div className={`${mobileView==='chat'?'hidden':'flex'} md:flex w-full md:w-72 flex-shrink-0 border-r border-border flex-col`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-foreground mb-3">Messagerie</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." className={inputCls+' pl-8 text-xs'}/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loadingTenants ? <div className="flex justify-center py-8"><LoadingSpinner size={24}/></div>
              : filtered.length===0 ? <div className="p-6 text-center text-sm text-muted-foreground"><MessageSquare size={28} className="mx-auto mb-2 opacity-20"/>Aucun locataire</div>
              : filtered.map(t=>(
                <button key={t.id} onClick={()=>selectTenant(t)}
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

        {/* RIGHT: Chat */}
        <div className={`${mobileView==='list'?'hidden':'flex'} md:flex flex-1 flex-col min-w-0`}>
          {/* Mobile back */}
          <div className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-border">
            <button onClick={()=>setMobileView('list')} className="flex items-center gap-1 text-sm text-primary font-medium"><ChevronLeft size={18}/>Retour</button>
            {selected && <span className="text-sm font-semibold text-foreground truncate ml-2">{selected.first_name} {selected.last_name}</span>}
          </div>

          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><MessageSquare size={40} className="mx-auto mb-3 opacity-20"/><p className="font-medium text-foreground">Sélectionnez un locataire</p></div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white dark:bg-slate-900 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">{selected.first_name.charAt(0)}</div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{selected.first_name} {selected.last_name}</p>
                    <p className="text-xs text-muted-foreground">{selected.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {latePayments.length>0 && <button onClick={()=>setShowNotif(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium"><Bell size={12}/>Rappel</button>}
                  <button onClick={()=>setShowNotif(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-primary rounded-lg text-xs font-medium"><Bell size={12}/>Notifier</button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
                {[{k:'messages',l:'Messages',i:<MessageSquare size={12}/>},{k:'tickets',l:`Tickets (${tickets.length})`,i:<Wrench size={12}/>},{k:'payments',l:`Paiements (${payments.length})`,i:<CreditCard size={12}/>}].map(tab=>(
                  <button key={tab.k} onClick={()=>setRightTab(tab.k as any)} className={`flex items-center gap-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${rightTab===tab.k?'border-primary text-primary':'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {tab.i}{tab.l}
                  </button>
                ))}
              </div>

              {/* MESSAGES */}
              {rightTab==='messages' && (
                <>
                  <div className="flex-1 overflow-y-auto p-4">
                    {loadingMsgs ? <div className="flex justify-center py-8"><LoadingSpinner size={24}/></div>
                      : messages.length===0 ? <div className="text-center py-12 text-muted-foreground"><MessageSquare size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm">Aucun message</p></div>
                      : grouped.map(group=>(
                        <div key={group.date}>
                          <div className="flex items-center gap-3 my-3">
                            <div className="flex-1 h-px bg-border"/>
                            <span className="text-[10px] text-muted-foreground px-1">{group.date}</span>
                            <div className="flex-1 h-px bg-border"/>
                          </div>
                          {group.msgs.map((m,i)=>{
                            const isMine=m.sender_role==='company';
                            const prevSame=i>0&&group.msgs[i-1].sender_role===m.sender_role;
                            const isAudio=m.message_type==='audio'&&!!m.audio_url;
                            const isDeleted=m.content==='_deleted_';
                            return (
                              <div key={m.id} className={`flex ${isMine?'justify-end':'justify-start'} ${prevSame?'mt-0.5':'mt-3'}`}>
                                {!isMine&&!prevSame&&<div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold mr-1.5 self-end mb-1 flex-shrink-0">{selected.first_name.charAt(0)}</div>}
                                {!isMine&&prevSame&&<div className="w-6 mr-1.5 flex-shrink-0"/>}
                                <div className="max-w-[72%] relative">
                                  {editId===m.id ? (
                                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-primary rounded-2xl px-3 py-2">
                                      <input value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveEdit()} className="flex-1 text-sm outline-none bg-transparent text-foreground" autoFocus/>
                                      <button onClick={saveEdit} className="text-green-600 flex-shrink-0"><Check size={14}/></button>
                                      <button onClick={()=>setEditId(null)} className="text-red-500 flex-shrink-0"><X size={14}/></button>
                                    </div>
                                  ) : (
                                    <div
                                      onTouchStart={()=>{ longRef.current=setTimeout(()=>setMenuId(m.id),500); }}
                                      onTouchEnd={()=>{ if(longRef.current)clearTimeout(longRef.current); }}
                                      onTouchMove={()=>{ if(longRef.current)clearTimeout(longRef.current); }}
                                      onContextMenu={e=>{e.preventDefault();setMenuId(m.id);}}
                                      style={{WebkitUserSelect:'none',userSelect:'none',WebkitTouchCallout:'none'}}
                                      className={`relative rounded-2xl px-3 py-2 ${isMine?'bg-primary text-white rounded-br-sm':'bg-slate-100 dark:bg-slate-800 rounded-bl-sm'}`}>
                                      {isDeleted ? (
                                        <p className="text-sm italic opacity-50">🚫 Message supprimé</p>
                                      ) : isAudio ? (
                                        <div>
                                          <p className={`text-[10px] mb-1 ${isMine?'text-white/70':'text-muted-foreground'}`}>🎤 Note vocale</p>
                                          <AudioPlayer src={m.audio_url!} isMine={isMine}/>
                                        </div>
                                      ) : (
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                                      )}
                                      <p className={`text-[10px] mt-0.5 text-right ${isMine?'text-white/50':'text-muted-foreground'}`}>
                                        {new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                                      </p>
                                      {/* Context menu */}
                                      {menuId===m.id&&!isDeleted&&(
                                        <div className={`absolute z-50 bg-white dark:bg-slate-800 border border-border rounded-xl shadow-xl p-1 ${isMine?'right-0':'left-0'} bottom-full mb-1 min-w-[120px]`} onClick={e=>e.stopPropagation()}>
                                          {isMine&&!isAudio&&<button onClick={()=>startEdit(m)} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground"><Pencil size={12}/>Modifier</button>}
                                          <button onClick={()=>softDelete(m.id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={12}/>Supprimer</button>
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
                  <div className="flex gap-2 p-3 border-t border-border flex-shrink-0 bg-white dark:bg-slate-900">
                    <input ref={inputRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder={`Message à ${selected.first_name}...`} className={inputCls+' flex-1 text-sm'} disabled={recording}/>
                    {recording ? (
                      <button onClick={stopRec} className="flex items-center gap-1 px-3 h-9 bg-red-500 rounded-xl text-white text-xs font-bold animate-pulse flex-shrink-0">
                        <Square size={11}/>{String(recTime).padStart(2,'0')}s
                      </button>
                    ) : (
                      <button onClick={startRec} disabled={sending} className="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                        <Mic size={15}/>
                      </button>
                    )}
                    <button onClick={send} disabled={!text.trim()||sending||recording} className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0">
                      {sending?<LoadingSpinner size={13}/>:<Send size={14}/>}
                    </button>
                  </div>
                </>
              )}

              {/* TICKETS */}
              {rightTab==='tickets' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {tickets.length===0 ? <div className="text-center py-12 text-muted-foreground"><Wrench size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm">Aucun ticket</p></div>
                    : tickets.map(t=>{
                      const sm=TICKET_STATUS[t.status]||{l:t.status,v:'default' as BadgeVariant};
                      return (
                        <div key={t.id} className="bg-white dark:bg-slate-800 rounded-xl border border-border p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div><p className="font-semibold text-foreground text-sm">{PRIORITY_ICON[t.priority]||'⚪'} {t.title}</p><p className="text-xs text-muted-foreground">{t.category} · {formatDate(t.created_at)}</p></div>
                            <Badge variant={sm.v}>{sm.l}</Badge>
                          </div>
                          {t.description&&<p className="text-sm text-muted-foreground mb-3">{t.description}</p>}
                          <div className="flex gap-2 flex-wrap">
                            {t.status==='open'&&<button onClick={()=>updateTicket(t.id,'in_progress')} className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium"><Clock size={11}/>Prendre en charge</button>}
                            {t.status==='in_progress'&&<button onClick={()=>updateTicket(t.id,'resolved')} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium"><CheckCircle size={11}/>Résolu</button>}
                            {(t.status==='open'||t.status==='in_progress')&&<button onClick={()=>updateTicket(t.id,'closed')} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium"><X size={11}/>Fermer</button>}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* PAYMENTS */}
              {rightTab==='payments' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {payments.length===0 ? <div className="text-center py-12 text-muted-foreground"><CreditCard size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm">Aucun paiement</p></div>
                    : payments.map(p=>{
                      const isPaid=p.status==='paid'; const isLate=p.status==='late'||p.status==='overdue';
                      return (
                        <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${isLate?'bg-red-50 border-red-100':'bg-white dark:bg-slate-800 border-border'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPaid?'bg-green-100 text-green-600':isLate?'bg-red-100 text-red-600':'bg-amber-100 text-amber-600'}`}>
                              {isPaid?<CheckCircle size={14}/>:isLate?<AlertTriangle size={14}/>:<Clock size={14}/>}
                            </div>
                            <div><p className="font-medium text-sm text-foreground">{MONTHS[p.period_month-1]} {p.period_year}</p><p className="text-xs text-muted-foreground">{formatCurrency(Number(p.amount))}</p></div>
                          </div>
                          <Badge variant={isPaid?'success':isLate?'error':'warning'}>{isPaid?'Payé':isLate?'Retard':'Attente'}</Badge>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* NOTIF MODAL */}
      {showNotif&&selected&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div><h3 className="font-semibold text-foreground">Envoyer une notification</h3><p className="text-xs text-muted-foreground">à {selected.first_name} {selected.last_name}</p></div>
              <button onClick={()=>setShowNotif(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16}/></button>
            </div>
            <div className="p-5 space-y-3">
              {['Rappel : votre loyer du mois est en attente. Merci de régulariser votre situation.','Votre loyer est en retard. Veuillez effectuer votre paiement dans les plus brefs délais.','Votre contrat de bail arrive à expiration. Veuillez nous contacter pour le renouvellement.'].map((tpl,i)=>(
                <button key={i} onClick={()=>setNotifText(tpl)} className="text-left w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-muted-foreground hover:bg-blue-50 hover:text-primary transition-colors border border-border">{tpl}</button>
              ))}
              <textarea value={notifText} onChange={e=>setNotifText(e.target.value)} placeholder="Message personnalisé..." rows={3} className={inputCls+' resize-none text-sm w-full'}/>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button onClick={()=>setShowNotif(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={sendNotif} disabled={!notifText.trim()||sendingNotif} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {sendingNotif?<LoadingSpinner size={14}/>:<Bell size={14}/>}Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}