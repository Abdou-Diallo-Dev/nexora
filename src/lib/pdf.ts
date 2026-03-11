// Client-side PDF generation using jsPDF
import type { ContractArticle } from '@/types/contract';

export async function loadJsPDF() {
  if (typeof window === 'undefined') return null;
  // @ts-ignore
  if (window.jsPDF) return window.jsPDF;
  return new Promise<typeof import('jspdf').jsPDF>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => resolve((window as any).jspdf.jsPDF);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Charge une image depuis URL → base64
async function loadImageAsBase64(url: string): Promise<{ data: string; format: string } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const format = blob.type.includes('png') ? 'PNG' : 'JPEG';
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ data: (reader.result as string).split(',')[1], format });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── Color palette ────────────────────────────────────────────
const PRIMARY = [37, 99, 235]   as [number,number,number];
const DARK    = [15, 23, 42]    as [number,number,number];
const GRAY    = [100, 116, 139] as [number,number,number];
const LIGHT   = [241, 245, 249] as [number,number,number];
const WHITE   = [255, 255, 255] as [number,number,number];
const GREEN   = [22, 163, 74]   as [number,number,number];

async function headerWithLogo(
  doc: any,
  title: string,
  subtitle: string,
  companyName: string,
  logoUrl?: string | null,
) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 32, 'F');

  if (logoUrl) {
    const img = await loadImageAsBase64(logoUrl);
    if (img) {
      try { doc.addImage(img.data, img.format, 6, 4, 24, 24); }
      catch { drawInitialsCircle(doc, companyName); }
    } else { drawInitialsCircle(doc, companyName); }
  } else { drawInitialsCircle(doc, companyName); }

  doc.setTextColor(...WHITE);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(title, 34, 13);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 34, 21);
  doc.setFontSize(8);
  doc.text(companyName, W - 8, 16, { align: 'right' });
  return 40;
}

function drawInitialsCircle(doc: any, companyName: string) {
  doc.setFillColor(...WHITE);
  doc.circle(18, 16, 8, 'F');
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  const initials = companyName.split(' ').map((w: string) => w[0]).join('').substring(0,2).toUpperCase() || 'IG';
  doc.text(initials, 18, 19.5, { align: 'center' });
}

function footer(doc: any, companyName = 'Nexora Immo') {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...LIGHT);
  doc.rect(0, H - 16, W, 16, 'F');
  doc.setTextColor(...GRAY);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(companyName + ' — Gestion Immobilière Professionnelle', 8, H - 6);
  doc.text(new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }), W - 8, H - 6, { align: 'right' });
}

function row(doc: any, y: number, label: string, value: string, highlighted = false) {
  const W = doc.internal.pageSize.getWidth();
  if (highlighted) { doc.setFillColor(...LIGHT); doc.rect(8, y - 5, W - 16, 9, 'F'); }
  doc.setTextColor(...GRAY); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(label, 12, y);
  doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold');
  doc.text(value, 80, y);
  return y + 10;
}

function sectionTitle(doc: any, y: number, title: string) {
  doc.setFillColor(...PRIMARY); doc.rect(8, y, 3, 6, 'F');
  doc.setTextColor(...PRIMARY); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(title, 15, y + 5);
  return y + 12;
}

function bullet(doc: any, y: number, text: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PRIMARY); doc.circle(14, y - 1, 1.2, 'F');
  doc.setTextColor(...DARK); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, W - 30);
  doc.text(lines, 18, y);
  return y + lines.length * 5 + 1.5;
}

function para(doc: any, y: number, text: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setTextColor(...DARK); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, W - 24);
  doc.text(lines, 12, y);
  return y + lines.length * 5 + 2;
}

function pb(doc: any, y: number, needed: number): number {
  const H = doc.internal.pageSize.getHeight();
  if (y > H - needed - 20) { doc.addPage(); return 20; }
  return y;
}

