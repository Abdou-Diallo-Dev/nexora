// PDF Generator — jsPDF + jspdf-autotable
// Génère des contrats de bail, quittances, états des lieux au format PDF

import { formatCurrency, formatDate } from '@/lib/utils';

// Dynamic import pour éviter SSR issues
async function getJsPDF() {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  return jsPDF;
}

// ── Styles partagés ──────────────────────────────────────────────────────────
const COLORS = {
  primary:    [37, 99, 235] as [number, number, number],   // blue-600
  dark:       [15, 23, 42] as [number, number, number],    // slate-900
  muted:      [100, 116, 139] as [number, number, number], // slate-500
  light:      [241, 245, 249] as [number, number, number], // slate-100
  white:      [255, 255, 255] as [number, number, number],
  green:      [34, 197, 94] as [number, number, number],
  red:        [239, 68, 68] as [number, number, number],
};

function addHeader(doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>, title: string, subtitle?: string, ref?: string) {
  const w = doc.internal.pageSize.getWidth();

  // Bande bleue top
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, w, 28, 'F');

  // Logo text
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('SaaS Platform', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestion Immobilière & Logistique', 14, 19);

  // Date + ref
  doc.setFontSize(8);
  doc.text(`Généré le ${formatDate(new Date().toISOString())}`, w - 14, 12, { align: 'right' });
  if (ref) doc.text(`Réf: ${ref}`, w - 14, 19, { align: 'right' });

  // Titre document
  doc.setFillColor(...COLORS.light);
  doc.rect(0, 28, w, 18, 'F');
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 14, 40);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(subtitle, 14, 46);  // parfois hors bande — corrigé
  }

  return 58; // y après header
}

function addFooter(doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>, pageNum: number, totalPages: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...COLORS.light);
  doc.line(14, h - 20, w - 14, h - 20);
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text('Document généré automatiquement — SaaS Platform', 14, h - 13);
  doc.text(`Page ${pageNum} / ${totalPages}`, w - 14, h - 13, { align: 'right' });
}

