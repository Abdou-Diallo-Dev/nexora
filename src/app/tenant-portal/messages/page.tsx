'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Send, MessageSquare, Mic, Square, Play, Pause, Pencil, Trash2, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, inputCls } from '@/components/ui';
import { toast } from 'sonner';

type Message = { id:string; content:string; sender_role:string; sender_name:string; created_at:string; audio_url:string|null; message_type:string|null };
type TA = { tenant_id:string; company_id:string };

function getMimeType() {
  for (const t of ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg'])
    if (typeof MediaRecorder!=='undefined' && MediaRecorder.isTypeSupported(t)) return t;
  return 'audio/webm';
}

function AudioPlayer({ src, isMine }: { src:string; isMine:boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg]       = useState(0);
  const [dur, setDur]         = useState(0);
  const [cur, setCur]         = useState(0);
  const fmt = (s:number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const toggle = () => { const a=ref.current; if(!a)return; playing?a.pause():a.play(); setPlaying(!playing); };
  useEffect(()=>{
    const a=ref.current; if(!a) return;
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

export default function TenantMessagesPage() {
  const { user } = useAuthStore();
  const [ta, setTa]               = useState<TA|null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime]     = useState(0);
  const [menuId, setMenuId]       = useState<string|null>(null);
  const [editId, setEditId]       = useState<string|null>(null);
  const [editText, setEditText]   = useState('');
  const bottomRef  = useRef<HTMLDivElement>(null);
  const mediaRef   = useRef<MediaRecorder|null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const timerRef   = useRef<NodeJS.Timeout|null>(null);
  const longRef    = useRef<NodeJS.Timeout|null>(null);
  const taRef      = useRef<TA|null>(null);
  const channelRef = useRef<any>(null);

  useEffect(()=>{ taRef.current=ta; },[ta]);

  useEffect(()=>{
    if(!user?.id) return;
    const sb=createClient();
    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id',user.id).maybeSingle()
      .then(async({data})=>{
        if(!data){setLoading(false);return;}
        setTa(data);
        // Load messages
        const{data:msgs}=await sb.from('messages')
          .select('id,content,sender_role,sender_name,created_at,audio_url,message_type')
          .eq('tenant_id',data.tenant_id).order('created_at',{ascending:true});
        setMessages((msgs||[]) as Message[]);
        // Mark company messages read
        sb.from('messages').update({is_read:true}).eq('tenant_id',data.tenant_id).eq('sender_role','company');
        setLoading(false);
        // Subscribe
        const ch=sb.channel(`tenant-chat-${data.tenant_id}-${Date.now()}`)
          .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`tenant_id=eq.${data.tenant_id}`},(p)=>{
            const msg=p.new as Message;
            setMessages(prev=>prev.some(m=>m.id===msg.id)?prev:[...prev,msg]);
            if(msg.sender_role==='company') sb.from('messages').update({is_read:true}).eq('id',msg.id);
          })
          .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:`tenant_id=eq.${data.tenant_id}`},(p)=>{
            setMessages(prev=>prev.map(m=>m.id===(p.new as Message).id?p.new as Message:m));
          })
          .subscribe();
        channelRef.current=ch;
        return ()=>{sb.removeChannel(ch);};
      });
    return ()=>{ if(channelRef.current) sb.removeChannel(channelRef.current); };
  },[user?.id]);

  useEffect(()=>{ if(messages.length>0) bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

  const send=async()=>{
    if(!text.trim()||!ta||sending)return;
    setSending(true);
    const c=text.trim(); setText('');
    await createClient().from('messages').insert({tenant_id:ta.tenant_id,company_id:ta.company_id,sender_role:'tenant',sender_name:user?.full_name||'Locataire',content:c,is_read:false,message_type:'text'});
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
        const currentTa=taRef.current; if(!currentTa)return;
        const ext=mt.includes('mp4')?'mp4':mt.includes('ogg')?'ogg':'webm';
        const blob=new Blob(chunksRef.current,{type:mt||'audio/webm'});
        const fn=`voice/${currentTa.tenant_id}/${Date.now()}.${ext}`;
        const sb=createClient();
        const{error}=await sb.storage.from('messages-audio').upload(fn,blob,{upsert:true,contentType:mt||'audio/webm'});
        if(error){toast.error('Upload échoué');return;}
        const{data:url}=sb.storage.from('messages-audio').getPublicUrl(fn);
        if(!url?.publicUrl)return;
        await sb.from('messages').insert({tenant_id:currentTa.tenant_id,company_id:currentTa.company_id,sender_role:'tenant',sender_name:user?.full_name||'Locataire',content:'🎤 Note vocale',audio_url:url.publicUrl,message_type:'audio',is_read:false});
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
    setMessages(prev=>prev.map(m=>m.id===id?{...m,content:'_deleted_',message_type:'text',audio_url:null}:m));
  };
  const startEdit=(m:Message)=>{setEditId(m.id);setEditText(m.content.replace(/✏️$/,''));setMenuId(null);};
  const saveEdit=async()=>{
    if(!editId||!editText.trim())return;
    const nc=editText.trim()+'✏️';
    await createClient().from('messages').update({content:nc}).eq('id',editId);
    setMessages(prev=>prev.map(m=>m.id===editId?{...m,content:nc}:m));
    setEditId(null); setEditText('');
  };

  if(loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  const grouped:{date:string;msgs:Message[]}[]=[];
  messages.forEach(m=>{
    const d=new Date(m.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
    const last=grouped[grouped.length-1];
    if(last&&last.date===d)last.msgs.push(m); else grouped.push({date:d,msgs:[m]});
  });

  return (
    <>
      {menuId&&<div className="fixed inset-0 z-40" onClick={()=>setMenuId(null)}/>}
      <div className="flex flex-col h-[calc(100vh-180px)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3 flex-shrink-0">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><MessageSquare size={20} className="text-primary"/></div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Messagerie</h1>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/><p className="text-xs text-muted-foreground">Votre gestionnaire</p></div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-3">
          {messages.length===0 ? (
            <div className="text-center py-12 text-muted-foreground"><MessageSquare size={36} className="mx-auto mb-3 opacity-20"/><p className="font-medium text-foreground mb-1">Aucun message</p><p className="text-sm">Démarrez la conversation</p></div>
          ) : grouped.map(group=>(
            <div key={group.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border"/>
                <span className="text-[10px] text-muted-foreground px-2">{group.date}</span>
                <div className="flex-1 h-px bg-border"/>
              </div>
              {group.msgs.map((m,i)=>{
                const isMine=m.sender_role==='tenant';
                const prevSame=i>0&&group.msgs[i-1].sender_role===m.sender_role;
                const isAudio=m.message_type==='audio'&&!!m.audio_url;
                const isDeleted=m.content==='_deleted_';
                return (
                  <div key={m.id} className={`flex ${isMine?'justify-end':'justify-start'} ${prevSame?'mt-0.5':'mt-3'}`}>
                    {!isMine&&!prevSame&&<div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end mb-1">{m.sender_name.charAt(0).toUpperCase()}</div>}
                    {!isMine&&prevSame&&<div className="w-7 mr-2 flex-shrink-0"/>}
                    <div className="max-w-[78%] flex flex-col">
                      {!isMine&&!prevSame&&<p className="text-[10px] font-semibold text-primary mb-1 ml-1">{m.sender_name}</p>}
                      {editId===m.id ? (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-primary rounded-2xl px-3 py-2">
                          <input value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveEdit()} className="flex-1 text-sm outline-none bg-transparent" autoFocus/>
                          <button onClick={saveEdit} className="text-green-600"><Check size={14}/></button>
                          <button onClick={()=>setEditId(null)} className="text-red-500"><X size={14}/></button>
                        </div>
                      ) : (
                        <div
                          onTouchStart={()=>{longRef.current=setTimeout(()=>setMenuId(m.id),500);}}
                          onTouchEnd={()=>{if(longRef.current)clearTimeout(longRef.current);}}
                          onTouchMove={()=>{if(longRef.current)clearTimeout(longRef.current);}}
                          onContextMenu={e=>{e.preventDefault();setMenuId(m.id);}}
                          style={{WebkitUserSelect:'none',userSelect:'none',WebkitTouchCallout:'none'}}
                          className={`relative rounded-2xl px-3 py-2.5 ${isMine?'bg-primary text-white rounded-br-sm':'bg-white dark:bg-slate-800 border border-border rounded-bl-sm'}`}>
                          {isDeleted ? (
                            <p className="text-sm italic opacity-50">🚫 Message supprimé</p>
                          ) : isAudio ? (
                            <div><p className={`text-[10px] mb-1.5 ${isMine?'text-white/70':'text-muted-foreground'}`}>🎤 Note vocale</p><AudioPlayer src={m.audio_url!} isMine={isMine}/></div>
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                          )}
                          <p className={`text-[10px] mt-1 text-right ${isMine?'text-white/50':'text-muted-foreground'}`}>
                            {new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                          </p>
                          {menuId===m.id&&!isDeleted&&(
                            <div className={`absolute z-50 bg-white dark:bg-slate-800 border border-border rounded-xl shadow-xl p-1 ${isMine?'right-0':'left-0'} bottom-full mb-1 min-w-[130px]`} onClick={e=>e.stopPropagation()}>
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
        <div className="flex gap-2 items-end flex-shrink-0 pt-2 border-t border-border">
          <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Écrire un message..." rows={1} style={{resize:'none'}} className={inputCls+' flex-1 max-h-24 overflow-y-auto'} disabled={recording}/>
          {recording ? (
            <button onClick={stopRec} className="flex items-center gap-1 px-3 h-10 bg-red-500 rounded-xl text-white text-xs font-bold animate-pulse flex-shrink-0">
              <Square size={11}/>{String(recTime).padStart(2,'0')}s
            </button>
          ) : (
            <button onClick={startRec} disabled={sending} className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:bg-blue-50 transition-colors flex-shrink-0">
              <Mic size={18}/>
            </button>
          )}
          <button onClick={send} disabled={!text.trim()||sending||recording} className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0">
            {sending?<LoadingSpinner size={15}/>:<Send size={16}/>}
          </button>
        </div>
      </div>
    </>
  );
}