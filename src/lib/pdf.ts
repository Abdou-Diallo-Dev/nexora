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
const DEFAULT_PRIMARY: [number,number,number] = [37, 99, 235];
let   PRIMARY: [number,number,number] = [...DEFAULT_PRIMARY];
const DARK    = [15, 23, 42]    as [number,number,number];
const GRAY    = [100, 116, 139] as [number,number,number];
const LIGHT   = [241, 245, 249] as [number,number,number];
const WHITE   = [255, 255, 255] as [number,number,number];
const GREEN   = [22, 163, 74]   as [number,number,number];

function hexToRgb(hex: string): [number,number,number] {
  try {
    const clean = hex.replace(/^#/,'').trim();
    if (clean.length !== 6) return [...DEFAULT_PRIMARY] as [number,number,number];
    const r = parseInt(clean.substring(0,2),16);
    const g = parseInt(clean.substring(2,4),16);
    const b = parseInt(clean.substring(4,6),16);
    if (isNaN(r)||isNaN(g)||isNaN(b)) return [...DEFAULT_PRIMARY] as [number,number,number];
    return [r,g,b];
  } catch { return [...DEFAULT_PRIMARY] as [number,number,number]; }
}

function setThemeColor(primaryColor?: string | null) {
  const rgb = primaryColor ? hexToRgb(primaryColor) : DEFAULT_PRIMARY;
  PRIMARY = [...rgb] as [number,number,number];
}

// Format number with space as thousands separator (120 000 FCFA)
// Using manual formatting to avoid jsPDF rendering issues with Intl separators
function fmtNum(amount: number): string {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
function fmtAmount(amount: number): string {
  return fmtNum(amount) + ' F CFA';
}

async function headerWithLogo(
  doc: any,
  title: string,
  subtitle: string,
  companyName: string,
  logoUrl?: string | null,
  primaryColor?: string | null,
) {
  setThemeColor(primaryColor);
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...(PRIMARY as [number,number,number]));
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
  doc.setTextColor(...(PRIMARY as [number,number,number]));
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
  doc.setFillColor(...(PRIMARY as [number,number,number])); doc.rect(8, y, 3, 6, 'F');
  doc.setTextColor(...(PRIMARY as [number,number,number])); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(title, 15, y + 5);
  return y + 12;
}

function articleTitle(doc: any, y: number, num: string, title: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...(PRIMARY as [number,number,number]));
  doc.roundedRect(8, y, W - 16, 10, 2, 2, 'F');
  doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(`ARTICLE ${num} — ${title}`, 14, y + 7);
  return y + 15;
}

function replaceVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key] !== undefined ? vars[key] : `{{${key}}}`);
}

