// hooks/usePayment.ts
import { useState } from "react";

interface PaymentOptions {
  userId: string;
  itemName: string;
  amount: number;
  commandName?: string;
}

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = async (options: PaymentOptions) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Rediriger vers la page de paiement PayTech
      window.location.href = data.redirect_url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { initiatePayment, loading, error };
}