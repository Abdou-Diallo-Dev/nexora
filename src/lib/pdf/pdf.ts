// ─── Client-side PDF generation (jsPDF via CDN) ──────────────
import type { ContractArticle } from '@/types/contract';

declare global { interface Window { jspdf: any } }

async function getJsPDF() {
  if (typeof window === 'undefined') return null;
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  await new Promise<void>((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => res();
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.jspdf.jsPDF;
}

// Charge une image depuis une URL et retourne base64
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

function money(n: number | null | undefined): string {
  const num = Number(n) || 0;
  const s = Math.round(num).toString();
  let r = '';
  for (let i = 0; i < s.length; i++) {
    const pos = s.length - 1 - i;
    if (i > 0 && i % 3 === 0) r = ' ' + r;
    r = s[pos] + r;
  }
  return r + ' FCFA';
}

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const W = 210;
const MARGIN = 14;
const COL = 75;

const C = {
  primary:   [37, 99, 235]    as [number,number,number],
  dark:      [15, 23, 42]     as [number,number,number],
  gray:      [100, 116, 139]  as [number,number,number],
  light:     [241, 245, 249]  as [number,number,number],
  white:     [255, 255, 255]  as [number,number,number],
  green:     [22, 163, 74]    as [number,number,number],
  border:    [226, 232, 240]  as [number,number,number],
  headerBg:  [30, 64, 175]    as [number,number,number],
  sectionBg: [239, 246, 255]  as [number,number,number],
};

function setFont(doc: any, size: number, style: 'normal'|'bold'|'italic' = 'normal', color = C.dark) {
  doc.setFontSize(size); doc.setFont('helvetica', style); doc.setTextColor(...color);
}

function drawPageBorder(doc: any) {
  doc.setDrawColor(...C.border); doc.setLineWidth(0.4);
  doc.rect(6, 6, W - 12, doc.internal.pageSize.getHeight() - 12);
}

// ── Header avec logo optionnel ────────────────────────────────
async function drawHeaderWithLogo(
  doc: any,
  companyName: string,
  companyAddress?: string,
  companyEmail?: string,
  logoUrl?: string | null,
  title = "CONTRAT DE BAIL D'HABITATION",
  subtitle = 'Conforme aux pratiques immobilières du Sénégal'
): Promise<number> {
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, W, 38, 'F');

  if (logoUrl) {
    const img = await loadImageAsBase64(logoUrl);
    if (img) {
      try {
        doc.addImage(img.data, img.format, 8, 5, 26, 26);
      } catch {
        // fallback cercle
        drawLogoCircle(doc, companyName);
      }
    } else {
      drawLogoCircle(doc, companyName);
    }
  } else {
    drawLogoCircle(doc, companyName);
  }

  doc.setTextColor(...C.white);
  doc.setFontSize(15); doc.setFont('helvetica','bold');
  doc.text(title, 38, 15);
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text(subtitle, 38, 23);

  doc.setFontSize(8);
  doc.text(companyName, W - 10, 12, { align: 'right' });
  if (companyAddress) doc.text(companyAddress, W - 10, 18, { align: 'right' });
  if (companyEmail)   doc.text(companyEmail,   W - 10, 24, { align: 'right' });

  return 46;
}

function drawLogoCircle(doc: any, companyName: string) {
  doc.setFillColor(...C.white);
  doc.circle(20, 19, 9, 'F');
  doc.setTextColor(...C.primary);
  doc.setFontSize(9); doc.setFont('helvetica','bold');
  const initials = companyName.split(' ').map((w: string) => w[0]).join('').substring(0,2).toUpperCase();
  doc.text(initials || 'IG', 20, 22, { align: 'center' });
}

function drawFooter(doc: any, pageNum: number, totalPages: number, companyName = 'Nexora Immo') {
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...C.light);
  doc.rect(0, H - 14, W, 14, 'F');
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.line(0, H - 14, W, H - 14);
  setFont(doc, 7, 'normal', C.gray);
  doc.text(companyName + ' — Gestion Immobilière Professionnelle', MARGIN, H - 6);
  doc.text(`Page ${pageNum} / ${totalPages}`, W - MARGIN, H - 6, { align: 'right' });
  doc.text('Document généré électroniquement — Valide avec signatures des deux parties', W / 2, H - 6, { align: 'center' });
}

function drawArticleTitle(doc: any, y: number, num: string, title: string): number {
  doc.setFillColor(...C.sectionBg); doc.rect(MARGIN, y, W - MARGIN * 2, 10, 'F');
  doc.setFillColor(...C.primary);  doc.rect(MARGIN, y, 3, 10, 'F');
  setFont(doc, 9.5, 'bold', C.primary);
  doc.text(`Article ${num} — ${title.toUpperCase()}`, MARGIN + 7, y + 7);
  return y + 16;
}

