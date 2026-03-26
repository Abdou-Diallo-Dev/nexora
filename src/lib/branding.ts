type RGB = { r: number; g: number; b: number };

// SARPA GROUP — couleurs officielles
const DEFAULT_PRIMARY = '#3d2d7d';
const DEFAULT_SECONDARY = '#faab2d';

function normalizeHex(color?: string | null, fallback = DEFAULT_PRIMARY) {
  if (!color) return fallback;
  const value = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  return fallback;
}

function hexToRgb(hex: string): RGB {
  const clean = normalizeHex(hex).replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHsl(rgb: RGB) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function getTextColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0f172a' : '#ffffff';
}

function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getBrandingColors(company?: {
  primary_color?: string | null;
  secondary_color?: string | null;
} | null) {
  const primary = normalizeHex(company?.primary_color, DEFAULT_PRIMARY);
  const secondary = normalizeHex(company?.secondary_color, DEFAULT_SECONDARY);
  const primaryHsl = rgbToHsl(hexToRgb(primary));
  const secondaryHsl = rgbToHsl(hexToRgb(secondary));

  return {
    primary,
    secondary,
    primaryHsl: `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`,
    secondaryHsl: `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`,
    primaryText: getTextColor(primary),
    secondaryText: getTextColor(secondary),
    sidebarBg: primary,
    sidebarText: getTextColor(primary),
    sidebarMuted: withAlpha(getTextColor(primary), 0.7),
    sidebarBorder: withAlpha(getTextColor(primary), 0.12),
    sidebarHover: withAlpha('#ffffff', getTextColor(primary) === '#ffffff' ? 0.12 : 0.18),
    sidebarActive: secondary,
    sidebarActiveText: getTextColor(secondary),
    cardAccent: withAlpha(secondary, 0.14),
  };
}

export function getCompanyDisplayName(company?: { name?: string | null } | null) {
  return company?.name?.trim() || 'SARPA GROUP';
}

export function getCompanyInitial(company?: { name?: string | null } | null) {
  return getCompanyDisplayName(company).charAt(0).toUpperCase();
}
