// src/components/PayButton.tsx
"use client";

import { usePayment } from "@/hooks/usePayment";

interface Props {
  userId: string;
  itemName: string;
  amount: number;
  label?: string;
}

export default function PayButton({ userId, itemName, amount, label }: Props) {
  const { initiatePayment, loading, error } = usePayment();

  return (
    <div>
      <button
        onClick={() => initiatePayment({ userId, itemName, amount })}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50 transition"
      >
        {loading ? "Redirection..." : label || `Payer ${amount.toLocaleString()} FCFA`}
      </button>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
}