function drawKeyValue(doc: any, y: number, label: string, value: string, shade = false): number {
  if (shade) {
    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, y - 4, W - MARGIN * 2, 8, 'F');
  }
  setFont(doc, 8.5, 'normal', C.gray);
  doc.text(label + ' :', MARGIN + 3, y);
  setFont(doc, 8.5, 'bold', C.dark);
  const lines = doc.splitTextToSize(value, W - COL - MARGIN - 5);
  doc.text(lines, COL, y);
  return y + Math.max(8, lines.length * 5.5);
}

function drawParagraph(doc: any, y: number, text: string, indent = 0): number {
  setFont(doc, 8.5, 'normal', C.dark);
  const lines = doc.splitTextToSize(text, W - MARGIN * 2 - indent - 4);
  doc.text(lines, MARGIN + 3 + indent, y);
  return y + lines.length * 5.5 + 2;
}

function drawBullet(doc: any, y: number, text: string): number {
  doc.setFillColor(...C.primary);
  doc.circle(MARGIN + 7, y - 1.5, 1.2, 'F');
  setFont(doc, 8.5, 'normal', C.dark);
  const lines = doc.splitTextToSize(text, W - MARGIN * 2 - 14);
  doc.text(lines, MARGIN + 11, y);
  return y + lines.length * 5.5 + 1.5;
}

