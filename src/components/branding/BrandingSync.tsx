'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getBrandingColors } from '@/lib/branding';
import { useAuthStore } from '@/lib/store';

const DEFAULT_BRANDING = getBrandingColors(null);
const COMPANY_BRANDING_PREFIXES = ['/dashboard', '/real-estate', '/logistics', '/tenant-portal', '/billing'];

export function BrandingSync() {
  const { company } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const shouldUseCompanyBranding = COMPANY_BRANDING_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    const colors = shouldUseCompanyBranding ? getBrandingColors(company) : DEFAULT_BRANDING;

    root.style.setProperty('--primary', colors.primaryHsl);
    root.style.setProperty('--secondary', colors.secondaryHsl);
    root.style.setProperty('--sidebar-bg', colors.sidebarBg);
    root.style.setProperty('--sidebar-text', colors.sidebarText);
    root.style.setProperty('--sidebar-muted', colors.sidebarMuted);
    root.style.setProperty('--sidebar-border', colors.sidebarBorder);
    root.style.setProperty('--sidebar-hover', colors.sidebarHover);
    root.style.setProperty('--sidebar-active', colors.sidebarActive);
    root.style.setProperty('--sidebar-active-text', colors.sidebarActiveText);
    root.style.setProperty('--card-accent', colors.cardAccent);
  }, [company, pathname]);

  return null;
}