function bullet(doc: any, y: number, text: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...(PRIMARY as [number,number,number])); doc.circle(14, y - 1, 1.2, 'F');
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
  tenantPhone?: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity?: string;
  propertyType?: string;
  periodMonth: number;
  periodYear: number;
  amount: number;
  chargesAmount: number;
  paidDate?: string;
  paymentMethod: string;
  reference?: string;
  status?: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogoUrl?: string | null;
  primaryColor?: string | null;
  prorataStartDay?: number; // si défini, calcule le prorata
  paidAmount?: number;
  totalAmount?: number;
  remainingAmount?: number;
  vatRate?: number;
  commissionRate?: number;
  showCommission?: boolean;
}) {
  const JsPDF = await loadJsPDF();
  if (!JsPDF) return;
  setThemeColor(data.primaryColor);

  // Calcul prorata si applicable
  let displayAmount = data.amount;
  let prorataInfo: { daysOccupied: number; totalDays: number; dailyRate: number } | null = null;
  if (data.prorataStartDay && data.prorataStartDay > 5) {
    const p = calculateProrata({ rentAmount: data.amount, startDay: data.prorataStartDay, month: data.periodMonth, year: data.periodYear });
    if (p.isProrata) { displayAmount = p.amount; prorataInfo = p; }
  }

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const period = `${MONTHS[data.periodMonth - 1]} ${data.periodYear}`;
  const ref = data.reference || `QUITT-${data.periodYear}${String(data.periodMonth).padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`;
  const W = doc.internal.pageSize.getWidth();

  let y = await headerWithLogo(doc, 'QUITTANCE DE LOYER', `Période : ${period}`, data.companyName, data.companyLogoUrl, data.primaryColor);

  // Ref + statut sur même bande
  doc.setFillColor(...LIGHT); doc.roundedRect(8, y, 194, 14, 2, 2, 'F');
  doc.setTextColor(...GRAY); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text('REFERENCE', 14, y + 5);
  doc.setTextColor(...(PRIMARY as [number,number,number])); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(ref, 14, y + 12);
  if (data.paidDate) {
    // Badge PAYE vert à droite
    doc.setFillColor(22, 163, 74);
    doc.roundedRect(160, y + 3, 36, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('PAYE', 178, y + 8.5, { align: 'center' });
  }
  y += 22;

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
  // Partial payment info
  const isPartialPayment = data.paidAmount && data.totalAmount && data.paidAmount < data.totalAmount;
  if (isPartialPayment) {
    y = row(doc, y, 'Versement', fmtNum(data.paidAmount!) + ' F CFA', true);
    y = row(doc, y, 'Reste à payer', fmtNum(data.remainingAmount || 0) + ' F CFA', false);
  }
  y += 4;

  // Commission TVA calculation
  const vatRate = data.vatRate || 18;
  const commRate = data.commissionRate || 10;
  const commHT = displayAmount * (commRate / 100);
  const tva = commHT * (vatRate / 100);
  const commTTC = commHT + tva;
  const reversalAmount = displayAmount - commTTC;

  const boxH = isPartialPayment ? 52 : 36;
  doc.setFillColor(...(PRIMARY as [number,number,number])); doc.roundedRect(8, y, 194, boxH, 3, 3, 'F');
  doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Loyer mensuel', 20, y + 10);
  doc.text('Charges', 20, y + 20);
  if (isPartialPayment) {
    doc.text('Versement partiel', 20, y + 30);
    doc.setDrawColor(255,255,255,0.3); doc.setLineWidth(0.2); doc.line(8, y + 34, 202, y + 34);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('VERSÉ', 20, y + 44);
  } else {
    doc.setDrawColor(255,255,255,0.3); doc.setLineWidth(0.2); doc.line(8, y + 24, 202, y + 24);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 20, y + 32);
  }
  const amtLoyer = fmtNum(displayAmount) + ' F CFA';
  const amtCharges = fmtNum(data.chargesAmount) + ' F CFA';
  const amtTotal = fmtNum((isPartialPayment ? data.paidAmount! : displayAmount) + data.chargesAmount) + ' F CFA';
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(amtLoyer, 190, y + 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(amtCharges, 190, y + 20, { align: 'right' });
  if (isPartialPayment) {
    doc.text(fmtNum(data.paidAmount!) + ' F CFA', 190, y + 30, { align: 'right' });
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(amtTotal, 190, y + 44, { align: 'right' });
  } else {
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(amtTotal, 190, y + 32, { align: 'right' });
  }
  y += boxH + 8;

  // Commission + TVA breakdown
  if (data.showCommission !== false) {
    doc.setFillColor(245, 247, 250); doc.roundedRect(8, y, 194, 28, 2, 2, 'F');
    doc.setTextColor(...GRAY); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text(`Commission HT (${commRate}%)`, 14, y + 7);
    doc.text(`TVA (${vatRate}%) sur commission`, 14, y + 14);
    doc.text(`Commission TTC`, 14, y + 21);
    doc.setTextColor(...(PRIMARY as [number,number,number])); doc.setFont('helvetica', 'bold');
    doc.text(fmtNum(commHT) + ' F CFA', 190, y + 7, { align: 'right' });
    doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal');
    doc.text(fmtNum(tva) + ' F CFA', 190, y + 14, { align: 'right' });
    doc.setTextColor(220, 38, 38); doc.setFont('helvetica', 'bold');
    doc.text(fmtNum(commTTC) + ' F CFA', 190, y + 21, { align: 'right' });
    y += 34;

    // Net bailleur
    doc.setFillColor(220, 252, 231); doc.roundedRect(8, y, 194, 12, 2, 2, 'F');
    doc.setTextColor(22, 101, 52); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('Net à reverser au bailleur', 14, y + 8);
    doc.text(fmtNum(reversalAmount) + ' F CFA', 190, y + 8, { align: 'right' });
    y += 18;
  } else { y += 4; }

  if (prorataInfo) {
    doc.setFillColor(...LIGHT); doc.roundedRect(8, y, 194, 12, 2, 2, 'F');
    doc.setTextColor(...(PRIMARY as [number,number,number])); doc.setFontSize(8); doc.setFont('helvetica', 'italic');
    doc.text(`Prorata : ${prorataInfo.daysOccupied} jours / ${prorataInfo.totalDays} jours · Taux journalier : ${fmtNum(prorataInfo.dailyRate)} F CFA`, 14, y + 7);
    y += 16;
  }

  doc.setTextColor(...GRAY); doc.setFontSize(7.5); doc.setFont('helvetica', 'italic');
  const mention = `Je soussigné(e), représentant ${data.companyName}, certifie avoir reçu de ${data.tenantName} la somme de ${fmtNum(displayAmount + data.chargesAmount)} F CFA au titre du loyer et des charges pour le mois de ${period}.`;
  const mentionLines = doc.splitTextToSize(mention, 182);
  doc.text(mentionLines, 14, y);
  y += mentionLines.length * 5 + 8;

  // Signature bailleur — case vide pour tampon/timbre
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.5); doc.rect(120, y, 74, 28);
  doc.setTextColor(...GRAY); doc.setFontSize(8);
  doc.text('Signature / Cachet du bailleur', 157, y + 5, { align: 'center' });

  footer(doc, data.companyName);
  doc.save(`quittance-${data.periodYear}-${String(data.periodMonth).padStart(2,'0')}-${data.tenantName.replace(/\s+/g,'-')}.pdf`);
}

