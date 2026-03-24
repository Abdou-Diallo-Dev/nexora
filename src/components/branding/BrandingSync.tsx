'use client';

import { useEffect } from 'react';
import { getBrandingColors } from '@/lib/branding';
import { useAuthStore } from '@/lib/store';

export function BrandingSync() {
  const { company } = useAuthStore();

  useEffect(() => {
    const root = document.documentElement;
    const colors = getBrandingColors(company);

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
  }, [company]);

  return null;
}
