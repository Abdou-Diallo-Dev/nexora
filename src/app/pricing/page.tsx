// src/app/pricing/page.tsx
import PayButton from "@/components/PayButton";
import { createClient } from "@/lib/supabase/server";

export default async function PricingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <p>Connecte-toi pour accéder aux plans.</p>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Choisir un plan</h1>
      <PayButton
        userId={user.id}
        itemName="Plan Pro - 1 mois"
        amount={15000}
        label="S'abonner pour 15 000 FCFA"
      />
    </div>
  );
}