function numberToWords(n: number): string {
  if (n === 0) return 'zéro';
  const units = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf',
    'dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
  const tens = ['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
  function below1000(num: number): string {
    if (num === 0) return '';
    if (num < 20) return units[num];
    if (num < 100) {
      const t = Math.floor(num / 10), u = num % 10;
      if (t === 7) return 'soixante-' + units[10 + u];
      if (t === 9) return 'quatre-vingt-' + (u === 0 ? '' : units[u]).replace(/^-/,'');
      if (t === 8) return u === 0 ? 'quatre-vingts' : 'quatre-vingt-' + units[u];
      return tens[t] + (u === 1 && t !== 8 ? '-et-' : u === 0 ? '' : '-') + (u === 0 ? '' : units[u]);
    }
    const h = Math.floor(num / 100), rest = num % 100;
    const hStr = h === 1 ? 'cent' : units[h] + '-cent' + (rest === 0 && h > 1 ? 's' : '');
    return hStr + (rest === 0 ? '' : '-' + below1000(rest));
  }
  let result = '';
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const remainder = n % 1000;
  if (millions > 0) result += (millions === 1 ? 'un-million' : below1000(millions) + '-millions') + '-';
  if (thousands > 0) result += (thousands === 1 ? 'mille' : below1000(thousands) + '-mille') + '-';
  if (remainder > 0) result += below1000(remainder);
  result = result.replace(/-+$/,'').replace(/-+/g,'-');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function moneyInWords(n: number): string {
  return numberToWords(n) + ' francs CFA';
}

// ─── QUITTANCE DE LOYER ───────────────────────────────────────
export async function generateReceiptPDF(data: {
  ref: string;
  tenantName: string;
  tenantPhone?: string;
  tenantEmail?: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity?: string;
  propertyType?: string;
  periodMonth: number;
  periodYear: number;
  amount: number;
  chargesAmount: number;
  paidDate?: string | null;
  paymentMethod: string;
  reference?: string | null;
  status: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogoUrl?: string | null;
}) {
  const JsPDF = await getJsPDF();
  if (!JsPDF) return;
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const MONTHS_FR = ['Janvier','Fevrier','Mars','Avril','Mai','Juin',
    'Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
  const period = MONTHS_FR[data.periodMonth - 1] + ' ' + data.periodYear;
  const quittRef = data.reference || ('QUITT-' + data.periodYear + '-' + String(data.periodMonth).padStart(2,'0') + '-001');
  const emissionDate = fmt(new Date().toISOString());
  const total = data.amount + data.chargesAmount;
  const TW = W - MARGIN * 2;
  const H = doc.internal.pageSize.getHeight();

  const PROP_TYPES: Record<string,string> = {
    apartment:'Appartement', house:'Villa / Maison', studio:'Studio',
    commercial:'Local commercial', office:'Bureau', warehouse:'Entrepot', land:'Terrain',
  };
  const propTypeLabel = PROP_TYPES[data.propertyType || 'apartment'] || 'Appartement';
  const METHOD_LABELS: Record<string,string> = {
    cash:'Especes', bank_transfer:'Virement bancaire', wave:'Wave (Mobile Money)',
    orange_money:'Orange Money', free_money:'Free Money', check:'Cheque',
  };
  const methodLabel = METHOD_LABELS[data.paymentMethod] || data.paymentMethod;

  doc.setDrawColor(...C.primary); doc.setLineWidth(1.5);
  doc.rect(5, 5, W - 10, H - 10);
  doc.setLineWidth(0.4); doc.rect(8, 8, W - 16, H - 16);

  // Bandeau avec logo
  doc.setFillColor(...C.headerBg); doc.rect(5, 5, W - 10, 32, 'F');
  if (data.companyLogoUrl) {
    const img = await loadImageAsBase64(data.companyLogoUrl);
    if (img) { try { doc.addImage(img.data, img.format, 9, 7, 24, 24); } catch { drawLogoCircle(doc, data.companyName); } }
    else { drawLogoCircle(doc, data.companyName); }
  } else { drawLogoCircle(doc, data.companyName); }

  doc.setTextColor(...C.white);
  doc.setFontSize(20); doc.setFont('helvetica','bold');
  doc.text('QUITTANCE DE LOYER', W / 2, 19, { align: 'center' });
  doc.setFontSize(8.5); doc.setFont('helvetica','normal');
  doc.text(data.companyName + '  -  Periode : ' + period, W / 2, 28, { align: 'center' });

  if (data.status === 'paid') {
    doc.setFillColor(...C.green); doc.roundedRect(W - 44, 10, 36, 11, 2, 2, 'F');
    doc.setTextColor(...C.white); doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.text('PAYE', W - 26, 17, { align: 'center' });
  }

  let y = 42;

  function qSec(num: string, title: string) {
    doc.setFillColor(...C.sectionBg); doc.rect(MARGIN, y, TW, 8, 'F');
    doc.setFillColor(...C.primary);  doc.rect(MARGIN, y, 3, 8, 'F');
    doc.setTextColor(...C.primary); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    doc.text(num + '. ' + title, MARGIN + 6, y + 5.8);
    y += 9;
  }

  function qRow(label: string, val: string, shade: boolean) {
    if (shade) { doc.setFillColor(248, 250, 252); doc.rect(MARGIN, y, TW, 7, 'F'); }
    doc.setTextColor(...C.gray); doc.setFontSize(8); doc.setFont('helvetica','normal');
    doc.text(label + ' :', MARGIN + 4, y + 5);
    doc.setTextColor(...C.dark); doc.setFont('helvetica','bold');
    const lines = doc.splitTextToSize(String(val), TW - 68);
    doc.text(lines, MARGIN + 68, y + 5);
    y += (lines.length > 1 ? lines.length * 5 + 1 : 7);
  }

  qSec('1', 'Informations Bailleur');
  qRow('Nom / Agence', data.companyName, false);
  if (data.companyAddress) qRow('Adresse', data.companyAddress, true);
  if (data.companyPhone)   qRow('Telephone', data.companyPhone, false);
  if (data.companyEmail)   qRow('Email', data.companyEmail, true);
  y += 2;

  qSec('2', 'Reference Quittance');
  doc.setFillColor(...C.sectionBg); doc.rect(MARGIN, y, TW, 13, 'F');
  doc.setTextColor(...C.gray); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.text('Numero :', MARGIN + 4, y + 5);
  doc.text('Date emission :', MARGIN + 100, y + 5);
  doc.setTextColor(...C.primary); doc.setFontSize(9); doc.setFont('helvetica','bold');
  doc.text(quittRef, MARGIN + 4, y + 11);
  doc.setTextColor(...C.dark); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
  doc.text(emissionDate, MARGIN + 100, y + 11);
  y += 16;

  qSec('3', 'Informations du Locataire');
  qRow('Nom', data.tenantName, false);
  if (data.tenantPhone) qRow('Telephone', data.tenantPhone, true);
  if (data.tenantEmail) qRow('Email', data.tenantEmail, false);
  y += 2;

  qSec('4', 'Bien Loue');
  qRow('Type', propTypeLabel, false);
  qRow('Designation', data.propertyName, true);
  qRow('Adresse', data.propertyAddress, false);
  if (data.propertyCity) qRow('Ville', data.propertyCity, true);
  y += 2;

  qSec('5', 'Detail du Paiement');
  qRow('Periode', period, false);
  if (data.paidDate) qRow('Date de paiement', fmt(data.paidDate), true);
  qRow('Mode de paiement', methodLabel, !data.paidDate);
  y += 2;

  qSec('6', 'Detail Financier');
  const RH = 8;
  doc.setFillColor(...C.primary); doc.rect(MARGIN, y, TW, RH, 'F');
  doc.setTextColor(...C.white); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('Designation', MARGIN + 5, y + 5.5);
  doc.text('Montant', W - MARGIN - 5, y + 5.5, { align: 'right' });
  y += RH;
  doc.setFillColor(248,250,252); doc.rect(MARGIN, y, TW, RH, 'F');
  doc.setDrawColor(...C.border); doc.setLineWidth(0.2); doc.rect(MARGIN, y, TW, RH, 'S');
  doc.setTextColor(...C.dark); doc.setFontSize(8.5); doc.setFont('helvetica','normal');
  doc.text('Loyer', MARGIN + 5, y + 5.5);
  doc.setFont('helvetica','bold');
  doc.text(money(data.amount), W - MARGIN - 5, y + 5.5, { align: 'right' });
  y += RH;
  doc.setFillColor(255,255,255); doc.rect(MARGIN, y, TW, RH, 'F');
  doc.rect(MARGIN, y, TW, RH, 'S');
  doc.setFont('helvetica','normal');
  doc.text('Charges', MARGIN + 5, y + 5.5);
  doc.setFont('helvetica','bold');
  doc.text(money(data.chargesAmount), W - MARGIN - 5, y + 5.5, { align: 'right' });
  y += RH;
  doc.setFillColor(...C.primary); doc.rect(MARGIN, y, TW, RH + 2, 'F');
  doc.setTextColor(...C.white); doc.setFontSize(10); doc.setFont('helvetica','bold');
  doc.text('Total paye', MARGIN + 5, y + 7);
  doc.text(money(total), W - MARGIN - 5, y + 7, { align: 'right' });
  y += RH + 6;

  qSec('7', 'Mention Legale');
  const amtWordsCap = moneyInWords(total).charAt(0).toUpperCase() + moneyInWords(total).slice(1);
  const mentionTxt = 'Je soussigne(e) ' + data.companyName + ', reconnais avoir recu de Monsieur/Madame '
    + data.tenantName + ' la somme de ' + amtWordsCap + ' (' + money(total) + ')'
    + ' au titre du paiement du loyer pour la periode de ' + period + '.';
  doc.setFillColor(239, 246, 255);
  const mLines = doc.splitTextToSize(mentionTxt, TW - 10);
  const mH = mLines.length * 5 + 10;
  doc.rect(MARGIN, y, TW, mH, 'F');
  doc.setFillColor(...C.primary); doc.rect(MARGIN, y, 3, mH, 'F');
  doc.setTextColor(20, 50, 120); doc.setFontSize(8.5); doc.setFont('helvetica','italic');
  doc.text(mLines, MARGIN + 6, y + 7);
  y += mH + 4;

  qSec('8', 'Signature du Bailleur');
  doc.setTextColor(...C.dark); doc.setFontSize(8.5); doc.setFont('helvetica','normal');
  doc.text('Fait a ' + (data.propertyCity || 'Dakar') + ', le ' + emissionDate, MARGIN + 3, y + 1);
  y += 6;
  doc.setDrawColor(...C.primary); doc.setLineWidth(0.8);
  doc.roundedRect(MARGIN, y, 78, 24, 2, 2, 'S');
  doc.setTextColor(...C.primary); doc.setFontSize(7.5); doc.setFont('helvetica','bold');
  doc.text('Signature du bailleur', MARGIN + 39, y + 7, { align: 'center' });
  doc.setTextColor(...C.gray); doc.setFont('helvetica','normal');
  doc.text(data.companyName, MARGIN + 39, y + 13, { align: 'center' });
  doc.setDrawColor(...C.border); doc.setLineWidth(0.4);
  doc.line(MARGIN + 5, y + 20, MARGIN + 73, y + 20);

  // Footer avec nom entreprise
  doc.setFillColor(...C.headerBg);
  doc.rect(5, H - 15, W - 10, 10, 'F');
  doc.setTextColor(...C.white); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
  doc.text(data.companyName + ' - Gestion Immobiliere Professionnelle', W / 2, H - 8, { align: 'center' });
  doc.text('Document conforme aux pratiques immobilieres du Senegal', W / 2, H - 3.5, { align: 'center' });

  doc.save('quittance-' + data.periodYear + '-' + String(data.periodMonth).padStart(2,'0')
    + '-' + data.tenantName.replace(/\s+/g, '-').toLowerCase() + '.pdf');
}

// ─── ARTICLES PAR DEFAUT ─────────────────────────────────────
const DEFAULT_ARTICLES: ContractArticle[] = [
  { num: '1', title: 'Identification des parties',      content: '' }, // géré séparément
  { num: '2', title: 'Objet du contrat',                content: "Le bailleur donne a loyer au locataire pour usage d'habitation uniquement le logement designe." },
  { num: '3', title: 'Duree du bail',                   content: "A l'echeance, le bail est tacitement reconduit par periodes d'un (1) an, sauf denonciation par lettre recommandee un (1) mois avant." },
  { num: '4', title: 'Loyer et conditions financieres', content: '' }, // tableau géré séparément
  { num: '5', title: 'Etat des lieux',                  content: "Un etat des lieux contradictoire sera etabli a l'entree et a la sortie du locataire." },
  { num: '6', title: 'Obligations du locataire',        content: "- Payer le loyer et charges a la date convenue.\n- User paisiblement du logement.\n- Entretenir le logement.\n- Ne pas sous-louer sans autorisation.\n- Souscrire une assurance habitation." },
  { num: '7', title: 'Obligations du bailleur',         content: "- Delivrer un logement en bon etat.\n- Garantir la jouissance paisible.\n- Effectuer les grosses reparations." },
  { num: '8', title: 'Resiliation du bail',             content: "- Locataire : preavis d'un (1) mois par lettre recommandee.\n- Bailleur : preavis de trois (3) mois.\n- Depot de garantie restitue sous un (1) mois." },
  { num: '9', title: 'Penalites de retard',             content: "Tout retard au-dela de dix (10) jours entraine une penalite de 5% du loyer mensuel." },
  { num: '10', title: 'Reglement des litiges',          content: "Tout litige sera soumis au Tribunal competent du Senegal apres tentative amiable de 30 jours." },
];

// ─── CONTRAT DE BAIL ─────────────────────────────────────────
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
  // ── Nouveaux paramètres automatiques ──
  companyLogoUrl?: string | null;
  customArticles?: ContractArticle[] | null;
  specialConditions?: string | null;
}) {
  const JsPDF = await getJsPDF();
  if (!JsPDF) return;
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const H = doc.internal.pageSize.getHeight();
  const TW = W - MARGIN * 2;
  const deposit = data.depositAmount ?? data.rentAmount * 2;
  const totalMonthly = data.rentAmount + data.chargesAmount;
  const emissionDate = fmt(new Date().toISOString());

  const PROP_TYPES: Record<string,string> = {
    apartment:'Appartement', house:'Villa / Maison', studio:'Studio',
    commercial:'Local commercial', office:'Bureau', warehouse:'Entrepot', land:'Terrain',
  };
  const propTypeLabel = PROP_TYPES[data.propertyType || 'apartment'] || 'Appartement';

  // Articles à utiliser : personnalisés ou défaut
  const articles = data.customArticles?.length ? data.customArticles : DEFAULT_ARTICLES;

  function cSec(yRef: number, num: string, title: string): number {
    doc.setFillColor(...C.sectionBg); doc.rect(MARGIN, yRef, TW, 8, 'F');
    doc.setFillColor(...C.primary);  doc.rect(MARGIN, yRef, 3, 8, 'F');
    doc.setTextColor(...C.primary); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    doc.text('Art. ' + num + ' - ' + title.toUpperCase(), MARGIN + 6, yRef + 5.8);
    return yRef + 10;
  }

  function cRow(yRef: number, label: string, val: string, shade: boolean): number {
    if (shade) { doc.setFillColor(248, 250, 252); doc.rect(MARGIN, yRef, TW, 7, 'F'); }
    doc.setTextColor(...C.gray); doc.setFontSize(8); doc.setFont('helvetica','normal');
    doc.text(label + ' :', MARGIN + 4, yRef + 5);
    doc.setTextColor(...C.dark); doc.setFont('helvetica','bold');
    const lines = doc.splitTextToSize(String(val), TW - 68);
    doc.text(lines, MARGIN + 68, yRef + 5);
    return yRef + (lines.length > 1 ? lines.length * 5 + 1 : 7);
  }

  function cPara(yRef: number, text: string): number {
    doc.setTextColor(...C.dark); doc.setFontSize(8); doc.setFont('helvetica','normal');
    const lines = doc.splitTextToSize(text, TW - 4);
    doc.text(lines, MARGIN + 3, yRef);
    return yRef + lines.length * 4.8 + 2;
  }

  function cBullet(yRef: number, text: string): number {
    doc.setFillColor(...C.primary);
    doc.circle(MARGIN + 5.5, yRef - 0.5, 1, 'F');
    doc.setTextColor(...C.dark); doc.setFontSize(8); doc.setFont('helvetica','normal');
    const lines = doc.splitTextToSize(text, TW - 14);
    doc.text(lines, MARGIN + 9, yRef);
    return yRef + lines.length * 4.8 + 1.5;
  }

  function pb(yRef: number, needed: number): number {
    if (yRef > H - needed - 16) {
      doc.addPage();
      drawPageBorder(doc);
      return 16;
    }
    return yRef;
  }

  // ── Rendu d'un article personnalisé ──────────────────────────
  function renderArticleContent(yRef: number, content: string): number {
    let y = yRef;
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { y += 3; continue; }
      y = pb(y, 15);
      if (trimmed.startsWith('- ')) {
        y = cBullet(y, trimmed.slice(2));
      } else {
        y = cPara(y, trimmed);
      }
    }
    return y;
  }

  // ══ PAGE 1 ══════════════════════════════════════════════════
  drawPageBorder(doc);
  let y = await drawHeaderWithLogo(doc, data.companyName, data.companyAddress, data.companyEmail, data.companyLogoUrl);

  // Bandeau dates
  doc.setFillColor(...C.light); doc.rect(MARGIN, y, TW, 12, 'F');
  doc.setTextColor(...C.gray); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.text('Date de signature :', MARGIN + 4, y + 4.5);
  doc.text('Ville :', MARGIN + 78, y + 4.5);
  const dureeStr = 'Du ' + fmt(data.startDate) + ' au ' + fmt(data.endDate);
  doc.text(dureeStr, W - MARGIN - 4, y + 4.5, { align: 'right' });
  doc.setTextColor(...C.dark); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
  doc.text(emissionDate, MARGIN + 4, y + 10.5);
  doc.text(data.propertyCity, MARGIN + 78, y + 10.5);
  y += 15;

  // ── Parties (toujours fixe) ──────────────────────────────────
  y = cSec(y, '0', 'Identification des parties');
  doc.setTextColor(...C.primary); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('BAILLEUR', MARGIN + 3, y + 1); y += 7;
  y = cRow(y, 'Nom / Societe', data.companyName, false);
  if (data.companyAddress) y = cRow(y, 'Adresse', data.companyAddress, true);
  if (data.companyPhone)   y = cRow(y, 'Telephone', data.companyPhone, false);
  if (data.companyEmail)   y = cRow(y, 'Email', data.companyEmail, true);
  y += 2;
  doc.setTextColor(...C.primary); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('LOCATAIRE', MARGIN + 3, y + 1); y += 7;
  y = cRow(y, 'Nom complet', data.tenantName, false);
  if (data.tenantPhone) y = cRow(y, 'Telephone', data.tenantPhone, true);
  if (data.tenantEmail) y = cRow(y, 'Email', data.tenantEmail, false);
  y += 4;

  // ── Tableau financier (toujours fixe) ───────────────────────
  y = pb(y, 55);
  y = cSec(y, 'F', 'Loyer et conditions financieres');
  const RH = 8;
  doc.setFillColor(...C.primary); doc.rect(MARGIN, y, TW, RH, 'F');
  doc.setTextColor(...C.white); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('Designation', MARGIN + 5, y + 5.5);
  doc.text('Montant mensuel', W - MARGIN - 5, y + 5.5, { align: 'right' });
  y += RH;
  const rows = [
    ['Loyer mensuel', money(data.rentAmount)],
    ['Charges mensuelles', money(data.chargesAmount)],
    ['Depot de garantie', money(deposit)],
  ];
  rows.forEach(([label, val], i) => {
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
    doc.rect(MARGIN, y, TW, RH, 'F');
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2); doc.rect(MARGIN, y, TW, RH, 'S');
    doc.setTextColor(...C.dark); doc.setFontSize(8.5); doc.setFont('helvetica','normal');
    doc.text(label, MARGIN + 5, y + 5.5);
    doc.setFont('helvetica','bold');
    doc.text(val, W - MARGIN - 5, y + 5.5, { align: 'right' });
    y += RH;
  });
  doc.setFillColor(...C.primary); doc.rect(MARGIN, y, TW, RH + 2, 'F');
  doc.setTextColor(...C.white); doc.setFontSize(9.5); doc.setFont('helvetica','bold');
  doc.text('TOTAL MENSUEL', MARGIN + 5, y + 6.5);
  doc.text(money(totalMonthly), W - MARGIN - 5, y + 6.5, { align: 'right' });
  y += RH + 5;
  y = cRow(y, 'Jour de paiement', 'Le ' + data.paymentDay + ' de chaque mois', false);
  y = cRow(y, 'Modes acceptes', 'Especes, Virement, Wave, Orange Money, Free Money', true);
  y += 4;

  // ── Articles personnalisés ou par défaut ─────────────────────
  for (const art of articles) {
    if (art.num === '0' || !art.content) continue; // parties et finance déjà rendus
    y = pb(y, 30);
    y = cSec(y, art.num, art.title);
    y = renderArticleContent(y, art.content);
    y += 3;
  }

  // ── Conditions spéciales ─────────────────────────────────────
  if (data.specialConditions?.trim()) {
    y = pb(y, 30);
    y = cSec(y, 'CS', 'Conditions speciales');
    y = renderArticleContent(y, data.specialConditions);
    y += 3;
  }

  // ── Signatures ───────────────────────────────────────────────
  y = pb(y, 56);
  y = cSec(y, 'S', 'Signatures');
  doc.setTextColor(...C.dark); doc.setFontSize(8.5); doc.setFont('helvetica','normal');
  doc.text('Fait a ' + data.propertyCity + ', le ' + emissionDate, MARGIN + 3, y);
  y += 3;
  doc.setTextColor(...C.gray); doc.setFontSize(8); doc.setFont('helvetica','italic');
  doc.text("Les soussignes reconnaissent avoir lu et accepte l'integralite des clauses du present contrat.", MARGIN + 3, y);
  y += 8;

  const sigW = (TW - 8) / 2;
  // Logo dans zone signature bailleur si disponible
  if (data.companyLogoUrl) {
    const img = await loadImageAsBase64(data.companyLogoUrl);
    doc.setFillColor(...C.sectionBg); doc.roundedRect(MARGIN, y, sigW, 42, 2, 2, 'F');
    doc.setDrawColor(...C.primary); doc.setLineWidth(0.6); doc.roundedRect(MARGIN, y, sigW, 42, 2, 2, 'S');
    doc.setTextColor(...C.primary); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    doc.text('LE BAILLEUR', MARGIN + sigW/2, y + 7, { align: 'center' });
    if (img) { try { doc.addImage(img.data, img.format, MARGIN + sigW/2 - 10, y + 10, 20, 14); } catch {} }
    doc.setTextColor(...C.gray); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
    doc.text(data.companyName, MARGIN + sigW/2, y + 28, { align: 'center' });
    doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
    doc.line(MARGIN + 5, y + 37, MARGIN + sigW - 5, y + 37);
  } else {
    doc.setFillColor(...C.sectionBg); doc.roundedRect(MARGIN, y, sigW, 36, 2, 2, 'F');
    doc.setDrawColor(...C.primary); doc.setLineWidth(0.6); doc.roundedRect(MARGIN, y, sigW, 36, 2, 2, 'S');
    doc.setTextColor(...C.primary); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    doc.text('LE BAILLEUR', MARGIN + sigW/2, y + 8, { align: 'center' });
    doc.setTextColor(...C.gray); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
    doc.text(data.companyName, MARGIN + sigW/2, y + 14, { align: 'center' });
    doc.text('Signature et cachet :', MARGIN + sigW/2, y + 20, { align: 'center' });
    doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
    doc.line(MARGIN + 5, y + 31, MARGIN + sigW - 5, y + 31);
  }

  const sig2X = MARGIN + sigW + 8;
  const sigH = data.companyLogoUrl ? 42 : 36;
  doc.setFillColor(...C.sectionBg); doc.roundedRect(sig2X, y, sigW, sigH, 2, 2, 'F');
  doc.setDrawColor(...C.primary); doc.setLineWidth(0.6); doc.roundedRect(sig2X, y, sigW, sigH, 2, 2, 'S');
  doc.setTextColor(...C.primary); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
  doc.text('LE LOCATAIRE', sig2X + sigW/2, y + 8, { align: 'center' });
  doc.setTextColor(...C.gray); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.text(data.tenantName, sig2X + sigW/2, y + 14, { align: 'center' });
  doc.text('Lu et approuve :', sig2X + sigW/2, y + 20, { align: 'center' });
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.line(sig2X + 5, y + sigH - 5, sig2X + sigW - 5, y + sigH - 5);
  y += sigH + 6;

  doc.setFillColor(239,246,255);
  doc.roundedRect(MARGIN, y, TW, 11, 2, 2, 'F');
  doc.setTextColor(...C.gray); doc.setFontSize(7); doc.setFont('helvetica','italic');
  doc.text('Contrat etabli conformement aux pratiques immobilieres du Senegal - ' + emissionDate, W/2, y + 7, { align: 'center' });

  // Footers sur toutes les pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages, data.companyName);
  }

  doc.save('contrat-bail-' + data.tenantName.replace(/\s+/g,'-').toLowerCase() + '-' + data.startDate + '.pdf');
}

