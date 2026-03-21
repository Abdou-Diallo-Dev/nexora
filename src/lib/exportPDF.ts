import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function formatCFA(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

const DEFAULT_PRIMARY: [number,number,number] = [30, 64, 175];
let PRIMARY: [number,number,number] = [...DEFAULT_PRIMARY];

function hexToRgb(hex: string): [number,number,number] {
  try {
    const clean = hex.replace(/^#/,'').trim();
    if (clean.length !== 6) return [...DEFAULT_PRIMARY] as [number,number,number];
    return [parseInt(clean.substring(0,2),16), parseInt(clean.substring(2,4),16), parseInt(clean.substring(4,6),16)];
  } catch { return [...DEFAULT_PRIMARY] as [number,number,number]; }
}

async function loadImageAsBase64(url: string): Promise<{data:string;format:string}|null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const fmt = blob.type.includes('png') ? 'PNG' : 'JPEG';
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ data: (reader.result as string).split(',')[1], format: fmt });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function addHeader(doc: jsPDF, title: string, subtitle: string, company: string, logoUrl?: string|null, primaryColor?: string|null) {
  PRIMARY = primaryColor ? hexToRgb(primaryColor) : [...DEFAULT_PRIMARY];
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 32, 'F');

  if (logoUrl) {
    const img = await loadImageAsBase64(logoUrl);
    if (img) {
      try { doc.addImage(img.data, img.format, 6, 4, 24, 24); }
      catch { drawInitials(doc, company); }
    } else { drawInitials(doc, company); }
  } else { drawInitials(doc, company); }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(title, W - 8, 12, { align: 'right' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(subtitle, W - 8, 19, { align: 'right' });
  doc.setFontSize(8);
  doc.text(company, W - 8, 25, { align: 'right' });
  doc.text(format(new Date(), 'dd MMMM yyyy', { locale: fr }), 34, 25);
}

function drawInitials(doc: jsPDF, name: string) {
  doc.setFillColor(255, 255, 255);
  doc.circle(18, 16, 10, 'F');
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text((name||'N').charAt(0).toUpperCase(), 18, 20, { align: 'center' });
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const y = 290;
  doc.setDrawColor(200, 200, 200);
  doc.line(10, y, 200, y);
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text('Généré par Nexora — Plateforme de gestion immobilière', 10, y + 5);
  doc.text(`Page ${pageNum} / ${totalPages}`, 200, y + 5, { align: 'right' });
}

function kpiBox(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, color: number[]) {
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');
  const brightness = (color[0]*299 + color[1]*587 + color[2]*114) / 1000;
  const textR = brightness > 170 ? 30 : 255;
  const textG = brightness > 170 ? 60 : 255;
  const textB = brightness > 170 ? 120 : 255;
  doc.setTextColor(textR, textG, textB);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(label.toUpperCase(), x + 4, y + 6);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(value, x + 4, y + 13);
}

// Uses PRIMARY color instead of hardcoded blue
function sectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(...PRIMARY);
  doc.rect(10, y, 3, 6, 'F');
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(title, 16, y + 5);
  return y + 10;
}

