'use client';
import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { toast } from 'sonner';

export default function ContractsPage() {
  return (
    <div>
      <PageHeader title="Modèle de contrat" subtitle="Personnalisez votre contrat de bail" />

      <div className="mb-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5"/>
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">Nouvel éditeur de contrat</p>
          <p className="text-xs">Le modèle de contrat a été réorganisé. Allez à <strong>Admin → Modèle de contrat</strong> pour éditer vos contrats.</p>
        </div>
      </div>
    </div>
  );
}