function addSection(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  y: number,
  title: string,
  rows: [string, string][],
  twoCol = true
): number {
  const w = doc.internal.pageSize.getWidth();

  // Titre section
  doc.setFillColor(...COLORS.primary);
  doc.rect(14, y, 4, 7, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(title, 21, y + 5.5);
  y += 12;

  if (twoCol) {
    // Grille 2 colonnes
    const colW = (w - 28) / 2 - 3;
    rows.forEach((row, i) => {
      const col = i % 2;
      const xBase = 14 + col * (colW + 6);
      const rowY = y + Math.floor(i / 2) * 14;

      // Fond alterné
      if (Math.floor(i / 2) % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(xBase, rowY - 4, colW, 12, 'F');
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(row[0], xBase + 3, rowY + 1);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text(row[1] || '—', xBase + 3, rowY + 7);
    });
    y += Math.ceil(rows.length / 2) * 14 + 8;
  } else {
    // Liste verticale
    rows.forEach((row, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(14, y - 4, w - 28, 12, 'F');
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(row[0], 18, y + 1);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text(row[1] || '—', (w / 2), y + 1);
      y += 14;
    });
    y += 6;
  }

  return y;
}

// ── QUITTANCE DE LOYER ──────────────────────────────────────────────────────
export interface QuittanceData {
  reference: string;
  tenant: { full_name: string; email: string; phone?: string; address?: string };
  property: { address: string; city: string; surface_area?: number };
  landlord: { name: string; address?: string };
  period: string;
  rent_amount: number;
  charges_amount?: number;
  total_amount: number;
  payment_date: string;
  payment_method?: string;
  notes?: string;
}

export async function generateQuittance(data: QuittanceData): Promise<void> {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ format: 'a4', unit: 'mm' });
  const w = doc.internal.pageSize.getWidth();

  let y = addHeader(doc, 'Quittance de loyer', `Période : ${data.period}`, data.reference);

  // Encadré vert "PAYÉ"
  doc.setFillColor(...COLORS.green);
  doc.roundedRect(w - 55, 30, 41, 16, 3, 3, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ PAYÉ', w - 34, 41, { align: 'center' });

  y = addSection(doc, y, 'Locataire', [
    ['Nom complet', data.tenant.full_name],
    ['Email', data.tenant.email],
    ['Téléphone', data.tenant.phone || '—'],
    ['Adresse', data.tenant.address || '—'],
  ]);

  y = addSection(doc, y, 'Bien loué', [
    ['Adresse', data.property.address],
    ['Ville', data.property.city],
    ['Surface', data.property.surface_area ? `${data.property.surface_area} m²` : '—'],
    ['Bailleur', data.landlord.name],
  ]);

  // Tableau montants
  y = addSection(doc, y, 'Détail du paiement', [], false);
  y -= 6; // compenser l'espace vide

  const tableBody = [
    ['Loyer nu', formatCurrency(data.rent_amount)],
    ...(data.charges_amount ? [['Charges', formatCurrency(data.charges_amount)]] : []),
    ['Mode de paiement', data.payment_method || 'Virement bancaire'],
    ['Date de paiement', formatDate(data.payment_date)],
  ];

  (doc as unknown as { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Description', 'Montant']],
    body: tableBody,
    foot: [['TOTAL REÇU', formatCurrency(data.total_amount)]],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: COLORS.dark },
    footStyles: { fillColor: COLORS.dark, textColor: COLORS.white, fontStyle: 'bold', fontSize: 11 },
    columnStyles: { 0: { cellWidth: 100 }, 1: { halign: 'right', fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: COLORS.light },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  // Clause légale
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(14, y, w - 28, 22, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.muted);
  const clause = 'La présente quittance atteste de la réception du loyer et des charges pour la période mentionnée. Elle vaut reçu de paiement conformément aux dispositions légales en vigueur.';
  const lines = doc.splitTextToSize(clause, w - 36);
  doc.text(lines, 18, y + 7);

  if (data.notes) {
    y += 30;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Notes :', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(data.notes, 14, y + 6);
  }

  // Signature
  const signY = doc.internal.pageSize.getHeight() - 55;
  doc.setDrawColor(...COLORS.light);
  doc.setLineWidth(0.5);
  doc.line(14, signY, 85, signY);
  doc.line(w - 85, signY, w - 14, signY);
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text('Signature du bailleur', 14, signY + 6);
  doc.text('Cachet / Signature', w - 14, signY + 6, { align: 'right' });

  addFooter(doc, 1, 1);
  doc.save(`quittance-${data.tenant.full_name.replace(/\s/g, '-')}-${data.period}.pdf`);
}

// ── CONTRAT DE BAIL ─────────────────────────────────────────────────────────
export interface BailData {
  reference: string;
  tenant: { full_name: string; email: string; phone?: string; national_id?: string; profession?: string; address?: string };
  property: { address: string; city: string; surface_area?: number; rooms?: number; property_type?: string };
  landlord: { name: string; address?: string; phone?: string; email?: string };
  start_date: string;
  end_date: string;
  rent_amount: number;
  charges_amount?: number;
  deposit_amount: number;
  payment_day: number;
  payment_method?: string;
  duration_months?: number;
  notes?: string;
}

export async function generateContratBail(data: BailData): Promise<void> {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ format: 'a4', unit: 'mm' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // ── PAGE 1 : Parties + Bien ──────────────────────────────────────────────
  let y = addHeader(doc, 'Contrat de bail d\'habitation', 'Loi applicable — Code civil', data.reference);

  // Intro
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  const intro = `Entre les soussignés, il a été convenu et arrêté ce qui suit : le bailleur désigné ci-dessous concède au locataire désigné ci-après la jouissance paisible du bien immobilier décrit aux conditions définies dans le présent contrat.`;
  const introLines = doc.splitTextToSize(intro, w - 28);
  doc.text(introLines, 14, y);
  y += introLines.length * 5 + 6;

  y = addSection(doc, y, 'Le Bailleur', [
    ['Nom / Raison sociale', data.landlord.name],
    ['Adresse', data.landlord.address || '—'],
    ['Téléphone', data.landlord.phone || '—'],
    ['Email', data.landlord.email || '—'],
  ]);

  y = addSection(doc, y, 'Le Locataire', [
    ['Nom complet', data.tenant.full_name],
    ['Email', data.tenant.email],
    ['Téléphone', data.tenant.phone || '—'],
    ['Pièce d\'identité', data.tenant.national_id || '—'],
    ['Profession', data.tenant.profession || '—'],
    ['Adresse actuelle', data.tenant.address || '—'],
  ]);

  y = addSection(doc, y, 'Le Bien Loué', [
    ['Adresse', data.property.address],
    ['Ville', data.property.city],
    ['Type', data.property.property_type || '—'],
    ['Surface', data.property.surface_area ? `${data.property.surface_area} m²` : '—'],
    ['Nombre de pièces', data.property.rooms ? String(data.property.rooms) : '—'],
    ['Usage', 'Habitation principale'],
  ]);

  addFooter(doc, 1, 3);

  // ── PAGE 2 : Conditions financières ─────────────────────────────────────
  doc.addPage();
  y = addHeader(doc, 'Conditions financières & durée', '', data.reference);

  y = addSection(doc, y, 'Durée du bail', [
    ['Date de début', formatDate(data.start_date)],
    ['Date de fin', formatDate(data.end_date)],
    ['Durée', data.duration_months ? `${data.duration_months} mois` : 'Voir dates'],
    ['Renouvellement', 'Tacite reconduction selon accord'],
  ]);

  y = addSection(doc, y, 'Conditions financières', [
    ['Loyer mensuel (hors charges)', formatCurrency(data.rent_amount)],
    ['Charges mensuelles', data.charges_amount ? formatCurrency(data.charges_amount) : 'Incluses'],
    ['Total mensuel', formatCurrency(data.rent_amount + (data.charges_amount || 0))],
    ['Dépôt de garantie', formatCurrency(data.deposit_amount)],
    ['Jour de paiement', `Le ${data.payment_day} de chaque mois`],
    ['Mode de paiement', data.payment_method || 'Virement bancaire'],
  ]);

  // Tableau récapitulatif
  (doc as unknown as { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Élément', 'Montant mensuel', 'Montant annuel']],
    body: [
      ['Loyer nu', formatCurrency(data.rent_amount), formatCurrency(data.rent_amount * 12)],
      ...(data.charges_amount ? [['Charges', formatCurrency(data.charges_amount), formatCurrency(data.charges_amount * 12)]] : []),
    ],
    foot: [['TOTAL', formatCurrency(data.rent_amount + (data.charges_amount || 0)), formatCurrency((data.rent_amount + (data.charges_amount || 0)) * 12)]],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    footStyles: { fillColor: COLORS.dark, textColor: COLORS.white, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    alternateRowStyles: { fillColor: COLORS.light },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  // Clauses conditions
  const clauses = [
    ['État des lieux', 'Un état des lieux contradictoire sera établi à l\'entrée et à la sortie du locataire.'],
    ['Entretien', 'Le locataire s\'engage à entretenir le bien et à effectuer les réparations locatives à sa charge.'],
    ['Sous-location', 'Toute sous-location totale ou partielle est interdite sans accord écrit préalable du bailleur.'],
    ['Assurance', 'Le locataire est tenu de souscrire une assurance habitation et d\'en fournir justificatif annuellement.'],
  ];

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.setFillColor(...COLORS.primary);
  doc.rect(14, y, 4, 7, 'F');
  doc.text('Clauses essentielles', 21, y + 5.5);
  y += 14;

  clauses.forEach(([titre, texte]) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(`• ${titre} :`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    const lines = doc.splitTextToSize(texte, w - 40);
    doc.text(lines, 20, y + 5);
    y += 5 + lines.length * 4.5 + 4;
  });

  addFooter(doc, 2, 3);

  // ── PAGE 3 : Signatures ──────────────────────────────────────────────────
  doc.addPage();
  y = addHeader(doc, 'Signatures & engagements', '', data.reference);

  // Texte engagement
  const engagement = `Les parties déclarent avoir pris connaissance de l'intégralité des clauses du présent contrat et les acceptent sans réserve. Le présent contrat est établi en deux exemplaires originaux, un pour chaque partie.`;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  const engLines = doc.splitTextToSize(engagement, w - 28);
  doc.text(engLines, 14, y);
  y += engLines.length * 5 + 16;

  if (data.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Mentions particulières :', 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    const notesLines = doc.splitTextToSize(data.notes, w - 28);
    doc.text(notesLines, 14, y);
    y += notesLines.length * 5 + 14;
  }

  // Cadres signatures
  const sigY = y + 10;
  const sigH = 55;
  const col1 = 14, col2 = w / 2 + 5;
  const colW = w / 2 - 19;

  // Bailleur
  doc.setDrawColor(...COLORS.light);
  doc.setLineWidth(0.8);
  doc.roundedRect(col1, sigY, colW, sigH, 2, 2);
  doc.setFillColor(...COLORS.primary);
  doc.rect(col1, sigY, colW, 10, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('LE BAILLEUR', col1 + colW / 2, sigY + 7, { align: 'center' });
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.landlord.name, col1 + 6, sigY + 18);
  doc.setTextColor(...COLORS.muted);
  doc.text('Signature précédée de "Lu et approuvé"', col1 + 6, sigY + 25);
  doc.setDrawColor(...COLORS.muted);
  doc.line(col1 + 6, sigY + sigH - 8, col1 + colW - 6, sigY + sigH - 8);
  doc.text('Date et signature', col1 + 6, sigY + sigH - 3);

  // Locataire
  doc.setDrawColor(...COLORS.light);
  doc.roundedRect(col2, sigY, colW, sigH, 2, 2);
  doc.setFillColor(...COLORS.primary);
  doc.rect(col2, sigY, colW, 10, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('LE LOCATAIRE', col2 + colW / 2, sigY + 7, { align: 'center' });
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tenant.full_name, col2 + 6, sigY + 18);
  doc.setTextColor(...COLORS.muted);
  doc.text('Signature précédée de "Lu et approuvé"', col2 + 6, sigY + 25);
  doc.setDrawColor(...COLORS.muted);
  doc.line(col2 + 6, sigY + sigH - 8, col2 + colW - 6, sigY + sigH - 8);
  doc.text('Date et signature', col2 + 6, sigY + sigH - 3);

  addFooter(doc, 3, 3);

  doc.save(`contrat-bail-${data.tenant.full_name.replace(/\s/g, '-')}-${data.start_date}.pdf`);
}

// ── ÉTAT DES LIEUX ───────────────────────────────────────────────────────────
export interface EtatDesLieuxData {
  reference: string;
  type: 'entree' | 'sortie';
  tenant: { full_name: string; phone?: string };
  property: { address: string; city: string; rooms?: number };
  date: string;
  rooms: { name: string; etat: string; observations: string }[];
  compteurs: { nom: string; valeur: string }[];
  notes?: string;
}

export async function generateEtatDesLieux(data: EtatDesLieuxData): Promise<void> {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ format: 'a4', unit: 'mm' });
  const w = doc.internal.pageSize.getWidth();

  const typeLabel = data.type === 'entree' ? "ÉTAT DES LIEUX D'ENTRÉE" : "ÉTAT DES LIEUX DE SORTIE";
  let y = addHeader(doc, typeLabel, `${data.property.address} — ${formatDate(data.date)}`, data.reference);

  y = addSection(doc, y, 'Informations générales', [
    ['Locataire', data.tenant.full_name],
    ['Téléphone', data.tenant.phone || '—'],
    ['Adresse du bien', `${data.property.address}, ${data.property.city}`],
    ['Date', formatDate(data.date)],
    ['Type', data.type === 'entree' ? 'Entrée dans les lieux' : 'Sortie des lieux'],
    ['Référence', data.reference],
  ]);

  // Compteurs
  if (data.compteurs.length > 0) {
    (doc as unknown as { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Compteur', 'Relevé']],
      body: data.compteurs.map(c => [c.nom, c.valeur]),
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: COLORS.light },
      tableWidth: 100,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Pièces
  doc.setFillColor(...COLORS.primary);
  doc.rect(14, y, 4, 7, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('État des pièces', 21, y + 5.5);
  y += 12;

  (doc as unknown as { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Pièce', 'État', 'Observations']],
    body: data.rooms.map(r => [r.name, r.etat, r.observations]),
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: COLORS.light },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 35 }, 2: { cellWidth: 'auto' } },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  if (data.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Observations générales :', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    const lines = doc.splitTextToSize(data.notes, w - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 10;
  }

  // Signatures
  const sigY = doc.internal.pageSize.getHeight() - 65;
  doc.setDrawColor(...COLORS.light);
  doc.line(14, sigY - 4, w - 14, sigY - 4);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Bailleur / Mandataire', 14, sigY + 4);
  doc.text('Locataire', w / 2 + 5, sigY + 4);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature :', 14, sigY + 16);
  doc.text('Signature :', w / 2 + 5, sigY + 16);
  doc.line(14, sigY + 38, 90, sigY + 38);
  doc.line(w / 2 + 5, sigY + 38, w - 14, sigY + 38);

  addFooter(doc, 1, 1);
  doc.save(`etat-des-lieux-${data.type}-${data.tenant.full_name.replace(/\s/g, '-')}.pdf`);
}