// ─── TICKET DE MAINTENANCE ────────────────────────────────────
export async function generateMaintenancePDF(data: {
  ticketRef: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  propertyName: string;
  propertyAddress?: string;
  tenantName?: string | null;
  scheduledDate?: string | null;
  completedDate?: string | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  notes?: string | null;
  createdAt: string;
  companyName: string;
  companyLogoUrl?: string | null;
}) {
  const JsPDF = await getJsPDF();
  if (!JsPDF) return;
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawPageBorder(doc);

  const PRIORITY_COLORS: Record<string,[number,number,number]> = {
    low:[59,130,246], medium:[234,179,8], high:[234,88,12], urgent:[220,38,38],
  };
  const STATUS_COLORS: Record<string,[number,number,number]> = {
    open:[220,38,38], in_progress:[234,88,12], resolved:[22,163,74], closed:[100,116,139],
  };
  const PRIORITY_LABELS: Record<string,string> = { low:'Faible', medium:'Moyen', high:'Élevé', urgent:'URGENT' };
  const STATUS_LABELS: Record<string,string> = { open:'Ouvert', in_progress:'En cours', resolved:'Résolu', closed:'Fermé' };
  const CAT_LABELS: Record<string,string> = {
    plumbing:'Plomberie', electricity:'Électricité', hvac:'Climatisation',
    structural:'Structure', appliance:'Électroménager', pest_control:'Nuisibles', other:'Autre',
  };

  doc.setFillColor(...C.headerBg); doc.rect(0, 0, W, 32, 'F');
  if (data.companyLogoUrl) {
    const img = await loadImageAsBase64(data.companyLogoUrl);
    if (img) { try { doc.addImage(img.data, img.format, 8, 4, 22, 22); } catch { drawLogoCircle(doc, data.companyName); } }
    else { drawLogoCircle(doc, data.companyName); }
  } else { drawLogoCircle(doc, data.companyName); }

  doc.setTextColor(...C.white); doc.setFontSize(15); doc.setFont('helvetica','bold');
  doc.text('TICKET DE MAINTENANCE', 34, 14);
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text(`Ref : ${data.ticketRef}  .  ${data.companyName}`, 34, 22);

  let y = 40;

  const sc = STATUS_COLORS[data.status] || C.gray;
  const pc = PRIORITY_COLORS[data.priority] || [234,179,8] as [number,number,number];
  doc.setFillColor(...sc); doc.roundedRect(MARGIN, y, 60, 9, 2, 2, 'F');
  setFont(doc, 8.5, 'bold', C.white);
  doc.text(`Statut : ${STATUS_LABELS[data.status] || data.status}`, MARGIN + 30, y + 6.5, { align: 'center' });
  doc.setFillColor(...pc); doc.roundedRect(MARGIN + 64, y, 60, 9, 2, 2, 'F');
  doc.text(`Priorite : ${PRIORITY_LABELS[data.priority] || data.priority}`, MARGIN + 94, y + 6.5, { align: 'center' });
  setFont(doc, 7.5, 'normal', C.gray);
  doc.text(`Cree le : ${fmt(data.createdAt)}`, W - MARGIN, y + 6.5, { align: 'right' });
  y += 16;

  doc.setFillColor(...C.light); doc.roundedRect(MARGIN, y, W - MARGIN*2, 13, 2, 2, 'F');
  setFont(doc, 12, 'bold', C.dark);
  const titleLines = doc.splitTextToSize(data.title, W - MARGIN*2 - 8);
  doc.text(titleLines, MARGIN + 5, y + 8);
  y += 20;

  y = drawArticleTitle(doc, y, '1', 'Informations');
  y = drawKeyValue(doc, y, 'Bien', data.propertyName, false);
  if (data.propertyAddress) y = drawKeyValue(doc, y, 'Adresse', data.propertyAddress, true);
  if (data.tenantName)      y = drawKeyValue(doc, y, 'Locataire', data.tenantName, false);
  y = drawKeyValue(doc, y, 'Categorie', CAT_LABELS[data.category] || data.category, !!data.tenantName);
  if (data.scheduledDate)   y = drawKeyValue(doc, y, 'Date planifiee', fmt(data.scheduledDate), false);
  if (data.completedDate)   y = drawKeyValue(doc, y, 'Date de cloture', fmt(data.completedDate), true);
  if (data.estimatedCost != null) y = drawKeyValue(doc, y, 'Cout estime', money(data.estimatedCost), false);
  if (data.actualCost != null)    y = drawKeyValue(doc, y, 'Cout reel', money(data.actualCost), true);
  y += 4;

  if (data.description) {
    y = drawArticleTitle(doc, y, '2', 'Description du probleme');
    y = drawParagraph(doc, y, data.description);
    y += 4;
  }

  if (data.notes) {
    y = drawArticleTitle(doc, y, '3', 'Notes de suivi');
    doc.setFillColor(255, 251, 235);
    const nLines = doc.splitTextToSize(data.notes, W - MARGIN*2 - 10);
    doc.roundedRect(MARGIN, y - 2, W - MARGIN*2, nLines.length * 5.5 + 10, 2, 2, 'F');
    setFont(doc, 8.5, 'normal', [120, 80, 0]);
    doc.text(nLines, MARGIN + 5, y + 5);
    y += nLines.length * 5.5 + 14;
  }

  y = drawArticleTitle(doc, y, data.notes ? '4' : '3', 'Suivi de progression');
  const steps = [
    { l:'Ouvert',   done: true },
    { l:'En cours', done: ['in_progress','resolved','closed'].includes(data.status) },
    { l:'Resolu',   done: ['resolved','closed'].includes(data.status) },
    { l:'Ferme',    done: data.status === 'closed' },
  ];
  const sw = (W - MARGIN*2) / steps.length;
  steps.forEach((s, i) => {
    const cx = MARGIN + i * sw + sw / 2;
    doc.setFillColor(...(s.done ? C.primary : C.border));
    doc.circle(cx, y + 6, 5.5, 'F');
    setFont(doc, 9, 'bold', s.done ? C.white : C.gray);
    doc.text(s.done ? 'v' : String(i+1), cx, y + 9, { align: 'center' });
    if (i < steps.length - 1) {
      doc.setDrawColor(...(steps[i+1].done ? C.primary : C.border));
      doc.setLineWidth(1.5);
      doc.line(cx + 5.5, y + 6, cx + sw - 5.5, y + 6);
    }
    setFont(doc, 7.5, s.done ? 'bold' : 'normal', s.done ? C.primary : C.gray);
    doc.text(s.l, cx, y + 18, { align: 'center' });
  });

  drawFooter(doc, 1, 1, data.companyName);
  doc.save(`ticket-maintenance-${data.ticketRef}.pdf`);
}