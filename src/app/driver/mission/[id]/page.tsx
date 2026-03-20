'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Package, Phone, CheckCircle, XCircle, Navigation, Camera, Key, MessageSquare, Send, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type Mission = {
  id:string; reference:string; status:string; priority:string;
  pickup_address:string; pickup_city:string;
  delivery_address:string; delivery_city:string;
  goods_type:string|null; goods_description:string|null;
  weight_kg:number|null; final_price:number; distance_km:number|null;
  notes:string|null; delivery_otp:string|null; delivery_otp_verified:boolean;
  logistics_clients:{name:string;phone:string|null}|null;
};

const STATUS_NEXT: Record<string,{label:string;nextStatus:string;color:string}> = {
  assigned:    { label:'Démarrer la collecte', nextStatus:'in_progress', color:'bg-blue-600 hover:bg-blue-500' },
  in_progress: { label:'Confirmer la livraison', nextStatus:'delivered', color:'bg-green-600 hover:bg-green-500' },
};

export default function DriverMissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [mission, setMission]   = useState<Mission|null>(null);
  const [driverId, setDriverId] = useState<string|null>(null);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);
  const [otp, setOtp]           = useState('');
  const [showOtp, setShowOtp]   = useState(false);
  const [failReason, setFailReason] = useState('');
  const [showFail, setShowFail] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgText, setMsgText]   = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.replace('/driver/login'); return; }

      const { data: dr } = await sb.from('drivers').select('id').eq('user_id', session.user.id).maybeSingle();
      if (!dr) { router.replace('/driver/login'); return; }
      setDriverId(dr.id);

      const { data: m } = await sb.from('deliveries')
        .select('id,reference,status,priority,pickup_address,pickup_city,delivery_address,delivery_city,goods_type,goods_description,weight_kg,final_price,distance_km,notes,delivery_otp,delivery_otp_verified,logistics_clients(name,phone)')
        .eq('id', id).eq('driver_id', dr.id).maybeSingle();
      setMission(m as Mission);
      setLoading(false);

      // Load chat messages for this delivery
      const { data: msgs } = await sb.from('driver_messages')
        .select('*').eq('delivery_id', id).order('created_at', { ascending:true });
      setMessages(msgs||[]);
    };
    init();
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const updateStatus = async (nextStatus: string) => {
    if (!mission || !driverId) return;

    // If delivering, check OTP first
    if (nextStatus === 'delivered' && mission.delivery_otp && !mission.delivery_otp_verified) {
      setShowOtp(true); return;
    }

    setUpdating(true);
    const sb = createClient();
    const updates: any = { status: nextStatus };
    if (nextStatus === 'in_progress') updates.picked_up_at = new Date().toISOString();
    if (nextStatus === 'delivered') {
      updates.delivered_at = new Date().toISOString();
      // Update driver stats
      const { data: dr } = await sb.from('drivers').select('total_deliveries,successful_deliveries').eq('id', driverId).maybeSingle();
      if (dr) {
        await sb.from('drivers').update({
          total_deliveries: (dr.total_deliveries||0)+1,
          successful_deliveries: (dr.successful_deliveries||0)+1,
          status: 'available',
        }).eq('id', driverId);
      }
    }
    await sb.from('deliveries').update(updates).eq('id', id);
    setMission(prev => prev ? {...prev, status:nextStatus} : prev);
    setUpdating(false);
    toast.success(nextStatus==='in_progress'?'Collecte démarrée ✓':'Livraison confirmée ✓');
  };

  const verifyOtp = async () => {
    if (!mission || otp.length < 4) return;
    if (otp !== mission.delivery_otp) {
      toast.error('Code OTP incorrect'); return;
    }
    setUpdating(true);
    const sb = createClient();
    await sb.from('deliveries').update({ delivery_otp_verified:true }).eq('id', id);
    setMission(prev => prev ? {...prev, delivery_otp_verified:true} : prev);
    setShowOtp(false); setOtp('');
    setUpdating(false);
    await updateStatus('delivered');
  };

  const reportFail = async () => {
    if (!failReason.trim()) { toast.error('Décrivez la raison'); return; }
    setUpdating(true);
    const sb = createClient();
    await sb.from('deliveries').update({ status:'failed', failure_reason:failReason }).eq('id', id);
    if (driverId) {
      const { data: dr } = await sb.from('drivers').select('total_deliveries').eq('id', driverId).maybeSingle();
      if (dr) await sb.from('drivers').update({ total_deliveries:(dr.total_deliveries||0)+1, status:'available' }).eq('id', driverId);
    }
    setMission(prev => prev ? {...prev, status:'failed'} : prev);
    setUpdating(false); setShowFail(false);
    toast.success('Échec signalé');
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !driverId) return;
    setSendingMsg(true);
    const sb = createClient();
    const { data: msg } = await sb.from('driver_messages').insert({
      delivery_id: id, driver_id: driverId,
      sender: 'driver', content: msgText.trim(),
    }).select().single();
    if (msg) setMessages(prev => [...prev, msg]);
    setMsgText(''); setSendingMsg(false);
  };

  const openMaps = (address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><LoadingSpinner size={36}/></div>;
  if (!mission) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Mission introuvable</div>;

  const nextAction = STATUS_NEXT[mission.status];
  const isDone = ['delivered','failed','cancelled'].includes(mission.status);

  return (
    <div className="min-h-screen bg-slate-900 pb-32">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center gap-3">
        <button onClick={()=>router.back()} className="p-2 rounded-xl bg-slate-700 text-slate-400"><ArrowLeft size={18}/></button>
        <div className="flex-1">
          <p className="font-bold text-white">{mission.reference}</p>
          <p className="text-xs text-slate-400 capitalize">{mission.status.replace('_',' ')}</p>
        </div>
        <button onClick={()=>setShowChat(!showChat)} className="p-2 rounded-xl bg-slate-700 text-slate-400 relative">
          <MessageSquare size={18}/>
          {messages.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full text-[9px] text-white flex items-center justify-center">{messages.length}</span>}
        </button>
      </div>

      {/* Chat overlay */}
      {showChat && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
          <div className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center gap-3">
            <button onClick={()=>setShowChat(false)} className="p-2 rounded-xl bg-slate-700 text-slate-400"><ArrowLeft size={18}/></button>
            <p className="font-bold text-white">Chat avec l'admin</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length===0 && <p className="text-center text-slate-500 py-8 text-sm">Aucun message</p>}
            {messages.map((m:any) => (
              <div key={m.id} className={`flex ${m.sender==='driver'?'justify-end':'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender==='driver'?'bg-blue-600 text-white':'bg-slate-700 text-slate-200'}`}>
                  <p className="text-sm">{m.content}</p>
                  <p className="text-[10px] opacity-60 mt-1 text-right">{new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          <div className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
            <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()} placeholder="Votre message..." className="flex-1 bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            <button onClick={sendMessage} disabled={!msgText.trim()||sendingMsg} className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center disabled:opacity-50">
              {sendingMsg?<LoadingSpinner size={16}/>:<Send size={16}/>}
            </button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Route card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">Itinéraire</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><div className="w-2.5 h-2.5 bg-green-500 rounded-full"/></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-medium">COLLECTE</p>
                <p className="text-sm text-white font-medium">{mission.pickup_address}</p>
                {mission.pickup_city && <p className="text-xs text-slate-400">{mission.pickup_city}</p>}
              </div>
              <button onClick={()=>openMaps(mission.pickup_address+' '+mission.pickup_city)} className="p-2 bg-blue-900/30 rounded-xl text-blue-400 flex-shrink-0"><Navigation size={16}/></button>
            </div>
            {mission.distance_km && <div className="ml-4 flex items-center gap-2"><div className="w-0.5 h-5 bg-slate-700"/><span className="text-xs text-slate-500">{mission.distance_km} km</span></div>}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><div className="w-2.5 h-2.5 bg-red-500 rounded-full"/></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-medium">LIVRAISON</p>
                <p className="text-sm text-white font-medium">{mission.delivery_address}</p>
                {mission.delivery_city && <p className="text-xs text-slate-400">{mission.delivery_city}</p>}
              </div>
              <button onClick={()=>openMaps(mission.delivery_address+' '+mission.delivery_city)} className="p-2 bg-blue-900/30 rounded-xl text-blue-400 flex-shrink-0"><Navigation size={16}/></button>
            </div>
          </div>
        </div>

        {/* Client card */}
        {mission.logistics_clients && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">Client</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{mission.logistics_clients.name}</p>
                {mission.logistics_clients.phone && <p className="text-sm text-slate-400">{mission.logistics_clients.phone}</p>}
              </div>
              {mission.logistics_clients.phone && (
                <a href={`tel:${mission.logistics_clients.phone}`} className="w-10 h-10 bg-green-900/30 rounded-xl flex items-center justify-center text-green-400">
                  <Phone size={18}/>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Goods + notes */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">Marchandise</h3>
          <div className="space-y-2">
            {mission.goods_type && <div className="flex justify-between text-sm"><span className="text-slate-400">Type</span><span className="text-white">{mission.goods_type}</span></div>}
            {mission.goods_description && <div className="flex justify-between text-sm"><span className="text-slate-400">Description</span><span className="text-white text-right max-w-[60%]">{mission.goods_description}</span></div>}
            {mission.weight_kg && <div className="flex justify-between text-sm"><span className="text-slate-400">Poids</span><span className="text-white">{mission.weight_kg} kg</span></div>}
            <div className="flex justify-between text-sm"><span className="text-slate-400">Montant</span><span className="font-bold text-blue-400">{formatCurrency(mission.final_price||0)}</span></div>
          </div>
          {mission.notes && (
            <div className="mt-3 p-3 bg-amber-900/20 border border-amber-800/50 rounded-xl">
              <p className="text-xs font-semibold text-amber-400 mb-1">⚠️ Instructions</p>
              <p className="text-sm text-amber-300">{mission.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      {!isDone && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4 space-y-3">
          {nextAction && (
            <button onClick={()=>updateStatus(nextAction.nextStatus)} disabled={updating}
              className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-colors flex items-center justify-center gap-2 ${nextAction.color} disabled:opacity-60`}>
              {updating ? <LoadingSpinner size={20}/> : <CheckCircle size={20}/>}
              {updating ? 'Mise à jour...' : nextAction.label}
            </button>
          )}
          {mission.status !== 'failed' && (
            <button onClick={()=>setShowFail(true)} className="w-full py-3 rounded-2xl font-medium text-red-400 border border-red-800/50 bg-red-900/20 transition-colors flex items-center justify-center gap-2">
              <XCircle size={18}/>Signaler un échec
            </button>
          )}
        </div>
      )}

      {isDone && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4">
          <div className={`w-full py-4 rounded-2xl font-bold text-center text-base ${mission.status==='delivered'?'bg-green-900/30 text-green-400 border border-green-800':'bg-red-900/30 text-red-400 border border-red-800'}`}>
            {mission.status==='delivered'?'✅ Livraison confirmée':'❌ Échec signalé'}
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {showOtp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="bg-slate-800 rounded-t-2xl w-full p-6">
            <h3 className="font-bold text-white text-center mb-2">Code de confirmation</h3>
            <p className="text-slate-400 text-sm text-center mb-4">Demandez le code OTP au client</p>
            <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Code OTP" maxLength={6}
              className="w-full bg-slate-700 border border-slate-600 text-white text-center text-2xl font-bold tracking-widest rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            <div className="flex gap-3 mt-4">
              <button onClick={()=>{setShowOtp(false);setOtp('');}} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-400">Annuler</button>
              <button onClick={verifyOtp} disabled={otp.length<4||updating} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50">
                {updating?<LoadingSpinner size={18}/>:'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fail Modal */}
      {showFail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="bg-slate-800 rounded-t-2xl w-full p-6">
            <h3 className="font-bold text-white mb-2">Signaler un échec</h3>
            <p className="text-slate-400 text-sm mb-4">Expliquez la raison de l'échec</p>
            <textarea value={failReason} onChange={e=>setFailReason(e.target.value)} placeholder="Ex: Client absent, adresse incorrecte..." rows={4}
              className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"/>
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setShowFail(false)} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-400">Annuler</button>
              <button onClick={reportFail} disabled={!failReason.trim()||updating} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50">
                {updating?<LoadingSpinner size={18}/>:'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}