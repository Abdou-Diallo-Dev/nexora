'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Phone, Mail, Home, CreditCard, FileText, Wrench, Download, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, cardCls, btnPrimary } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export default function TenantProfilePage() {
  const { company } = useAuthStore();
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!company?.id || !id) return;
    const sb = createClient();
    Promise.all([
      sb.from('tenants').select('*').eq('id', id).maybeSingle(),
      sb.from('leases').select('*,properties(name,address,city,type,rent_amount)').eq('tenant_id', id).eq('company_id', company.id).order('created_at', { ascending:false }),
      sb.from('rent_payments').select('id,amount,status,period_month,period_year,paid_date,payment_method').eq('tenant_id', id).eq('company_id', company.id).order('period_year',{ascending:false}).order('period_month',{ascending:false}).limit(24),
      sb.from('tenant_tickets').select('id,title,category,priority,status,created_at').eq('tenant_id', id).order('created_at',{ascending:false}),
    ]).then(([{data:t},{data:l},{data:p},{data:tk}]) => {
      setData({ tenant:t, leases:l||[], payments:p||[], tickets:tk||[] });
      setLoading(false);
    });
  }, [company?.id, id]);

  const exportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p','mm','a4');
      const W = doc.internal.pageSize.getWidth();
      const { tenant, leases, payments, tickets } = data;

      // Header
      doc.setFillColor(30,64,175);
      doc.rect(0,0,W,32,'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(14); doc.setFont('helvetica','bold');
      doc.text('Fiche de Renseignement', W-8, 12, { align:'right' });
      doc.setFontSize(9); doc.setFont('helvetica','normal');
      doc.text(`${tenant?.first_name||''} ${tenant?.last_name||''}`, W-8, 19, { align:'right' });
      doc.setFontSize(8);
      doc.text(company?.name||'Nexora', W-8, 25, { align:'right' });
      doc.text(formatDate(new Date().toISOString()), 10, 25);

      let y = 40;
      const section = (title: string) => {
        doc.setFillColor(30,64,175); doc.rect(10, y, 3, 6, 'F');
        doc.setTextColor(30,64,175); doc.setFontSize(10); doc.setFont('helvetica','bold');
        doc.text(title, 16, y+5); y += 12;
      };
      const row = (label: string, value: string, x=12) => {
        doc.setTextColor(100,100,100); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
        doc.text(label+':', x, y);
        doc.setTextColor(40,40,40); doc.setFont('helvetica','bold');
        doc.text(value||'—', x+40, y); y += 7;
      };

      // Identité
      section('Identite du locataire');
      row('Prenom', tenant?.first_name||'');
      row('Nom', tenant?.last_name||'');
      row('Email', tenant?.email||'');
      row('Telephone', tenant?.phone||'');
      row('Statut', tenant?.status==='active'?'Actif':'Inactif');
      y += 4;

      // Bail actif
      const activeLease = leases.find((l:any)=>l.status==='active');
      if (activeLease) {
        section('Bail en cours');
        row('Bien', activeLease.properties?.name||'');
        row('Adresse', activeLease.properties?.address||'');
        row('Debut', formatDate(activeLease.start_date));
        row('Fin', formatDate(activeLease.end_date));
        row('Loyer', formatCurrency(Number(activeLease.rent_amount)));
        row('Caution', activeLease.deposit_amount?formatCurrency(Number(activeLease.deposit_amount)):'—');
        y += 4;
      }

      // Paiements
      const paid = payments.filter((p:any)=>p.status==='paid');
      const late = payments.filter((p:any)=>p.status==='late'||p.status==='overdue');
      const totalPaid = paid.reduce((s:number,p:any)=>s+Number(p.amount),0);
      const tauxPaie = payments.length>0?Math.round((paid.length/payments.length)*100):0;

      section('Historique paiements');
      row('Total paye', formatCurrency(totalPaid));
      row('Nb paiements', String(paid.length));
      row('En retard', String(late.length));
      row('Taux paiement', `${tauxPaie}%`);
      y += 4;

      // Table paiements
      doc.setFillColor(248,250,252); doc.roundedRect(10, y, W-20, 7, 2, 2, 'F');
      doc.setTextColor(100,100,100); doc.setFontSize(7); doc.setFont('helvetica','bold');
      doc.text('Periode', 14, y+5); doc.text('Montant', 65, y+5); doc.text('Mode', 110, y+5); doc.text('Statut', 155, y+5);
      y += 7;
      payments.slice(0,8).forEach((p:any, i:number) => {
        if(i%2===0){doc.setFillColor(253,253,253);doc.rect(10,y,W-20,6.5,'F');}
        doc.setTextColor(60,60,60); doc.setFontSize(7); doc.setFont('helvetica','normal');
        doc.text(`${MONTHS[p.period_month-1]} ${p.period_year}`, 14, y+4.5);
        doc.text(formatCurrency(Number(p.amount)), 65, y+4.5);
        doc.text(p.payment_method||'—', 110, y+4.5);
        const color = p.status==='paid'?[22,163,74]:p.status==='late'?[220,38,38]:[161,98,7];
        doc.setTextColor(color[0],color[1],color[2]); doc.setFont('helvetica','bold');
        doc.text(p.status==='paid'?'Paye':p.status==='late'?'Retard':'Attente', 155, y+4.5);
        y += 6.5;
      });
      y += 6;

      // Tickets
      if (tickets.length > 0) {
        section('Signalements');
        row('Total', String(tickets.length));
        row('Ouverts', String(tickets.filter((t:any)=>t.status==='open'||t.status==='in_progress').length));
        row('Resolus', String(tickets.filter((t:any)=>t.status==='resolved'||t.status==='closed').length));
      }

      // Footer
      doc.setDrawColor(200,200,200); doc.line(10,287,W-10,287);
      doc.setTextColor(150,150,150); doc.setFontSize(7); doc.setFont('helvetica','normal');
      doc.text('Fiche generee par Nexora — Confidentiel', 10, 292);
      doc.text(formatDate(new Date().toISOString()), W-10, 292, { align:'right' });

      doc.save(`fiche-${tenant?.last_name||'locataire'}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Fiche exportée ✓');
    } catch(e) { console.error(e); toast.error('Erreur export'); }
    setExporting(false);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;
  if (!data) return <div className="text-center py-16 text-muted-foreground">Locataire introuvable</div>;

  const { tenant, leases, payments, tickets } = data;
  const paid = payments.filter((p:any)=>p.status==='paid');
  const late = payments.filter((p:any)=>p.status==='late'||p.status==='overdue');
  const totalPaid = paid.reduce((s:number,p:any)=>s+Number(p.amount),0);
  const activeLease = leases.find((l:any)=>l.status==='active');
  const today = new Date();

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/real-estate/tenants" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{tenant?.first_name} {tenant?.last_name}</h1>
          <p className="text-sm text-muted-foreground">Fiche de renseignement complète</p>
        </div>
        <button onClick={exportPDF} disabled={exporting} className={btnPrimary}>
          {exporting?<LoadingSpinner size={14}/>:<Download size={14}/>}{exporting?'Export...':'Exporter PDF'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total payé', value:formatCurrency(totalPaid), color:'text-green-700 bg-green-50 border-green-100' },
          { label:'En retard', value:String(late.length), color:late.length>0?'text-red-700 bg-red-50 border-red-100':'text-green-700 bg-green-50 border-green-100' },
          { label:'Taux paiement', value:payments.length>0?Math.round((paid.length/payments.length)*100)+'%':'—', color:'text-blue-700 bg-blue-50 border-blue-100' },
          { label:'Signalements', value:String(tickets.length), color:'text-orange-700 bg-orange-50 border-orange-100' },
        ].map((k,i)=>(
          <div key={i} className={`border rounded-2xl p-4 ${k.color}`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-80">{k.label}</p>
            <p className="text-xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Identité */}
        <div className={cardCls+' p-5'}>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><User size={14} className="text-primary"/>Identité</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Nom complet</span><span className="font-medium text-sm">{tenant?.first_name} {tenant?.last_name}</span></div>
            {tenant?.email && <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Email</span><span className="text-sm flex items-center gap-1"><Mail size={12}/>{tenant.email}</span></div>}
            {tenant?.phone && <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Téléphone</span><span className="text-sm flex items-center gap-1"><Phone size={12}/>{tenant.phone}</span></div>}
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Statut</span><Badge variant={tenant?.status==='active'?'success':'default'}>{tenant?.status==='active'?'Actif':'Inactif'}</Badge></div>
          </div>
        </div>

        {/* Bail actif */}
        <div className={cardCls+' p-5'}>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Home size={14} className="text-primary"/>Bail en cours</h3>
          {activeLease ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Bien</span><span className="font-medium">{activeLease.properties?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Loyer</span><span className="font-bold text-primary">{formatCurrency(Number(activeLease.rent_amount))}/mois</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Début</span><span className="font-medium">{formatDate(activeLease.start_date)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fin</span><span className="font-medium">{formatDate(activeLease.end_date)}</span></div>
              {activeLease.deposit_amount && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Caution</span><span className="font-medium">{formatCurrency(Number(activeLease.deposit_amount))}</span></div>}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Aucun bail actif</p>}
        </div>
      </div>

      {/* Suivi mensuel */}
      <div className={cardCls+' p-5'}>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><CreditCard size={14} className="text-primary"/>Suivi mensuel {today.getFullYear()}</h3>
        <div className="grid grid-cols-6 gap-2 mb-3">
          {Array.from({length:12},(_,i)=>i+1).map(m => {
            const p = payments.find((p:any)=>p.period_month===m&&p.period_year===today.getFullYear());
            const isFuture = m > today.getMonth()+1;
            const isPaid = p?.status==='paid';
            const isLate = p?.status==='late'||p?.status==='overdue'||(p?.status==='pending'&&m<today.getMonth()+1&&today.getDate()>=6);
            const isPending = !isPaid && !isLate && !isFuture;
            return (
              <div key={m} className={`flex flex-col items-center p-2 rounded-xl border ${isPaid?'bg-green-100 border-green-300':isLate?'bg-red-100 border-red-300':isPending?'bg-amber-50 border-amber-200':'bg-slate-50 border-slate-200'}`}>
                <span className={`text-xs font-semibold ${isPaid?'text-green-700':isLate?'text-red-700':isPending?'text-amber-700':'text-slate-400'}`}>{MONTHS[m-1]}</span>
                <span className="mt-1">{isPaid?<CheckCircle size={14} className="text-green-600"/>:isLate?<AlertTriangle size={14} className="text-red-600"/>:isPending?<Clock size={14} className="text-amber-600"/>:<span className="text-slate-400 text-xs">—</span>}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historique paiements */}
      <div className={cardCls}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><CreditCard size={14} className="text-primary"/>Historique paiements</h3>
          <Link href="/real-estate/payments/new" className="text-xs text-primary hover:underline">+ Enregistrer</Link>
        </div>
        <div className="divide-y divide-border">
          {payments.length===0 ? <p className="text-center py-8 text-sm text-muted-foreground">Aucun paiement</p>
            : payments.map((p:any) => {
              const isPaid=p.status==='paid'; const isLate=p.status==='late'||p.status==='overdue';
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPaid?'bg-green-100 text-green-600':isLate?'bg-red-100 text-red-600':'bg-amber-100 text-amber-600'}`}>
                      {isPaid?<CheckCircle size={14}/>:isLate?<AlertTriangle size={14}/>:<Clock size={14}/>}
                    </div>
                    <div><p className="font-medium text-sm">{MONTHS[p.period_month-1]} {p.period_year}</p>{p.paid_date&&<p className="text-xs text-muted-foreground">{formatDate(p.paid_date)} · {p.payment_method||'—'}</p>}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">{formatCurrency(Number(p.amount))}</span>
                    <Badge variant={isPaid?'success':isLate?'error':'warning'}>{isPaid?'Payé':isLate?'Retard':'Attente'}</Badge>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Tickets */}
      {tickets.length > 0 && (
        <div className={cardCls}>
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Wrench size={14} className="text-primary"/>Signalements ({tickets.length})</h3>
          </div>
          <div className="divide-y divide-border">
            {tickets.map((t:any) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.category} · {formatDate(t.created_at)}</p>
                </div>
                <Badge variant={t.status==='resolved'||t.status==='closed'?'success':t.status==='in_progress'?'warning':'error'}>
                  {t.status==='resolved'?'Résolu':t.status==='closed'?'Fermé':t.status==='in_progress'?'En cours':'Ouvert'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}