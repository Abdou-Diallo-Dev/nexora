export type CommissionMode = 'none' | 'ht' | 'ttc';

export type CompanyCommissionSettings = {
  commission_rate?: number | null;
  commission_mode?: string | null;
  vat_rate?: number | null;
};

export type NormalizedCommissionSettings = {
  commissionRate: number;
  commissionMode: CommissionMode;
  vatRate: number;
};

export type CommissionBreakdown = {
  settings: NormalizedCommissionSettings;
  commissionHT: number;
  commissionTVA: number;
  commissionTTC: number;
  landlordCommission: number;
  companyRevenue: number;
};

const DEFAULT_COMMISSION_RATE = 10;
const DEFAULT_VAT_RATE = 18;
const DEFAULT_COMMISSION_MODE: CommissionMode = 'ttc';

export function normalizeCommissionSettings(
  raw?: CompanyCommissionSettings | null
): NormalizedCommissionSettings {
  const mode = raw?.commission_mode;

  return {
    commissionRate: Number(raw?.commission_rate ?? DEFAULT_COMMISSION_RATE) || 0,
    commissionMode:
      mode === 'none' || mode === 'ht' || mode === 'ttc'
        ? mode
        : DEFAULT_COMMISSION_MODE,
    vatRate: Number(raw?.vat_rate ?? DEFAULT_VAT_RATE) || 0,
  };
}

export function calculateCommission(
  revenue: number,
  raw?: CompanyCommissionSettings | null
): CommissionBreakdown {
  const settings = normalizeCommissionSettings(raw);
  const safeRevenue = Number(revenue) || 0;
  const commissionHT =
    settings.commissionMode === 'none'
      ? 0
      : safeRevenue * (settings.commissionRate / 100);
  const commissionTVA =
    settings.commissionMode === 'ttc'
      ? commissionHT * (settings.vatRate / 100)
      : 0;
  const commissionTTC = commissionHT + commissionTVA;
  const landlordCommission =
    settings.commissionMode === 'none'
      ? 0
      : settings.commissionMode === 'ttc'
        ? commissionTTC
        : commissionHT;

  return {
    settings,
    commissionHT,
    commissionTVA,
    commissionTTC,
    landlordCommission,
    companyRevenue: commissionHT,
  };
}

export function computeLandlordNet(
  revenue: number,
  bailleurExpenses: number,
  raw?: CompanyCommissionSettings | null
) {
  const breakdown = calculateCommission(revenue, raw);
  return Math.max(
    0,
    (Number(revenue) || 0) -
      breakdown.landlordCommission -
      (Number(bailleurExpenses) || 0)
  );
}

export function computeCompanyNet(
  revenue: number,
  entrepriseExpenses: number,
  raw?: CompanyCommissionSettings | null
) {
  const breakdown = calculateCommission(revenue, raw);
  return breakdown.companyRevenue - (Number(entrepriseExpenses) || 0);
}

export function getCommissionModeLabel(raw?: CompanyCommissionSettings | null) {
  const { commissionMode } = normalizeCommissionSettings(raw);

  if (commissionMode === 'none') return 'Sans commission';
  if (commissionMode === 'ht') return 'Commission HT';
  return 'Commission TTC';
}

export function getCommissionSummaryLabel(raw?: CompanyCommissionSettings | null) {
  const { commissionMode, commissionRate, vatRate } = normalizeCommissionSettings(raw);

  if (commissionMode === 'none') return 'Aucune commission';
  if (commissionMode === 'ht') return `Commission HT (${commissionRate}%)`;
  return `Commission TTC (${commissionRate}% + TVA ${vatRate}%)`;
}
