'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader, EmptyState, btnPrimary } from '@/components/ui';

export default function Page() {
  return (
    <div>
      <PageHeader title="Chauffeurs" actions={<Link href="/logistics/drivers/new" className={btnPrimary}><Plus size={16} />Nouveau</Link>} />
      <EmptyState title="Aucun enregistrement" description="Cette section sera disponible prochainement."
        action={<Link href="/logistics/drivers/new" className={btnPrimary}><Plus size={16} />Créer</Link>} />
    </div>
  );
}
