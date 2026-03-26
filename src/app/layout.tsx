import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { BrandingSync } from '@/components/branding/BrandingSync';
import './globals.css';

export const metadata: Metadata = {
  title: 'SARPA GROUP SÉNÉGAL — ERP',
  description: 'Plateforme ERP centralisée du Groupe SARPA — Immobilier, Béton, Logistiques',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SARPA GROUP',
  },
};

export const viewport: Viewport = {
  themeColor: '#3d2d7d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Nexora" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <BrandingSync />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
