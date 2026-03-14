// app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // PayTech envoie les données en form-data
    const formData = await req.formData();

    const type_event = formData.get("type_event") as string;
    const ref_command = formData.get("ref_command") as string;
    const api_key_sha256 = formData.get("api_key_sha256") as string;
    const api_secret_sha256 = formData.get("api_secret_sha256") as string;

    // ✅ Vérifier la signature (sécurité critique)
    const crypto = await import("crypto");
    const expectedApiKey = crypto
      .createHash("sha256")
      .update(process.env.PAYTECH_API_KEY!)
      .digest("hex");
    const expectedApiSecret = crypto
      .createHash("sha256")
      .update(process.env.PAYTECH_API_SECRET!)
      .digest("hex");

    if (
      api_key_sha256 !== expectedApiKey ||
      api_secret_sha256 !== expectedApiSecret
    ) {
      console.warn("[Webhook] Signature invalide !");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mapper le type d'événement vers un statut
    let status: string;
    switch (type_event) {
      case "sale_complete":
        status = "success";
        break;
      case "sale_canceled":
        status = "cancelled";
        break;
      default:
        status = "failed";
    }

    // Mettre à jour le statut dans Supabase
    const { error } = await supabase
      .from("payments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("ref_command", ref_command);

    if (error) throw new Error(error.message);

    console.log(`[Webhook] ${ref_command} → ${status}`);
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Webhook error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}