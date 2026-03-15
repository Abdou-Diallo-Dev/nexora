'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, MessageSquare, Search, Bell, Wrench, CreditCard, CheckCircle, Clock, AlertTriangle, X, ArrowLeft, Mic, Square, Play, Pause } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, inputCls, Badge, BadgeVariant } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type Tenant = { id: string; first_name: string; last_name: string; email: string };
type Message = { id: string; content: string; sender_role: string; sender_name: string; created_at: string; is_read: boolean; audio_url?: string; message_type?: string; edited_at?: string; is_deleted?: boolean; };
type Ticket = { id: string; title: string; category: string; priority: string; status: string; description: string | null; created_at: string };
type Payment = { id: string; amount: number; period_month: number; period_year: number; status: string; due_date: string | null };

const TICKET_STATUS: Record<string, { l: string; v: BadgeVariant }> = {
  open:        { l: 'Ouvert',   v: 'error'   },
  in_progress: { l: 'En cours', v: 'warning' },
  resolved:    { l: 'Résolu',   v: 'success' },
  closed:      { l: 'Fermé',    v: 'default' },
};
const TICKET_PRIORITY: Record<string, string> = {
  low: '🟢', normal: '🟡', high: '🟠', urgent: '🔴',
};
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export default function MessagesPage() {
  const { company, user } = useAuthStore();
  const [tenants, setTenants]       = useState<Tenant[]>([]);
  const [selected, setSelected]     = useState<Tenant | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [text, setText]             = useState('');
  const [loading, setLoading]       = useState(true);
  const [sending, setSending]       = useState(false);
  const [search, setSearch]         = useState('');
  const [unread, setUnread]         = useState<Record<string, number>>({});
  const [rightTab, setRightTab]     = useState<'messages' | 'tickets' | 'payments'>('messages');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifText, setNotifText]   = useState('');
  const [showChat, setShowChat]     = useState(false); // mobile: show chat panel
  const [recording, setRecording]   = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const recordTimerRef   = useRef<any>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editText, setEditText]     = useState('');
  const [msgMenuOpen, setMsgMenuOpen] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('tenant_accounts')
      .select('tenant_id,tenants(id,first_name,last_name,email)')
      .eq('company_id', company.id)
      .then(async ({ data }) => {
        const list = (data || []).map((d: any) => d.tenants).filter(Boolean) as Tenant[];
        setTenants(list);
        const { data: unreadData } = await sb.from('messages')
          .select('tenant_id').eq('company_id', company.id)
          .eq('sender_role', 'tenant').eq('is_read', false);
        const counts: Record<string, number> = {};
        (unreadData || []).forEach((m: any) => { counts[m.tenant_id] = (counts[m.tenant_id] || 0) + 1; });
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
        sb.from('messages').update({ is_read: true })
          .eq('tenant_id', selected.id).eq('sender_role', 'tenant');
        setUnread(prev => ({ ...prev, [selected.id]: 0 }));
      });

    sb.from('tenant_tickets')
      .select('id,title,category,priority,status,description,created_at')
      .eq('tenant_id', selected.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setTickets((data || []) as Ticket[]));

    sb.from('rent_payments')
      .select('id,amount,period_month,period_year,status,due_date')
      .eq('tenant_id', selected.id)
      .eq('company_id', company.id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(12)
      .then(({ data }) => setPayments((data || []) as Payment[]));

    const channel = sb.channel(`admin-messages-${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `tenant_id=eq.${selected.id}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === (payload.new as Message).id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [selected, company?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !selected || !company?.id || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');

    // Ajouter le message localement immédiatement (optimistic update)
    const tempMsg: Message = {
      id: `temp_${Date.now()}`,
      content,
      sender_role: 'company',
      sender_name: user?.full_name || 'Gestionnaire',
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages(prev => [...prev, tempMsg]);

    const sb = createClient();
    const { data } = await sb.from('messages').insert({
      tenant_id:   selected.id,
      company_id:  company.id,
      sender_role: 'company',
      sender_name: user?.full_name || 'Gestionnaire',
      content,
      is_read:     false,
    }).select().single();

    // Remplacer le message temporaire par le vrai
    if (data) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? data as Message : m));
    }

    setSending(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start();
      setRecording(true);
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch {
      toast.error('Microphone non accessible');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !selected || !company?.id) return;
    const mr = mediaRecorderRef.current;
    mr.onstop = async () => {
      clearInterval(recordTimerRef.current);
      setRecording(false);
      setRecordTime(0);
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const fileName = `voice_${Date.now()}.webm`;
      const sb = createClient();
      const { data: upload, error } = await sb.storage
        .from('voice-messages')
        .upload(fileName, blob, { contentType: 'audio/webm' });
      if (error) { toast.error('Erreur upload audio'); return; }
      const { data: urlData } = sb.storage.from('voice-messages').getPublicUrl(fileName);
      const audioUrl = urlData.publicUrl;

      const tempMsg: Message = {
        id: `temp_${Date.now()}`,
        content: '🎤 Message vocal',
        sender_role: 'company',
        sender_name: user?.full_name || 'Gestionnaire',
        created_at: new Date().toISOString(),
        is_read: false,
        audio_url: audioUrl,
        message_type: 'audio',
      };
      setMessages(prev => [...prev, tempMsg]);

      const { data: msgData } = await sb.from('messages').insert({
        tenant_id: selected.id,
        company_id: company.id,
        sender_role: 'company',
        sender_name: user?.full_name || 'Gestionnaire',
        content: '🎤 Message vocal',
        audio_url: audioUrl,
        message_type: 'audio',
        is_read: false,
      }).select().single();

      if (msgData) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? msgData as Message : m));
      }
      mr.stream.getTracks().forEach(t => t.stop());
    };
    mr.stop();
  };

  const deleteMessage = async (msgId: string) => {
    const sb = createClient();
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
      content: editText.trim(),
      edited_at: new Date().toISOString(),
    }).eq('id', msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editText.trim(), edited_at: new Date().toISOString() } : m));
    setEditingMsg(null);
    setEditText('');
    toast.success('Message modifié');
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    const sb = createClient();
    const { error } = await sb.from('tenant_tickets').update({ status }).eq('id', ticketId).select('id,status');
    if (error) { toast.error('Erreur: ' + error.message); return; }
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
    toast.success('Statut mis à jour');
  };

  const sendPaymentReminder = async () => {
    if (!selected || !notifText.trim()) return;
    setSendingNotif(true);
    const sb = createClient();
    const { data: ta } = await sb.from('tenant_accounts').select('user_id').eq('tenant_id', selected.id).maybeSingle();
    if (ta?.user_id) {
      await sb.from('notifications').insert({
        user_id: ta.user_id, tenant_id: selected.id, company_id: company?.id,
        type: 'info', title: 'Rappel de loyer', message: notifText.trim(), link: '/tenant-portal/payments',
      });
    }
    await sb.from('messages').insert({
      tenant_id: selected.id, company_id: company?.id,
      sender_role: 'company', sender_name: user?.full_name || 'Gestionnaire',
      content: `🔔 ${notifText.trim()}`, is_read: false,
    });
    toast.success('Notification envoyée au locataire');
    setShowNotifModal(false);
    setNotifText('');
    setSendingNotif(false);
    setRightTab('messages');
  };

  const filtered = tenants.filter(t =>
    `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const latePayments = payments.filter(p => p.status === 'late' || p.status === 'overdue' || p.status === 'pending');

  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(m => {
    const d = new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) last.msgs.push(m);
    else grouped.push({ date: d, msgs: [m] });
  });

  const handleSelectTenant = (t: Tenant) => {
    setSelected(t);
    setRightTab('messages');
    setShowChat(true); // mobile: switch to chat view
  };

  const handleBack = () => {
    setShowChat(false);
    setSelected(null);
  };

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden md:flex h-[calc(100vh-80px)] gap-0 rounded-2xl overflow-hidden border border-border bg-white dark:bg-slate-900 shadow-sm">
        {/* LEFT: Tenants list */}
        <div className="w-72 flex-shrink-0 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-foreground mb-3">Messagerie</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher locataire..."
                className={inputCls + ' pl-8 text-xs'} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="flex justify-center py-8"><LoadingSpinner size={24} /></div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageSquare size={28} className="mx-auto mb-2 opacity-20" />
                Aucun locataire avec compte
              </div>
            ) : filtered.map(t => (
              <button key={t.id} onClick={() => handleSelectTenant(t)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${selected?.id === t.id ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-primary' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {t.first_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{t.first_name} {t.last_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.email}</p>
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

        {/* RIGHT: Content */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium text-foreground mb-1">Sélectionnez un locataire</p>
              <p className="text-sm">pour voir la conversation</p>
            </div>
          </div>
        ) : (
          <ChatPanel
            selected={selected} messages={messages} tickets={tickets} payments={payments}
            grouped={grouped} latePayments={latePayments} rightTab={rightTab} setRightTab={setRightTab}
            text={text} setText={setText} send={send} sending={sending} bottomRef={bottomRef}
            showNotifModal={showNotifModal} setShowNotifModal={setShowNotifModal}
            notifText={notifText} setNotifText={setNotifText}
            sendPaymentReminder={sendPaymentReminder} sendingNotif={sendingNotif}
            updateTicketStatus={updateTicketStatus} showBack={false} onBack={handleBack}
            deleteMessage={deleteMessage} startEdit={startEdit} saveEdit={saveEdit}
            editingMsg={editingMsg} editText={editText} setEditText={setEditText}
            msgMenuOpen={msgMenuOpen} setMsgMenuOpen={setMsgMenuOpen}
            recording={recording} recordTime={recordTime}
            startRecording={startRecording} stopRecording={stopRecording}
          />
        )}
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex flex-col h-[calc(100vh-80px)] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-border">
        {!showChat ? (
          /* Mobile: Tenants list */
          <>
            <div className="p-4 border-b border-border">
              <h2 className="font-bold text-foreground mb-3">Messagerie</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher locataire..."
                  className={inputCls + ' pl-8 text-xs'} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="flex justify-center py-8"><LoadingSpinner size={24} /></div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <MessageSquare size={28} className="mx-auto mb-2 opacity-20" />
                  Aucun locataire avec compte
                </div>
              ) : filtered.map(t => (
                <button key={t.id} onClick={() => handleSelectTenant(t)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {t.first_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{t.first_name} {t.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                  </div>
                  {(unread[t.id] || 0) > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                      {unread[t.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Mobile: Chat panel */
          selected && (
            <ChatPanel
              selected={selected} messages={messages} tickets={tickets} payments={payments}
              grouped={grouped} latePayments={latePayments} rightTab={rightTab} setRightTab={setRightTab}
              text={text} setText={setText} send={send} sending={sending} bottomRef={bottomRef}
              showNotifModal={showNotifModal} setShowNotifModal={setShowNotifModal}
              notifText={notifText} setNotifText={setNotifText}
              sendPaymentReminder={sendPaymentReminder} sendingNotif={sendingNotif}
              updateTicketStatus={updateTicketStatus} showBack={true} onBack={handleBack}
              deleteMessage={deleteMessage} startEdit={startEdit} saveEdit={saveEdit}
              editingMsg={editingMsg} editText={editText} setEditText={setEditText}
              msgMenuOpen={msgMenuOpen} setMsgMenuOpen={setMsgMenuOpen}
            />
          )
        )}
      </div>

      {/* Modal Notification */}
      {showNotifModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Envoyer une notification</h3>
                <p className="text-xs text-muted-foreground mt-0.5">à {selected.first_name} {selected.last_name}</p>
              </div>
              <button onClick={() => setShowNotifModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Modèles rapides</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  `Rappel : votre loyer du mois est en attente. Merci de régulariser votre situation.`,
                  `Votre loyer est en retard. Veuillez effectuer votre paiement dans les plus brefs délais.`,
                  `Votre contrat de bail arrive à expiration. Veuillez nous contacter pour le renouvellement.`,
                ].map((tpl, i) => (
                  <button key={i} onClick={() => setNotifText(tpl)}
                    className="text-left px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-muted-foreground hover:bg-blue-50 hover:text-primary transition-colors border border-border">
                    {tpl}
                  </button>
                ))}
              </div>
              <textarea value={notifText} onChange={e => setNotifText(e.target.value)}
                placeholder="Ou écrivez votre message personnalisé..."
                rows={3} className={inputCls + ' resize-none text-sm w-full'} />
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
              <button onClick={() => setShowNotifModal(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Annuler
              </button>
              <button onClick={sendPaymentReminder} disabled={!notifText.trim() || sendingNotif}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                {sendingNotif ? <LoadingSpinner size={14} /> : <Bell size={14} />}
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChatPanel({
  selected, messages, tickets, payments, grouped, latePayments,
  rightTab, setRightTab, text, setText, send, sending, bottomRef,
  showNotifModal, setShowNotifModal, notifText, setNotifText,
  sendPaymentReminder, sendingNotif, updateTicketStatus, showBack, onBack,
  deleteMessage, startEdit, saveEdit, editingMsg, editText, setEditText,
  msgMenuOpen, setMsgMenuOpen, recording, recordTime, startRecording, stopRecording,
}: any) {
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          {showBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 mr-1">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {selected.first_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{selected.first_name} {selected.last_name}</p>
            <p className="text-xs text-muted-foreground hidden sm:block">{selected.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {latePayments.length > 0 && (
            <button onClick={() => setShowNotifModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors">
              <Bell size={12} /> <span className="hidden sm:inline">Rappel</span> ({latePayments.length})
            </button>
          )}
          <button onClick={() => setShowNotifModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
            <Bell size={12} /> <span className="hidden sm:inline">Notifier</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
        {[
          { key: 'messages', label: 'Messages', icon: <MessageSquare size={13} /> },
          { key: 'tickets',  label: `Tickets (${tickets.length})`, icon: <Wrench size={13} /> },
          { key: 'payments', label: `Paiements (${payments.length})`, icon: <CreditCard size={13} /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setRightTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors flex-1 justify-center ${
              rightTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.key === 'messages' ? 'Msgs' : tab.key === 'tickets' ? `Tkt(${tickets.length})` : `Pay(${payments.length})`}</span>
          </button>
        ))}
      </div>

      {/* Messages Tab */}
      {rightTab === 'messages' && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Aucun message — lancez la conversation</p>
              </div>
            ) : grouped.map((group: any) => (
              <div key={group.date}>
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground">{group.date}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {group.msgs.map((m: any, i: number) => {
                  const isMine = m.sender_role === 'company';
                  const prevSame = i > 0 && group.msgs[i-1].sender_role === m.sender_role;
                  if (m.is_deleted) return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${prevSame ? 'mt-0.5' : 'mt-3'}`}>
                      <div className="max-w-[75%] rounded-2xl px-3 py-2 bg-slate-100 dark:bg-slate-800 opacity-50">
                        <p className="text-xs italic text-muted-foreground">Message supprimé</p>
                      </div>
                    </div>
                  );
                  return (
                    <div key={m.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${prevSame ? 'mt-0.5' : 'mt-3'} group/msg relative`}>
                      {!isMine && !prevSame && (
                        <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold mr-2 self-end mb-1 flex-shrink-0">
                          {selected.first_name.charAt(0)}
                        </div>
                      )}
                      {!isMine && prevSame && <div className="w-7 mr-2 flex-shrink-0" />}

                      <div className="relative flex flex-col" style={{alignItems: isMine ? 'flex-end' : 'flex-start'}}>
                        {/* Menu button - only for own messages */}
                        {isMine && (
                          <div className="absolute -left-8 top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity z-10">
                            <button
                              onClick={() => setMsgMenuOpen(msgMenuOpen === m.id ? null : m.id)}
                              className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-300 text-xs"
                            >⋮</button>
                            {msgMenuOpen === m.id && (
                              <div className="absolute bottom-8 left-0 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-border py-1 z-20 min-w-[120px]">
                                <button
                                  onClick={() => startEdit(m)}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-foreground flex items-center gap-2"
                                >✏️ Modifier</button>
                                <button
                                  onClick={() => deleteMessage(m.id)}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
                                >🗑️ Supprimer</button>
                              </div>
                            )}
                          </div>
                        )}

                        {editingMsg === m.id ? (
                          <div className="flex gap-2 items-center" style={{maxWidth: '75vw'}}>
                            <input
                              value={editText}
                              onChange={(e: any) => setEditText(e.target.value)}
                              onKeyDown={(e: any) => e.key === 'Enter' && saveEdit(m.id)}
                              className="flex-1 text-sm px-3 py-2 rounded-xl border border-primary outline-none bg-white dark:bg-slate-800"
                              autoFocus
                            />
                            <button onClick={() => saveEdit(m.id)} className="text-xs bg-primary text-white px-2 py-1 rounded-lg flex-shrink-0">✓</button>
                            <button onClick={() => saveEdit('cancel')} className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-lg flex-shrink-0">✕</button>
                          </div>
                        ) : (
                          <div style={{maxWidth: '75vw'}} className={`rounded-2xl px-3 py-2 ${isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-800 rounded-bl-sm'}`}>
                            {m.message_type === 'audio' && m.audio_url ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Mic size={14} className={isMine ? 'text-white/80' : 'text-primary'} />
                                  <span className={`text-xs font-medium ${isMine ? 'text-white/80' : 'text-muted-foreground'}`}>Message vocal</span>
                                </div>
                                <audio controls src={m.audio_url} className="w-full max-w-[220px] h-8" style={{filter: isMine ? 'invert(1) brightness(2)' : 'none'}} />
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                            )}
                            <p className={`text-[10px] mt-0.5 text-right ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
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
          <div className="flex gap-2 p-3 border-t border-border flex-shrink-0 items-center">
            {recording ? (
              <div className="flex-1 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2 border border-red-200 dark:border-red-800">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-red-600 font-medium flex-1">
                  Enregistrement... {Math.floor(recordTime/60).toString().padStart(2,'0')}:{(recordTime%60).toString().padStart(2,'0')}
                </span>
                <button onClick={stopRecording}
                  className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <Square size={14} />
                </button>
              </div>
            ) : (
              <>
                <input value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={(e: any) => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder={`Message à ${selected.first_name}...`}
                  className={inputCls + ' flex-1 text-sm'} />
                {text.trim() ? (
                  <button onClick={send} disabled={sending}
                    className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-50 flex-shrink-0">
                    {sending ? <LoadingSpinner size={14} /> : <Send size={14} />}
                  </button>
                ) : (
                  <button onMouseDown={startRecording} onTouchStart={startRecording}
                    className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white flex-shrink-0">
                    <Mic size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Tickets Tab */}
      {rightTab === 'tickets' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Aucun ticket signalé</p>
            </div>
          ) : tickets.map((t: any) => {
            const sm = TICKET_STATUS[t.status] || { l: t.status, v: 'default' as BadgeVariant };
            return (
              <div key={t.id} className="bg-white dark:bg-slate-800 rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {TICKET_PRIORITY[t.priority] || '⚪'} {t.title}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{t.category} · {formatDate(t.created_at)}</p>
                  </div>
                  <Badge variant={sm.v}>{sm.l}</Badge>
                </div>
                {t.description && <p className="text-sm text-muted-foreground mb-3">{t.description}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                  {t.status === 'open' && (
                    <button onClick={() => updateTicketStatus(t.id, 'in_progress')}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors">
                      <Clock size={11} /> Prendre en charge
                    </button>
                  )}
                  {t.status === 'in_progress' && (
                    <button onClick={() => updateTicketStatus(t.id, 'resolved')}
                      className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors">
                      <CheckCircle size={11} /> Marquer résolu
                    </button>
                  )}
                  {(t.status === 'open' || t.status === 'in_progress') && (
                    <button onClick={() => updateTicketStatus(t.id, 'closed')}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
                      <X size={11} /> Fermer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payments Tab */}
      {rightTab === 'payments' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Aucun paiement</p>
            </div>
          ) : payments.map((p: any) => {
            const isLate = p.status === 'late' || p.status === 'overdue';
            const isPaid = p.status === 'paid';
            return (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${isLate ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-border'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPaid ? 'bg-green-100 text-green-600' : isLate ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    {isPaid ? <CheckCircle size={14} /> : isLate ? <AlertTriangle size={14} /> : <Clock size={14} />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{MONTHS[p.period_month-1]} {p.period_year}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(p.amount)}</p>
                  </div>
                </div>
                <Badge variant={isPaid ? 'success' : isLate ? 'error' : 'warning'}>
                  {isPaid ? 'Payé' : isLate ? 'Impayé' : 'En attente'}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}