// Articles par défaut
const DEFAULT_ARTICLES: ContractArticle[] = [
  { num:'2', title:'Objet du contrat',           content:"Le bailleur donne a loyer au locataire pour usage d'habitation uniquement le logement designe." },
  { num:'3', title:'Durée du bail',              content:"A l'echeance, le bail est tacitement reconduit par periodes d'un (1) an, sauf denonciation un mois avant." },
  { num:'5', title:'Etat des lieux',             content:"Un etat des lieux contradictoire sera etabli a l'entree et a la sortie du locataire." },
  { num:'6', title:'Obligations du locataire',   content:"- Payer le loyer et charges a la date convenue chaque mois.\n- User paisiblement du logement.\n- Entretenir le logement.\n- Ne pas sous-louer sans autorisation.\n- Souscrire une assurance habitation." },
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
  propertyType?: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  chargesAmount: number;
  depositAmount?: number;
  paymentDay: number;
  ownerName?: string;           // Bailleur = nom du propriétaire du bien
  preamble?: string;            // Texte du préambule personnalisé
  companyName: string;          // Société de gestion
  companyAddress?: string;
  companyEmail?: string;
  companyLogoUrl?: string | null;
  primaryColor?: string | null;
  customArticles?: ContractArticle[] | null;
  specialConditions?: string | null;
}) {
  const JsPDF = await loadJsPDF();
  if (!JsPDF) return;
  setThemeColor(data.primaryColor);
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
  const articles = data.customArticles?.length ? data.customArticles : DEFAULT_ARTICLES;
  const baileurName = data.ownerName?.trim() || data.companyName;

  // Variables pour remplacement dans les templates
  const penalty = Math.round(data.rentAmount * 0.05);
  const tplVars: Record<string, string> = {
    bailleur:      baileurName,
    locataire:     data.tenantName,
    bien:          data.propertyName,
    adresse:       data.propertyAddress,
    ville:         data.propertyCity,
    loyer:         fmtAmount(data.rentAmount),
    charges:       fmtAmount(data.chargesAmount),
    total:         fmtAmount(data.rentAmount + data.chargesAmount),
    depot:         data.depositAmount ? fmtAmount(data.depositAmount) : 'non applicable',
    debut:         fmt(data.startDate),
    fin:           fmt(data.endDate),
    jour_paiement: String(data.paymentDay),
    penalite:      fmtAmount(penalty),
  };

  function renderContent(yRef: number, content: string): number {
    let y = yRef;
    const resolved = replaceVars(content, tplVars);
    for (const line of resolved.split('\n')) {
      const t = line.trim();
      if (!t) { y += 3; continue; }
      y = pb(doc, y, 15);
      y = t.startsWith('- ') ? bullet(doc, y, t.slice(2)) : para(doc, y, t);
    }
    return y;
  }

  // ── En-tête ──────────────────────────────────────────────────
  let y = await headerWithLogo(
    doc, 'CONTRAT DE BAIL',
    `Du ${fmt(data.startDate)} au ${fmt(data.endDate)}`,
    data.companyName, data.companyLogoUrl, data.primaryColor
  );

  // Titre centré
  doc.setFillColor(...LIGHT);
  doc.roundedRect(8, y, W - 16, 13, 2, 2, 'F');
  doc.setTextColor(...(PRIMARY as [number,number,number]));
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text("CONTRAT DE BAIL D'HABITATION", W / 2, y + 9, { align: 'center' });
  y += 18;

  // ── Identification des parties ────────────────────────────────
  const halfW = (W - 20) / 2;
  const boxH = 42;
  // Bailleur (gauche)
  doc.setFillColor(...LIGHT);
  doc.roundedRect(8, y, halfW, boxH, 2, 2, 'F');
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY);
  doc.text('LE BAILLEUR', 14, y + 7);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  const baileurLines = doc.splitTextToSize(baileurName, halfW - 12);
  doc.text(baileurLines[0], 14, y + 15);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
  let baileurY = y + 22;
  if (data.ownerName && data.companyName !== data.ownerName) {
    doc.text(`Gere par : ${data.companyName}`, 14, baileurY); baileurY += 6;
  }
  if (data.companyAddress) { doc.text(data.companyAddress.substring(0, 36), 14, baileurY); baileurY += 6; }
  if (data.companyEmail)   { doc.text(data.companyEmail, 14, baileurY); }

  // Séparateur
  doc.setDrawColor(...GRAY); doc.setLineWidth(0.2);
  doc.line(W / 2 + 1, y + 4, W / 2 + 1, y + boxH - 4);

  // Locataire (droite)
  const cx = W / 2 + 6;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(W / 2 + 2, y, halfW, boxH, 2, 2, 'F');
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY);
  doc.text('LE LOCATAIRE', cx, y + 7);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text(data.tenantName, cx, y + 15);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
  let locY = y + 22;
  if (data.tenantEmail) { doc.text(data.tenantEmail, cx, locY); locY += 6; }
  if (data.tenantPhone) { doc.text(data.tenantPhone, cx, locY); }
  y += boxH + 6;

  // ── Préambule ─────────────────────────────────────────────────
  y = pb(doc, y, 30);
  const defaultPreamble = `Entre les soussignes : ${baileurName}, ci-apres denomme "le Bailleur", d'une part, et ${data.tenantName}, ci-apres denomme "le Locataire", d'autre part, il a ete convenu et arrete ce qui suit :`;
  const preambleText = data.preamble?.trim()
    ? replaceVars(data.preamble, tplVars)
    : defaultPreamble;
  const preambleLines = doc.splitTextToSize(preambleText, W - 36);
  const preambleBoxH = preambleLines.length * 5 + 16;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(8, y, W - 16, preambleBoxH, 3, 3, 'F');
  doc.setFillColor(...(PRIMARY as [number,number,number]));
  doc.roundedRect(8, y, 3, preambleBoxH, 1, 1, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...(PRIMARY as [number,number,number]));
  doc.text('PREAMBULE', 18, y + 7);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
  doc.text(preambleLines, 18, y + 14);
  y += preambleBoxH + 8;

  // ── Article 1 — Designation du bien ──────────────────────────
  y = pb(doc, y, 40);
  y = articleTitle(doc, y, '1', 'DESIGNATION DU BIEN');
  y = row(doc, y, 'Designation', data.propertyName, false);
  y = row(doc, y, 'Adresse', data.propertyAddress, true);
  y = row(doc, y, 'Ville', data.propertyCity, false);
  if (data.propertyType) y = row(doc, y, 'Type de bien', data.propertyType, true);
  y += 6;

  // ── Article 2 — Duree du bail ─────────────────────────────────
  y = pb(doc, y, 40);
  y = articleTitle(doc, y, '2', 'DUREE DU BAIL');
  y = row(doc, y, 'Date de prise d\'effet', fmt(data.startDate), false);
  y = row(doc, y, 'Date d\'echeance', fmt(data.endDate), true);
  y += 2;
  y = para(doc, y, "A l'echeance, le bail est tacitement reconduit par periodes d'un (1) an, sauf denonciation par lettre recommandee un (1) mois avant l'echeance.");
  y += 6;

  // ── Article 3 — Conditions financieres ───────────────────────
  y = pb(doc, y, 65);
  y = articleTitle(doc, y, '3', 'CONDITIONS FINANCIERES');

  // Tableau loyer / charges / depot
  const finRows = data.depositAmount ? 3 : 2;
  const finH = finRows * 14 + 6;
  doc.setFillColor(...(PRIMARY as [number,number,number]));
  doc.roundedRect(8, y, W - 16, finH, 3, 3, 'F');
  doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Loyer mensuel', 18, y + 11);
  doc.text(fmtAmount(data.rentAmount), W - 12, y + 11, { align: 'right' });
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.2);
  doc.line(18, y + 14, W - 18, y + 14);
  doc.text('Charges mensuelles', 18, y + 25);
  doc.text(fmtAmount(data.chargesAmount), W - 12, y + 25, { align: 'right' });
  if (data.depositAmount) {
    doc.line(18, y + 28, W - 18, y + 28);
    doc.text('Depot de garantie', 18, y + 39);
    doc.text(fmtAmount(data.depositAmount), W - 12, y + 39, { align: 'right' });
  }
  y += finH + 3;

  // Total mensuel + jour de paiement
  doc.setFillColor(...LIGHT);
  doc.roundedRect(8, y, W - 16, 20, 2, 2, 'F');
  doc.setTextColor(...DARK); doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
  doc.text('Total mensuel (loyer + charges)', 14, y + 8);
  doc.text(fmtAmount(data.rentAmount + data.chargesAmount), W - 12, y + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY); doc.setFontSize(8);
  doc.text(`Paiement exigible le ${data.paymentDay} de chaque mois`, 14, y + 16);
  y += 26;

  // ── Articles personnalises ─────────────────────────────────────
  for (const art of articles) {
    if (['1', '2', '3', 'F'].includes(art.num)) continue;
    y = pb(doc, y, 35);
    y = articleTitle(doc, y, art.num, art.title.toUpperCase());
    if (art.content) y = renderContent(y, art.content);
    y += 6;
  }

  // ── Conditions speciales ──────────────────────────────────────
  if (data.specialConditions?.trim()) {
    y = pb(doc, y, 30);
    const scResolved = replaceVars(data.specialConditions, tplVars);
    const scLines = doc.splitTextToSize(scResolved, W - 36);
    const scBoxH = scLines.length * 5 + 16;
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(8, y, W - 16, scBoxH, 3, 3, 'F');
    doc.setFillColor(217, 119, 6);
    doc.roundedRect(8, y, 3, scBoxH, 1, 1, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 80, 0);
    doc.text('CONDITIONS SPECIALES', 18, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
    doc.text(scLines, 18, y + 14);
    y += scBoxH + 8;
  }

  // ── Conclusion ────────────────────────────────────────────────
  y = pb(doc, y, 35);
  const conclusionText = `Le present contrat est etabli en deux (2) exemplaires originaux ayant chacun valeur d'original, un remis a chaque partie. Il prend effet a la date de signature et regit les droits et obligations des parties pour la duree du bail mentionnee ci-dessus. Tout avenant devra faire l'objet d'un accord ecrit signe des deux parties.`;
  const concLines = doc.splitTextToSize(conclusionText, W - 36);
  const concBoxH = concLines.length * 5 + 16;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(8, y, W - 16, concBoxH, 3, 3, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY);
  doc.text('CONCLUSION', 18, y + 7);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
  doc.text(concLines, 18, y + 14);
  y += concBoxH + 8;

  // ── Signatures ────────────────────────────────────────────────
  y = pb(doc, y, 58);
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
  doc.text(`Fait a ____________, le ${new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}`, 12, y);
  y += 5;
  doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.text("Les soussignes reconnaissent avoir lu et accepte l'integralite des clauses du present contrat.", 12, y);
  y += 10;

  // Bloc Bailleur
  doc.setFillColor(...LIGHT); doc.roundedRect(8, y, 88, 38, 2, 2, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...(PRIMARY as [number,number,number]));
  doc.text('LE BAILLEUR', 52, y + 7, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
  const bailSigName = doc.splitTextToSize(baileurName, 76);
  doc.text(bailSigName[0], 52, y + 14, { align: 'center' });
  doc.setFontSize(7); doc.setTextColor(...GRAY);
  doc.text('Signature et cachet', 52, y + 33, { align: 'center' });

  // Bloc Locataire
  doc.setFillColor(...LIGHT); doc.roundedRect(108, y, 88, 38, 2, 2, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...(PRIMARY as [number,number,number]));
  doc.text('LE LOCATAIRE', 152, y + 7, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
  doc.text(data.tenantName, 152, y + 14, { align: 'center' });
  doc.setFontSize(7); doc.setTextColor(...GRAY);
  doc.text('Signature', 152, y + 33, { align: 'center' });

  // ── Footer sur toutes les pages ───────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) { doc.setPage(p); footer(doc, data.companyName); }

  doc.save(`contrat-bail-${data.tenantName.replace(/\s+/g, '-')}-${data.startDate}.pdf`);
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
  ownerName?: string | null;           // Nom du propriétaire (bailleur)
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyLogoUrl?: string | null;
  primaryColor?: string | null;
  customArticles?: ContractArticle[] | null;
  specialConditions?: string | null;
  contractTemplate?: any | null;
}) {
  const articles = data.customArticles || data.contractTemplate?.articles || null;
  const conditions = data.specialConditions || data.contractTemplate?.specialConditions || null;
  const preamble = data.contractTemplate?.preamble || undefined;
  return generateLeaseContract({
    ...data,
    ownerName: data.ownerName ?? undefined,
    preamble,
    depositAmount: data.depositAmount ?? undefined,
    customArticles: articles,
    specialConditions: conditions,
  });
}

// Alias pour compatibilité avec documents/page.tsx et payments/page.tsx
export const generateReceiptPDF = generateReceipt;

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
  primaryColor?: string | null;
}) {
  const JsPDF = await loadJsPDF();
  if (!JsPDF) return;
  setThemeColor(data.primaryColor);
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

  let y = await headerWithLogo(doc, 'TICKET DE MAINTENANCE', `N° ${data.ticketNumber}`, data.companyName, data.companyLogoUrl, data.primaryColor);

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
  if (data.estimatedCost !== undefined) y = row(doc, y, 'Coût estimé', fmtNum(data.estimatedCost) + ' F CFA', true);
  if (data.actualCost !== undefined)    y = row(doc, y, 'Coût réel', fmtNum(data.actualCost) + ' F CFA', false);
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
  primaryColor?: string | null;
}) {
  const JsPDF = await loadJsPDF();
  if (!JsPDF) return;
  setThemeColor(params.primaryColor);
  const doc = new (JsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  const typeLabel = params.type === 'entree' ? "ÉTAT DES LIEUX D'ENTRÉE" : "ÉTAT DES LIEUX DE SORTIE";
  let y = await headerWithLogo(doc, typeLabel, params.date, params.companyName, params.companyLogoUrl, params.primaryColor);

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
  primaryColor?: string | null;
}) {
  const JsPDF = await loadJsPDF();
  if (!JsPDF) return;
  setThemeColor(params.primaryColor);
  const doc = new (JsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  const { title, subtitle } = TERMINATION_LABELS[params.docType];
  let y = await headerWithLogo(doc, title, subtitle, params.companyName, params.companyLogoUrl, params.primaryColor);

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
  doc.setDrawColor(...(PRIMARY as [number,number,number]));
  doc.setLineWidth(0.5);
  doc.line(10, y, 10, y + 28);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...(PRIMARY as [number,number,number]));
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
    doc.text(('Loyer mensuel : ' + fmtNum(params.rentAmount) + ' F CFA'), 16, y + 14);
    if (params.depositReturned !== undefined) {
      doc.text(('Depot de garantie restitue : ' + fmtNum(params.depositReturned) + ' F CFA'), 16, y + 20);
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
  const rent = p.rentAmount ? fmtNum(p.rentAmount) : '0';
  switch (type) {
    case 'resiliation_contrat':
      return `Entre les soussignés,\n\n${p.companyName} (ci-après "le Bailleur") et ${p.tenantName} (ci-après "le Locataire"),\n\nIl a été convenu ce qui suit :\n\nLes parties conviennent de mettre fin au contrat de location portant sur le bien "${p.propertyName}", sis ${p.propertyAddress}, à compter du ${p.terminationDate}.\n\nLe contrat initial prenait effet le ${p.startDate} et devait s'achever le ${p.endDate}.\n\nLe Locataire s'engage à remettre les clés du logement au Bailleur au plus tard à la date de résiliation susmentionnée, et à laisser les lieux en bon état de propreté et d'entretien.\n\n${p.reason ? `Motif de résiliation : ${p.reason}` : ''}`;
    case 'resiliation_convention':
      return `Entre les soussignés,\n\n${p.companyName} et ${p.tenantName},\n\nLes parties conviennent de mettre fin à la convention relative au bien "${p.propertyName}" à compter du ${p.terminationDate}.\n\nTous les engagements découlant de cette convention sont réputés éteints à la date de résiliation, sous réserve du règlement de toutes sommes dues.\n\n${p.reason ? `Motif : ${p.reason}` : ''}`;
    case 'decharge':
      return `Je soussigné(e), ${p.tenantName}, déclare avoir reçu de ${p.companyName} l'ensemble des documents et clés relatifs au bien "${p.propertyName}", sis ${p.propertyAddress}.\n\nJe reconnais avoir pris connaissance des termes du contrat de location et m'engage à respecter toutes les obligations qui en découlent.\n\nJe décharge par la présente ${p.companyName} de toute responsabilité concernant l'état du bien à la date du ${p.terminationDate}.\n\nLoyer convenu : ${rent} F CFA/mois.`;
    case 'attestation_fin':
      return `Je soussigné(e), représentant de ${p.companyName}, atteste par la présente que :\n\n${p.tenantName} a occupé le bien immobilier "${p.propertyName}", sis ${p.propertyAddress}, du ${p.startDate} au ${p.endDate}.\n\nLe bail de location a pris fin le ${p.terminationDate}. Le Locataire a restitué les clés et libéré les lieux conformément aux dispositions contractuelles.\n\nLe loyer mensuel était de ${rent} F CFA. À ce jour, toutes les obligations financières ont été honorées.\n\nCette attestation est délivrée à ${p.tenantName} pour servir et valoir ce que de droit.`;
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