// ─── QUITTANCE ────────────────────────────────────────────────
export async function generateReceipt(data: {
  tenantName: string;
  tenantEmail?: string;
  propertyName: string;
  propertyAddress: string;
  periodMonth: number;
  periodYear: number;
  amount: number;
  chargesAmount: number;
  paidDate?: string;
  paymentMethod: string;
  reference?: string;
  companyName: string;
  companyAddress?: string;
  companyLogoUrl?: string | null;
}) {
  const JsPDF = await loadJsPDF();
  if (!JsPDF) return;
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const period = `${MONTHS[data.periodMonth - 1]} ${data.periodYear}`;
  const ref = data.reference || `QUITT-${data.periodYear}${String(data.periodMonth).padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`;
  const W = doc.internal.pageSize.getWidth();

  let y = await headerWithLogo(doc, 'QUITTANCE DE LOYER', `Période : ${period}`, data.companyName, data.companyLogoUrl);

  doc.setFillColor(...LIGHT); doc.roundedRect(8, y, 194, 12, 2, 2, 'F');
  doc.setTextColor(...GRAY); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('Référence', 14, y + 5);
  doc.setTextColor(...PRIMARY); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(ref, 14, y + 11);
  if (data.paidDate) {
    doc.setTextColor(...GREEN); doc.setFontSize(12);
    doc.text('✓ PAYÉ', 190, y + 9, { align: 'right' });
  }
  y += 20;

  y = sectionTitle(doc, y, 'Locataire');
  y = row(doc, y, 'Nom complet', data.tenantName, false);
  if (data.tenantEmail) y = row(doc, y, 'Email', data.tenantEmail, true);
  y += 4;

  y = sectionTitle(doc, y, 'Bien loué');
  y = row(doc, y, 'Désignation', data.propertyName, false);
  y = row(doc, y, 'Adresse', data.propertyAddress, true);
  y += 4;

  y = sectionTitle(doc, y, 'Détail du paiement');
  y = row(doc, y, 'Période', period, false);
  if (data.paidDate) y = row(doc, y, 'Date de paiement', new Date(data.paidDate).toLocaleDateString('fr-FR'), true);
  y = row(doc, y, 'Méthode', data.paymentMethod, data.paidDate ? false : true);
  y += 4;

  doc.setFillColor(...PRIMARY); doc.roundedRect(8, y, 194, 36, 3, 3, 'F');
  doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Loyer', 20, y + 10);
  doc.text('Charges', 20, y + 20);
  doc.setDrawColor(...WHITE); doc.setLineWidth(0.3); doc.line(8, y + 24, 202, y + 24);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 20, y + 32);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${data.amount.toLocaleString('fr-FR')} FCFA`, 190, y + 10, { align: 'right' });
  doc.text(`${data.chargesAmount.toLocaleString('fr-FR')} FCFA`, 190, y + 20, { align: 'right' });
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(`${(data.amount + data.chargesAmount).toLocaleString('fr-FR')} FCFA`, 190, y + 32, { align: 'right' });
  y += 44;

  doc.setTextColor(...GRAY); doc.setFontSize(7.5); doc.setFont('helvetica', 'italic');
  const mention = `Je soussigné(e), représentant ${data.companyName}, certifie avoir reçu de ${data.tenantName} la somme de ${(data.amount + data.chargesAmount).toLocaleString('fr-FR')} FCFA au titre du loyer et des charges pour le mois de ${period}.`;
  const lines = doc.splitTextToSize(mention, 190);
  doc.text(lines, 10, y);
  y += lines.length * 4.5 + 6;

  // Signature avec logo si disponible
  if (data.companyLogoUrl) {
    const img = await loadImageAsBase64(data.companyLogoUrl);
    doc.setDrawColor(...LIGHT); doc.setLineWidth(0.5); doc.rect(120, y, 74, 28);
    doc.setTextColor(...GRAY); doc.setFontSize(8);
    doc.text('Signature du bailleur', 157, y + 5, { align: 'center' });
    if (img) { try { doc.addImage(img.data, img.format, 147, y + 8, 20, 14); } catch {} }
  } else {
    doc.setDrawColor(...LIGHT); doc.setLineWidth(0.5); doc.rect(120, y, 74, 24);
    doc.setTextColor(...GRAY); doc.setFontSize(8);
    doc.text('Signature du bailleur', 157, y + 5, { align: 'center' });
  }

  footer(doc, data.companyName);
  doc.save(`quittance-${data.periodYear}-${String(data.periodMonth).padStart(2,'0')}-${data.tenantName.replace(/\s+/g,'-')}.pdf`);
}

// Articles par défaut
const DEFAULT_ARTICLES: ContractArticle[] = [
  { num:'2', title:'Objet du contrat',           content:"Le bailleur donne a loyer au locataire pour usage d'habitation uniquement le logement designe." },
  { num:'3', title:'Durée du bail',              content:"A l'echeance, le bail est tacitement reconduit par periodes d'un (1) an, sauf denonciation un mois avant." },
  { num:'5', title:'Etat des lieux',             content:"Un etat des lieux contradictoire sera etabli a l'entree et a la sortie du locataire." },
  { num:'6', title:'Obligations du locataire',   content:"- Payer le loyer et charges a la date convenue.\n- User paisiblement du logement.\n- Entretenir le logement.\n- Ne pas sous-louer sans autorisation.\n- Souscrire une assurance habitation." },
  { num:'7', title:'Obligations du bailleur',    content:"- Delivrer un logement en bon etat.\n- Garantir la jouissance paisible.\n- Effectuer les grosses reparations." },
  { num:'8', title:'Résiliation du bail',        content:"- Locataire : preavis d'un (1) mois.\n- Bailleur : preavis de trois (3) mois.\n- Depot de garantie restitue sous un (1) mois." },
  { num:'9', title:'Pénalités de retard',        content:"Tout retard au-dela de dix (10) jours entraine une penalite de 5% du loyer mensuel." },
  { num:'10', title:'Règlement des litiges',     content:"Tout litige sera soumis au Tribunal competent apres tentative amiable de 30 jours." },
];

// ─── CONTRAT DE BAIL ─────────────────────────────────────────
export async function generateLeaseContract(data: {
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  chargesAmount: number;
  depositAmount?: number;
  paymentDay: number;
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;
  // ── Automatiques depuis la DB ──
  companyLogoUrl?: string | null;
  customArticles?: ContractArticle[] | null;
  specialConditions?: string | null;
}) {
  const JsPDF = await loadJsPDF();
  if (!JsPDF) return;
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
  const articles = data.customArticles?.length ? data.customArticles : DEFAULT_ARTICLES;

  function renderArticleContent(yRef: number, content: string): number {
    let y = yRef;
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t) { y += 3; continue; }
      y = pb(doc, y, 15);
      y = t.startsWith('- ') ? bullet(doc, y, t.slice(2)) : para(doc, y, t);
    }
    return y;
  }

  let y = await headerWithLogo(doc, 'CONTRAT DE BAIL', `Du ${fmt(data.startDate)} au ${fmt(data.endDate)}`, data.companyName, data.companyLogoUrl);

  // Art. 1 — Parties (toujours fixe)
  y = sectionTitle(doc, y, 'Article 1 — Parties');
  y = row(doc, y, 'Bailleur', data.companyName, false);
  if (data.companyAddress) y = row(doc, y, 'Adresse bailleur', data.companyAddress, true);
  if (data.companyEmail)   y = row(doc, y, 'Email bailleur', data.companyEmail, false);
  y += 4;
  y = row(doc, y, 'Locataire', data.tenantName, true);
  if (data.tenantEmail) y = row(doc, y, 'Email locataire', data.tenantEmail, false);
  if (data.tenantPhone) y = row(doc, y, 'Tél. locataire', data.tenantPhone, true);
  y += 6;

  // Art. bien (toujours fixe)
  y = pb(doc, y, 35);
  y = sectionTitle(doc, y, 'Article 2 — Bien loué');
  y = row(doc, y, 'Désignation', data.propertyName, false);
  y = row(doc, y, 'Adresse', data.propertyAddress, true);
  y = row(doc, y, 'Ville', data.propertyCity, false);
  y += 6;

  // Tableau financier (toujours fixe)
  y = pb(doc, y, 55);
  y = sectionTitle(doc, y, 'Article F — Loyer et charges');
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(8, y, 194, data.depositAmount ? 36 : 26, 3, 3, 'F');
  doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Loyer mensuel', 20, y + 9);
  doc.text('Charges', 20, y + 19);
  doc.text(`${data.rentAmount.toLocaleString('fr-FR')} FCFA`, 190, y + 9, { align: 'right' });
  doc.text(`${data.chargesAmount.toLocaleString('fr-FR')} FCFA`, 190, y + 19, { align: 'right' });
  if (data.depositAmount) {
    doc.text('Dépôt de garantie', 20, y + 29);
    doc.text(`${data.depositAmount.toLocaleString('fr-FR')} FCFA`, 190, y + 29, { align: 'right' });
  }
  y += data.depositAmount ? 44 : 34;
  y = row(doc, y, 'Jour de paiement', `Le ${data.paymentDay} de chaque mois`, false);
  y += 6;

  // Articles personnalisés ou défaut
  for (const art of articles) {
    if (art.num === '1' || art.num === '2' || art.num === 'F') continue; // déjà rendus
    y = pb(doc, y, 30);
    y = sectionTitle(doc, y, `Article ${art.num} — ${art.title}`);
    if (art.content) y = renderArticleContent(y, art.content);
    y += 4;
  }

  // Conditions spéciales
  if (data.specialConditions?.trim()) {
    y = pb(doc, y, 30);
    y = sectionTitle(doc, y, 'Conditions spéciales');
    y = renderArticleContent(y, data.specialConditions);
    y += 4;
  }

  // Signatures
  y = pb(doc, y, 50);
  y = sectionTitle(doc, y, 'Signatures');
  doc.setTextColor(...GRAY); doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.text("Les soussignés reconnaissent avoir lu et accepté l'intégralité des clauses du présent contrat.", 12, y);
  y += 8;

  // Bailleur avec logo
  if (data.companyLogoUrl) {
    const img = await loadImageAsBase64(data.companyLogoUrl);
    doc.setDrawColor(...LIGHT); doc.setLineWidth(0.5); doc.rect(8, y, 88, 34);
    doc.setTextColor(...GRAY); doc.setFontSize(8);
    doc.text('Signature du bailleur', 52, y + 5, { align: 'center' });
    doc.text(data.companyName, 52, y + 10, { align: 'center' });
    if (img) { try { doc.addImage(img.data, img.format, 42, y + 14, 20, 14); } catch {} }
  } else {
    doc.setDrawColor(...LIGHT); doc.setLineWidth(0.5); doc.rect(8, y, 88, 28);
    doc.setTextColor(...GRAY); doc.setFontSize(8);
    doc.text('Signature du bailleur', 52, y + 5, { align: 'center' });
    doc.text(data.companyName, 52, y + 10, { align: 'center' });
  }

  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.5); doc.rect(108, y, 88, 28);
  doc.setTextColor(...GRAY); doc.setFontSize(8);
  doc.text('Signature du locataire', 152, y + 5, { align: 'center' });
  doc.text(data.tenantName, 152, y + 10, { align: 'center' });

  // Footers sur toutes les pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) { doc.setPage(p); footer(doc, data.companyName); }

  doc.save(`contrat-bail-${data.tenantName.replace(/\s+/g,'-')}-${data.startDate}.pdf`);
}

// Alias pour compatibilité avec leases/[id]/page.tsx
export async function generateContractPDF(data: {
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyType?: string;
  roomsCount?: number;
  startDate: string;
  endDate: string;
  rentAmount: number;
  chargesAmount: number;
  depositAmount?: number | null;
  paymentDay: number;
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyLogoUrl?: string | null;
  customArticles?: ContractArticle[] | null;
  specialConditions?: string | null;
}) {
  return generateLeaseContract({
    ...data,
    depositAmount: data.depositAmount ?? undefined,
  });
}

// ─── PAIEMENT (alias quittance) ───────────────────────────────
export async function generatePaymentPDF(data: {
  tenantName: string;
  propertyName: string;
  propertyAddress: string;
  periodMonth: number;
  periodYear: number;
  amount: number;
  chargesAmount: number;
  paidDate?: string | null;
  paymentMethod: string;
  reference?: string | null;
  status: string;
  companyName: string;
  companyLogoUrl?: string | null;
}) {
  return generateReceipt({
    ...data,
    paidDate: data.paidDate || undefined,
    reference: data.reference ?? undefined,
  });
}

// ─── TICKET DE MAINTENANCE ────────────────────────────────────
export async function generateMaintenancePDF(data: {
  ticketNumber: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  propertyName: string;
  propertyAddress?: string;
  tenantName?: string;
  scheduledDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  completedDate?: string;
  notes?: string;
  createdAt: string;
  companyName: string;
  companyLogoUrl?: string | null;
}) {
  const JsPDF = await loadJsPDF();
  if (!JsPDF) return;
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });

  const PRIORITY_COLORS: Record<string,[number,number,number]> = {
    low:[59,130,246], medium:[234,179,8], high:[234,88,12], urgent:[220,38,38],
  };
  const STATUS_COLORS: Record<string,[number,number,number]> = {
    open:[220,38,38], in_progress:[234,88,12], resolved:[22,163,74], closed:[100,116,139],
  };
  const PRIORITY_LABELS: Record<string,string> = { low:'Faible', medium:'Moyen', high:'Élevé', urgent:'URGENT' };
  const STATUS_LABELS: Record<string,string> = { open:'Ouvert', in_progress:'En cours', resolved:'Résolu', closed:'Fermé' };
  const CATEGORY_LABELS: Record<string,string> = {
    plumbing:'Plomberie', electricity:'Électricité', hvac:'Climatisation',
    structural:'Structure', appliance:'Électroménager', pest_control:'Nuisibles', other:'Autre',
  };

  let y = await headerWithLogo(doc, 'TICKET DE MAINTENANCE', `N° ${data.ticketNumber}`, data.companyName, data.companyLogoUrl);

  const pColor = PRIORITY_COLORS[data.priority] || PRIORITY_COLORS.medium;
  const sColor = STATUS_COLORS[data.status] || STATUS_COLORS.open;
  doc.setFillColor(...sColor); doc.roundedRect(8, y, 55, 10, 2, 2, 'F');
  doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(`Statut : ${STATUS_LABELS[data.status] || data.status}`, 35.5, y + 7, { align: 'center' });
  doc.setFillColor(...pColor); doc.roundedRect(68, y, 55, 10, 2, 2, 'F');
  doc.text(`Priorité : ${PRIORITY_LABELS[data.priority] || data.priority}`, 95.5, y + 7, { align: 'center' });
  doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`Créé le : ${fmt(data.createdAt)}`, W - 8, y + 7, { align: 'right' });
  y += 18;

  doc.setFillColor(...LIGHT); doc.roundedRect(8, y, W - 16, 12, 2, 2, 'F');
  doc.setTextColor(...DARK); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(data.title, W - 30);
  doc.text(titleLines, 14, y + 8);
  y += 18;

  y = sectionTitle(doc, y, 'Informations');
  y = row(doc, y, 'Bien', data.propertyName, false);
  if (data.propertyAddress) y = row(doc, y, 'Adresse', data.propertyAddress, true);
  if (data.tenantName)      y = row(doc, y, 'Locataire', data.tenantName, false);
  y = row(doc, y, 'Catégorie', CATEGORY_LABELS[data.category] || data.category, !!data.tenantName);
  if (data.scheduledDate)   y = row(doc, y, 'Date planifiée', fmt(data.scheduledDate), true);
  if (data.completedDate)   y = row(doc, y, 'Date résolution', fmt(data.completedDate), false);
  if (data.estimatedCost !== undefined) y = row(doc, y, 'Coût estimé', `${data.estimatedCost.toLocaleString('fr-FR')} FCFA`, true);
  if (data.actualCost !== undefined)    y = row(doc, y, 'Coût réel', `${data.actualCost.toLocaleString('fr-FR')} FCFA`, false);
  y += 4;

  if (data.description) {
    y = sectionTitle(doc, y, 'Description');
    doc.setTextColor(...DARK); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    const dLines = doc.splitTextToSize(data.description, W - 24);
    doc.text(dLines, 12, y);
    y += dLines.length * 5 + 6;
  }

  if (data.notes) {
    y = sectionTitle(doc, y, 'Notes / Suivi');
    doc.setFillColor(255, 251, 235);
    const nLines = doc.splitTextToSize(data.notes, W - 30);
    doc.roundedRect(8, y, W - 16, Math.max(16, nLines.length * 5 + 8), 2, 2, 'F');
    doc.setTextColor(120, 80, 0); doc.setFontSize(9);
    doc.text(nLines, 14, y + 7);
    y += nLines.length * 5 + 14;
  }

  y = sectionTitle(doc, y, 'Suivi du ticket');
  const steps = [
    { label:'Ouvert',   done: true },
    { label:'En cours', done: ['in_progress','resolved','closed'].includes(data.status) },
    { label:'Résolu',   done: ['resolved','closed'].includes(data.status) },
    { label:'Fermé',    done: data.status === 'closed' },
  ];
  const stepW = (W - 20) / steps.length;
  steps.forEach((s, i) => {
    const x = 10 + i * stepW + stepW / 2;
    doc.setFillColor(...(s.done ? PRIMARY : LIGHT));
    doc.circle(x, y + 5, 4, 'F');
    if (s.done) {
      doc.setTextColor(...WHITE); doc.setFontSize(8);
      doc.text('✓', x, y + 7.5, { align: 'center' });
    }
    if (i < steps.length - 1) {
      doc.setDrawColor(...(steps[i+1].done ? PRIMARY : LIGHT));
      doc.setLineWidth(1.5);
      doc.line(x + 4, y + 5, x + stepW - 4, y + 5);
    }
    doc.setTextColor(...(s.done ? PRIMARY : GRAY));
    doc.setFontSize(7.5); doc.setFont('helvetica', s.done ? 'bold' : 'normal');
    doc.text(s.label, x, y + 14, { align: 'center' });
  });

  footer(doc, data.companyName);
  doc.save(`ticket-maintenance-${data.ticketNumber}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// ÉTAT DES LIEUX
