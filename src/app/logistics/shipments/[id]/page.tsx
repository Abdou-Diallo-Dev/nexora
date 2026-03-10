'use client';
import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';
import { PageHeader, EmptyState, btnPrimary, btnSecondary } from '@/components/ui';

export default function Page() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/shipments" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <PageHeader title="Détail expédition" />
      </div>
      <EmptyState title="Module en cours de développement" description="Cette section sera disponible prochainement." />
    </div>
  );
}