// ═══════════════════════════════════════════
// EXPORT STATISTIQUES
// ═══════════════════════════════════════════
export async function exportStatsPDF(data: any, company: string, logoUrl?: string|null, primaryColor?: string|null) {
  const doc = new jsPDF('p', 'mm', 'a4');
  await addHeader(doc, 'Statistiques', `Période : ${data.period} mois`, company, logoUrl, primaryColor);
  let y = 35;

  const kpiW = 43; const kpiH = 18; const gap = 3;
  kpiBox(doc, 10, y, kpiW, kpiH, 'Biens loués', `${data.rented||0}/${data.props||0} (${data.occupancy||0}%)`, [219, 234, 254]);
  kpiBox(doc, 10+kpiW+gap, y, kpiW, kpiH, 'Locataires actifs', `${data.activeTenants||0}/${data.tenants||0}`, [220, 252, 231]);
  kpiBox(doc, 10+(kpiW+gap)*2, y, kpiW, kpiH, 'Revenus période', formatCFA(data.revenue||0), [233, 213, 255]);
  kpiBox(doc, 10+(kpiW+gap)*3, y, kpiW, kpiH, 'Bénéfice net', formatCFA(data.net||0), [233, 213, 255]);
  y += kpiH + gap;

  kpiBox(doc, 10, y, kpiW, kpiH, `Commissions (${data.commissionRate||10}%)`, formatCFA(data.commissions||0), [219, 234, 254]);
  kpiBox(doc, 10+kpiW+gap, y, kpiW, kpiH, 'Total dépenses', formatCFA(data.expenses||0), [254, 226, 226]);
  kpiBox(doc, 10+(kpiW+gap)*2, y, kpiW, kpiH, 'Taux recouvrement', `${data.collectionRate||0}%`, [220, 252, 231]);
  kpiBox(doc, 10+(kpiW+gap)*3, y, kpiW, kpiH, "Taux d'impayés", `${data.impayeRate||0}%`, (data.impayeRate||0)===0?[220,252,231]:[254,226,226]);
  y += kpiH + 10;

  // Résumé
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(10, y, 190, 14, 3, 3, 'F');
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`Sur ${data.period||0} mois : ${formatCFA(data.revenue||0)} de revenus · ${formatCFA(data.commissions||0)} de commissions · ${formatCFA(data.expenses||0)} de dépenses · Bénéfice net : ${formatCFA(data.net||0)}`, 105, y + 9, { align: 'center', maxWidth: 180 });
  y += 20;

  // Tableau mensuel
  if (data.chart && data.chart.length > 0) {
    y = sectionTitle(doc, y, 'Évolution mensuelle');
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(10, y, 190, 8, 2, 2, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    const cols = [10, 45, 80, 115, 150, 185];
    doc.text('Mois', cols[0]+2, y+5);
    doc.text('Revenus', cols[1]+2, y+5);
    doc.text('Commissions', cols[2]+2, y+5);
    doc.text('Dépenses', cols[3]+2, y+5);
    doc.text('Net', cols[4]+2, y+5);
    y += 8;
    data.chart.forEach((c: any, i: number) => {
      if (i%2===0) { doc.setFillColor(250,250,250); doc.rect(10, y, 190, 7, 'F'); }
      doc.setTextColor(60,60,60); doc.setFontSize(7); doc.setFont('helvetica','normal');
      doc.text(c.month||'', cols[0]+2, y+5);
      doc.setTextColor(22,163,74); doc.text(formatCFA(c.revenue||0), cols[1]+2, y+5);
      doc.setTextColor(59,130,246); doc.text(formatCFA(c.commissions||0), cols[2]+2, y+5);
      doc.setTextColor(239,68,68); doc.text(formatCFA(c.expenses||0), cols[3]+2, y+5);
      doc.setTextColor(168,85,247); doc.text(formatCFA(c.net||0), cols[4]+2, y+5);
      y += 7;
    });
    y += 8;
  }

  // Statut biens
  y = sectionTitle(doc, y, 'Statut des biens');
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(10, y, 90, 20, 3, 3, 'F');
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.text(`${data.occupancy||0}%`, 55, y+13, { align:'center' });
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text("Taux d'occupation", 55, y+19, { align:'center' });

  doc.setFillColor(220,252,231);
  doc.roundedRect(105, y, 43, 20, 3, 3, 'F');
  doc.setTextColor(22,163,74);
  doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.text(String(data.rented||0), 126, y+13, { align:'center' });
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text('Biens loués', 126, y+19, { align:'center' });

  doc.setFillColor(254,252,232);
  doc.roundedRect(152, y, 48, 20, 3, 3, 'F');
  doc.setTextColor(161,98,7);
  doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.text(String(data.available||0), 176, y+13, { align:'center' });
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text('Disponibles', 176, y+19, { align:'center' });
  y += 28;

  // Dépenses catégories
  if (data.expCats && data.expCats.length > 0) {
    y = sectionTitle(doc, y, 'Dépenses par catégorie');
    const totalExp = data.expCats.reduce((s:number,e:any)=>s+(e.value||0), 0);
    data.expCats.forEach((e:any) => {
      const pct = totalExp>0 ? Math.round((e.value/totalExp)*100) : 0;
      doc.setFillColor(248,250,252);
      doc.roundedRect(10, y, 190, 7, 2, 2, 'F');
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(10, y, Math.max(2,(pct/100)*190), 7, 2, 2, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(7); doc.setFont('helvetica','bold');
      doc.text(`${e.name||''} — ${formatCFA(e.value||0)} (${pct}%)`, 14, y+5);
      y += 9;
    });
  }

  addFooter(doc, 1, 1);
  doc.save(`statistiques-nexora-${format(new Date(),'yyyy-MM-dd')}.pdf`);
}

// ═══════════════════════════════════════════
// EXPORT RAPPORT FINANCIER
// ═══════════════════════════════════════════
export async function exportReportPDF(data: any, company: string, logoUrl?: string|null, primaryColor?: string|null) {
  const doc = new jsPDF('p','mm','a4');
  const period = data.period || '3 mois';
  await addHeader(doc, 'Rapport Financier', `${format(new Date(),'MMMM yyyy',{locale:fr})} · ${period}`, company, logoUrl, primaryColor);
  let y = 35;

  // Résumé exécutif
  y = sectionTitle(doc, y, 'Résumé exécutif');
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(10, y, 190, 16, 3, 3, 'F');
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  const summary = `Ce mois : ${formatCFA(data.currentMonthRevenue||0)} revenus, taux recouvrement ${data.collectionRate||0}%, benefice net ${formatCFA(data.currentMonthNet||0)}. Parc : ${data.totalProperties||0} bien(s), ${data.activeTenants||0} locataire(s).`;
  doc.text(summary, 15, y+7, { maxWidth: 180 });
  y += 22;

  // KPIs
  const kpiW = 43; const kpiH = 18; const gap = 3;
  kpiBox(doc, 10, y, kpiW, kpiH, 'Revenus du mois', formatCFA(data.currentMonthRevenue||0), [220,252,231]);
  kpiBox(doc, 10+kpiW+gap, y, kpiW, kpiH, 'Dépenses du mois', formatCFA(data.currentMonthExpenses||0), [254,226,226]);
  kpiBox(doc, 10+(kpiW+gap)*2, y, kpiW, kpiH, 'Bénéfice net', formatCFA(data.currentMonthNet||0), [233,213,255]);
  kpiBox(doc, 10+(kpiW+gap)*3, y, kpiW, kpiH, 'Taux recouvrement', `${data.collectionRate||0}%`, [220,252,231]);
  y += kpiH + 8;

  // Détail revenus
  y = sectionTitle(doc, y, 'Détail des revenus');
  const revCols = [10, 75, 130, 170];
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, y, 190, 8, 2, 2, 'F');
  doc.setTextColor(100,100,100); doc.setFontSize(7); doc.setFont('helvetica','bold');
  doc.text('Catégorie', revCols[0]+2, y+5);
  doc.text('Montant', revCols[1]+2, y+5);
  doc.text('Variation', revCols[2]+2, y+5);
  doc.text('Statut', revCols[3]+2, y+5);
  y += 8;
  [
    { label:'Loyers collectes', value:data.collectedRents||0, var:`+${data.revenueGrowth||0}%`, status:'Collectes', color:[22,163,74] },
    { label:`Commissions (${data.commissionRate||10}%)`, value:data.totalCommissions||0, var:'Auto', status:'Generees', color:[59,130,246] },
    { label:'En attente', value:data.pendingRents||0, var:'-', status:'A collecter', color:[161,98,7] },
    { label:'En retard', value:data.overdueRents||0, var:'-', status:'Impayes', color:[220,38,38] },
  ].forEach((row,i) => {
    if(i%2===0){doc.setFillColor(253,253,253);doc.rect(10,y,190,7,'F');}
    doc.setTextColor(60,60,60); doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text(row.label, revCols[0]+2, y+5);
    doc.setTextColor(row.color[0],row.color[1],row.color[2]); doc.setFont('helvetica','bold');
    doc.text(formatCFA(row.value), revCols[1]+2, y+5);
    doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100);
    doc.text(row.var, revCols[2]+2, y+5);
    doc.text(row.status, revCols[3]+2, y+5);
    y += 7;
  });
  y += 8;

  // Résultat net
  y = sectionTitle(doc, y, 'Résultat net');
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(10, y, 190, 20, 3, 3, 'F');
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.roundedRect(10, y, 190, 20, 3, 3, 'S');
  doc.setTextColor(109, 40, 217);
  doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  const rev = formatCFA(data.currentMonthRevenue||0);
  const comm = formatCFA((data.currentMonthRevenue||0)*((data.commissionRate||10)/100));
  const dep = formatCFA(data.currentMonthExpenses||0);
  doc.text(`${rev} (revenus) - ${comm} (comm.) - ${dep} (dep.) =`, 105, y+8, { align:'center', maxWidth:185 });
  doc.setFontSize(16); doc.setFont('helvetica','bold');
  doc.text(formatCFA(data.currentMonthNet||0), 105, y+17, { align:'center' });
  y += 28;

  // Dépenses
  y = sectionTitle(doc, y, 'Détail des dépenses');
  doc.setFillColor(254,242,242);
  doc.roundedRect(10, y, 90, 14, 3, 3, 'F');
  doc.setTextColor(220,38,38); doc.setFontSize(7); doc.setFont('helvetica','normal');
  doc.text('Dépenses bailleur', 14, y+5);
  doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text(formatCFA(data.totalBailleurExp||0), 14, y+12);

  doc.setFillColor(239,246,255);
  doc.roundedRect(105, y, 95, 14, 3, 3, 'F');
  doc.setTextColor(...PRIMARY); doc.setFontSize(7); doc.setFont('helvetica','normal');
  doc.text('Dépenses entreprise', 109, y+5);
  doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text(formatCFA(data.totalEntrepriseExp||0), 109, y+12);
  y += 20;

  if (data.expensesByCategory && data.expensesByCategory.length > 0) {
    const totalExp = data.expensesByCategory.reduce((s:number,e:any)=>s+(e.amount||0), 0);
    data.expensesByCategory.slice(0,5).forEach((e:any) => {
      const pct = totalExp>0 ? Math.round((e.amount/totalExp)*100) : 0;
      doc.setFillColor(241,245,249);
      doc.roundedRect(10, y, 190, 7, 2, 2, 'F');
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(10, y, Math.max(2,(pct/100)*190), 7, 2, 2, 'F');
      doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont('helvetica','bold');
      doc.text(`${e.name||''}  ${formatCFA(e.amount||0)}  (${pct}%)`, 14, y+5);
      y += 9;
    });
  }
  y += 5;

  // Page 2
  doc.addPage();
  await addHeader(doc, 'Rapport Financier', `Suite — ${format(new Date(),'MMMM yyyy',{locale:fr})}`, company, logoUrl, primaryColor);
  y = 35;

  // Performance biens
  y = sectionTitle(doc, y, 'Performance des biens');
  kpiBox(doc, 10, y, 55, 16, 'Biens loués', `${data.rentedProps||0} / ${data.totalProperties||0}`, [219,234,254]);
  kpiBox(doc, 70, y, 55, 16, 'Disponibles', String(data.availableProps||0), [220,252,231]);
  kpiBox(doc, 130, y, 70, 16, "Taux d'occupation", `${data.occupancyRate||0}%`, [233,213,255]);
  y += 24;

  // Suivi locataires
  y = sectionTitle(doc, y, 'Suivi des locataires');
  kpiBox(doc, 10, y, 55, 16, 'Locataires actifs', String(data.activeTenants||0), [219,234,254]);
  kpiBox(doc, 70, y, 55, 16, 'Paiements à jour', String(data.paidTenants||0), [220,252,231]);
  kpiBox(doc, 130, y, 70, 16, 'En retard', String(data.lateTenants||0), (data.lateTenants||0)>0?[254,226,226]:[220,252,231]);
  y += 22;

  if (data.topPayers && data.topPayers.length > 0) {
    doc.setTextColor(22,163,74); doc.setFontSize(8); doc.setFont('helvetica','bold');
    doc.text('Top bons payeurs', 12, y);
    y += 5;
    data.topPayers.forEach((t:any, i:number) => {
      doc.setFillColor(i%2===0?248:255, 250, 252);
      doc.rect(10, y, 190, 7, 'F');
      doc.setTextColor(60,60,60); doc.setFontSize(7); doc.setFont('helvetica','normal');
      doc.text(`#${i+1}  ${t.name||''}`, 14, y+5);
      doc.setTextColor(22,163,74); doc.setFont('helvetica','bold');
      doc.text(formatCFA(t.amount||0), 196, y+5, { align:'right' });
      y += 7;
    });
    y += 5;
  }

  // Tickets
  y = sectionTitle(doc, y, 'Signalements & maintenance');
  kpiBox(doc, 10, y, 55, 16, 'Tickets ouverts', String(data.openTickets||0), (data.openTickets||0)>0?[254,243,199]:[220,252,231]);
  kpiBox(doc, 70, y, 55, 16, 'Résolus', String(data.resolvedTickets||0), [220,252,231]);
  kpiBox(doc, 130, y, 70, 16, 'Total signalements', String(data.totalTickets||0), [219,234,254]);
  y += 22;

  if (data.ticketsByCategory && data.ticketsByCategory.length > 0) {
    data.ticketsByCategory.forEach((t:any, i:number) => {
      doc.setFillColor(i%2===0?248:255, 250, 252);
      doc.rect(10, y, 190, 7, 'F');
      doc.setTextColor(60,60,60); doc.setFontSize(7); doc.setFont('helvetica','normal');
      doc.text(t.name||'', 14, y+5);
      doc.setFont('helvetica','bold');
      doc.text(String(t.count||0), 196, y+5, { align:'right' });
      y += 7;
    });
    y += 5;
  }

  // Évolution mensuelle
  if (data.monthlyChart && data.monthlyChart.length > 0) {
    y = sectionTitle(doc, y, 'Évolution mensuelle');
    doc.setFillColor(248,250,252);
    doc.roundedRect(10, y, 190, 8, 2, 2, 'F');
    doc.setTextColor(100,100,100); doc.setFontSize(7); doc.setFont('helvetica','bold');
    const c2 = [10,45,85,125,165];
    doc.text('Mois', c2[0]+2, y+5);
    doc.text('Revenus', c2[1]+2, y+5);
    doc.text('Commissions', c2[2]+2, y+5);
    doc.text('Dépenses', c2[3]+2, y+5);
    doc.text('Net', c2[4]+2, y+5);
    y += 8;
    data.monthlyChart.forEach((c:any, i:number) => {
      if(i%2===0){doc.setFillColor(253,253,253);doc.rect(10,y,190,7,'F');}
      doc.setTextColor(60,60,60); doc.setFontSize(7); doc.setFont('helvetica','normal');
      doc.text(c.month||'', c2[0]+2, y+5);
      doc.setTextColor(22,163,74); doc.setFont('helvetica','bold');
      doc.text(formatCFA(c.revenue||0), c2[1]+2, y+5);
      doc.setTextColor(59,130,246);
      doc.text(formatCFA(c.commissions||0), c2[2]+2, y+5);
      doc.setTextColor(239,68,68);
      doc.text(formatCFA(c.expenses||0), c2[3]+2, y+5);
      doc.setTextColor(168,85,247);
      doc.text(formatCFA(c.net||0), c2[4]+2, y+5);
      y += 7;
    });
    y += 8;
  }

  // Prévisions
  y = sectionTitle(doc, y, 'Prévisions mois prochain');
  kpiBox(doc, 10, y, 55, 18, 'Revenus estimés', formatCFA(data.forecastRevenue||0), [204,251,241]);
  kpiBox(doc, 70, y, 55, 18, 'Dépenses prévues', formatCFA(data.forecastExpenses||0), [254,243,199]);
  kpiBox(doc, 130, y, 70, 18, 'Bénéfice net prévu', formatCFA(Math.max(0,(data.forecastRevenue||0)-(data.forecastRevenue||0)*((data.commissionRate||10)/100)-(data.forecastExpenses||0))), [233,213,255]);

  addFooter(doc, 1, 2);
  doc.setPage(2);
  addFooter(doc, 2, 2);
  doc.save(`rapport-financier-${format(new Date(),'yyyy-MM-dd')}.pdf`);
}