// ─────────────────────────────────────────────────────────────
export type InspectionRoom = {
  name: string;          // Ex: Salon, Cuisine, Chambre 1
  condition: string;     // Bon état / Moyen / Mauvais
  observations: string;
};

export type InspectionPhoto = {
  data: string;   // base64
  format: string; // PNG | JPEG
  caption: string;
};

export async function generateInspectionPDF(params: {
  type: 'entree' | 'sortie';
  tenantName: string;
  propertyName: string;
  propertyAddress: string;
  date: string;
  rooms: InspectionRoom[];
  observations?: string;
  photos?: InspectionPhoto[];
  companyName: string;
  companyLogoUrl?: string | null;
  companyAddress?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
}) {
  const JsPDF = await loadJsPDF();
  if (!JsPDF) return;
  const doc = new (JsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  const typeLabel = params.type === 'entree' ? "ÉTAT DES LIEUX D'ENTRÉE" : "ÉTAT DES LIEUX DE SORTIE";
  let y = await headerWithLogo(doc, typeLabel, params.date, params.companyName, params.companyLogoUrl);

  // Infos principales
  doc.setFillColor(...LIGHT);
  doc.roundedRect(10, y, W - 20, 28, 3, 3, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('LOCATAIRE', 16, y + 7);
  doc.text('BIEN IMMOBILIER', W / 2 + 4, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(params.tenantName, 16, y + 14);
  doc.text(params.propertyName, W / 2 + 4, y + 14);
  doc.setFontSize(8); doc.setTextColor(...GRAY);
  doc.text(params.propertyAddress, 16, y + 21);
  doc.setTextColor(...DARK);
  y += 34;

  // Tableau des pièces
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Détail par pièce', 10, y); y += 6;

  const conditionColor: Record<string, [number,number,number]> = {
    'Bon état': GREEN,
    'Moyen': [234, 179, 8],
    'Mauvais': [220, 38, 38],
  };

  for (const room of params.rooms) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(...LIGHT);
    doc.roundedRect(10, y, W - 20, 22, 2, 2, 'F');

    // Nom pièce
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
    doc.text(room.name, 15, y + 8);

    // Badge état
    const col = conditionColor[room.condition] || GRAY;
    doc.setFillColor(...col);
    doc.roundedRect(W - 55, y + 3, 40, 7, 2, 2, 'F');
    doc.setTextColor(...WHITE); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(room.condition, W - 35, y + 7.5, { align: 'center' });

    // Observations
    doc.setTextColor(...GRAY); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    const obs = room.observations || 'Aucune observation';
    doc.text(obs.substring(0, 80), 15, y + 16);
    y += 26;
  }

  // Observations générales
  if (params.observations) {
    if (y > 240) { doc.addPage(); y = 20; }
    y += 4;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
    doc.text('Observations générales', 10, y); y += 6;
    doc.setFillColor(...LIGHT);
    doc.roundedRect(10, y, W - 20, 20, 2, 2, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(params.observations, W - 30);
    doc.text(lines.slice(0, 3), 15, y + 7);
    y += 24;
  }

  // Photos
  if (params.photos && params.photos.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    y += 4;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
    doc.text('Photos', 10, y); y += 6;
    let px = 10;
    for (const photo of params.photos.slice(0, 6)) {
      try {
        doc.addImage(photo.data, photo.format, px, y, 55, 40);
        doc.setFontSize(7); doc.setTextColor(...GRAY);
        doc.text(photo.caption.substring(0, 20), px + 27.5, y + 43, { align: 'center' });
      } catch {}
      px += 62;
      if (px > W - 60) { px = 10; y += 50; }
    }
    y += 50;
  }

  // Signatures
  if (y > 240) { doc.addPage(); y = 20; }
  y += 8;
  doc.setDrawColor(...GRAY); doc.setLineWidth(0.3);
  doc.line(10, y + 15, 80, y + 15);
  doc.line(W - 80, y + 15, W - 10, y + 15);
  doc.setFontSize(8); doc.setTextColor(...GRAY);
  doc.text('Signature du bailleur', 45, y + 20, { align: 'center' });
  doc.text('Signature du locataire', W - 45, y + 20, { align: 'center' });

  footer(doc, params.companyName);
  doc.save(`etat-des-lieux-${params.type}-${params.tenantName.replace(/\s+/g, '-')}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// RÉSILIATION / DOCUMENTS ADMINISTRATIFS
// ─────────────────────────────────────────────────────────────
export type TerminationDocType = 'resiliation_contrat' | 'resiliation_convention' | 'decharge' | 'attestation_fin';

const TERMINATION_LABELS: Record<TerminationDocType, { title: string; subtitle: string }> = {
  resiliation_contrat:    { title: 'RÉSILIATION DE CONTRAT DE LOCATION', subtitle: 'Document officiel de résiliation' },
  resiliation_convention: { title: 'RÉSILIATION DE CONVENTION',          subtitle: 'Document officiel de résiliation de convention' },
  decharge:               { title: 'DÉCHARGE',                           subtitle: 'Document de décharge signé entre les parties' },
  attestation_fin:        { title: 'ATTESTATION DE FIN DE LOCATION',     subtitle: 'Attestation certifiant la fin du bail' },
};

export async function generateTerminationPDF(params: {
  docType: TerminationDocType;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  propertyName: string;
  propertyAddress: string;
  startDate: string;
  endDate: string;
  terminationDate: string;
  rentAmount: number;
  depositReturned?: number;
  reason?: string;
  customText?: string;
  companyName: string;
  companyAddress?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyLogoUrl?: string | null;
}) {
  const JsPDF = await loadJsPDF();
  if (!JsPDF) return;
  const doc = new (JsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  const { title, subtitle } = TERMINATION_LABELS[params.docType];
  let y = await headerWithLogo(doc, title, subtitle, params.companyName, params.companyLogoUrl);

  // Infos parties
  doc.setFillColor(...LIGHT);
  doc.roundedRect(10, y, W - 20, 36, 3, 3, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY);
  doc.text('BAILLEUR', 16, y + 7);
  doc.text('LOCATAIRE', W / 2 + 4, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...DARK);
  doc.text(params.companyName, 16, y + 14);
  doc.text(params.tenantName, W / 2 + 4, y + 14);
  doc.setFontSize(8); doc.setTextColor(...GRAY);
  if (params.companyAddress) doc.text(params.companyAddress, 16, y + 20);
  if (params.companyEmail)   doc.text(params.companyEmail, 16, y + 26);
  if (params.tenantEmail)    doc.text(params.tenantEmail, W / 2 + 4, y + 20);
  if (params.tenantPhone)    doc.text(params.tenantPhone, W / 2 + 4, y + 26);
  y += 42;

  // Infos bail
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(10, y, W - 20, 28, 3, 3, 'F');
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(10, y, 10, y + 28);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PRIMARY);
  doc.text('BIEN CONCERNÉ', 16, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK); doc.setFontSize(10);
  doc.text(params.propertyName, 16, y + 14);
  doc.setFontSize(8); doc.setTextColor(...GRAY);
  doc.text(params.propertyAddress, 16, y + 20);
  doc.text(`Bail du ${params.startDate} au ${params.endDate}`, 16, y + 26);
  y += 34;

  // Corps du document
  y += 4;
  const bodyText = params.customText || getDefaultBody(params.docType, params);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
  const lines = doc.splitTextToSize(bodyText, W - 20);
  doc.text(lines, 10, y);
  y += lines.length * 5 + 8;

  // Détails financiers si décharge ou attestation
  if (params.docType === 'decharge' || params.docType === 'attestation_fin') {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFillColor(...LIGHT);
    doc.roundedRect(10, y, W - 20, 24, 3, 3, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
    doc.text('Récapitulatif financier', 16, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
    doc.text(`Loyer mensuel : ${params.rentAmount.toLocaleString('fr-FR')} FCFA`, 16, y + 14);
    if (params.depositReturned !== undefined) {
      doc.text(`Dépôt de garantie restitué : ${params.depositReturned.toLocaleString('fr-FR')} FCFA`, 16, y + 20);
    }
    y += 30;
  }

  // Date + signatures
  if (y > 230) { doc.addPage(); y = 20; }
  y += 8;
  doc.setFontSize(9); doc.setTextColor(...GRAY);
  doc.text(`Fait à ____________, le ${params.terminationDate}`, 10, y); y += 14;
  doc.setDrawColor(...GRAY); doc.setLineWidth(0.3);
  doc.line(10, y + 15, 80, y + 15);
  doc.line(W - 80, y + 15, W - 10, y + 15);
  doc.setFontSize(8);
  doc.text('Signature du bailleur', 45, y + 20, { align: 'center' });
  doc.text('Signature du locataire', W - 45, y + 20, { align: 'center' });

  footer(doc, params.companyName);
  const filename = `${params.docType}-${params.tenantName.replace(/\s+/g, '-')}-${params.terminationDate}.pdf`;
  doc.save(filename);
}

function getDefaultBody(type: TerminationDocType, p: any): string {
  const rent = p.rentAmount?.toLocaleString('fr-FR') || '0';
  switch (type) {
    case 'resiliation_contrat':
      return `Entre les soussignés,\n\n${p.companyName} (ci-après "le Bailleur") et ${p.tenantName} (ci-après "le Locataire"),\n\nIl a été convenu ce qui suit :\n\nLes parties conviennent de mettre fin au contrat de location portant sur le bien "${p.propertyName}", sis ${p.propertyAddress}, à compter du ${p.terminationDate}.\n\nLe contrat initial prenait effet le ${p.startDate} et devait s'achever le ${p.endDate}.\n\nLe Locataire s'engage à remettre les clés du logement au Bailleur au plus tard à la date de résiliation susmentionnée, et à laisser les lieux en bon état de propreté et d'entretien.\n\n${p.reason ? `Motif de résiliation : ${p.reason}` : ''}`;
    case 'resiliation_convention':
      return `Entre les soussignés,\n\n${p.companyName} et ${p.tenantName},\n\nLes parties conviennent de mettre fin à la convention relative au bien "${p.propertyName}" à compter du ${p.terminationDate}.\n\nTous les engagements découlant de cette convention sont réputés éteints à la date de résiliation, sous réserve du règlement de toutes sommes dues.\n\n${p.reason ? `Motif : ${p.reason}` : ''}`;
    case 'decharge':
      return `Je soussigné(e), ${p.tenantName}, déclare avoir reçu de ${p.companyName} l'ensemble des documents et clés relatifs au bien "${p.propertyName}", sis ${p.propertyAddress}.\n\nJe reconnais avoir pris connaissance des termes du contrat de location et m'engage à respecter toutes les obligations qui en découlent.\n\nJe décharge par la présente ${p.companyName} de toute responsabilité concernant l'état du bien à la date du ${p.terminationDate}.\n\nLoyer convenu : ${rent} FCFA/mois.`;
    case 'attestation_fin':
      return `Je soussigné(e), représentant de ${p.companyName}, atteste par la présente que :\n\n${p.tenantName} a occupé le bien immobilier "${p.propertyName}", sis ${p.propertyAddress}, du ${p.startDate} au ${p.endDate}.\n\nLe bail de location a pris fin le ${p.terminationDate}. Le Locataire a restitué les clés et libéré les lieux conformément aux dispositions contractuelles.\n\nLe loyer mensuel était de ${rent} FCFA. À ce jour, toutes les obligations financières ont été honorées.\n\nCette attestation est délivrée à ${p.tenantName} pour servir et valoir ce que de droit.`;
  }
}

// ─────────────────────────────────────────────────────────────
// CALCUL PRORATA LOYER
// ─────────────────────────────────────────────────────────────
export function calculateProrata(params: {
  rentAmount: number;
  startDay: number;   // jour d'entrée (1-31)
  month: number;      // mois (1-12)
  year: number;
}): { amount: number; isProrata: boolean; daysOccupied: number; totalDays: number; dailyRate: number } {
  const { rentAmount, startDay, month, year } = params;
  const totalDays = new Date(year, month, 0).getDate(); // jours dans le mois

  // Règle : du 1 au 5 → pas de prorata, loyer complet
  if (startDay <= 5) {
    return { amount: rentAmount, isProrata: false, daysOccupied: totalDays, totalDays, dailyRate: rentAmount / totalDays };
  }

  // À partir du 6 → prorata activé
  const daysOccupied = totalDays - startDay + 1;
  const dailyRate = rentAmount / totalDays;
  const amount = Math.round(dailyRate * daysOccupied);

  return { amount, isProrata: true, daysOccupied, totalDays, dailyRate: Math.round(dailyRate) };
}