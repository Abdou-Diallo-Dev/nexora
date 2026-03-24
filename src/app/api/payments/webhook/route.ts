import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const formData = await req.formData();
    const type_event = formData.get("type_event") as string;
    const ref_command = formData.get("ref_command") as string;
    const api_key_sha256 = formData.get("api_key_sha256") as string;
    const api_secret_sha256 = formData.get("api_secret_sha256") as string;

    const paytechApiKey = process.env.PAYTECH_API_KEY;
    const paytechApiSecret = process.env.PAYTECH_API_SECRET;
    if (!paytechApiKey || !paytechApiSecret) {
      return NextResponse.json({ error: "PayTech env manquante" }, { status: 500 });
    }

    const crypto = await import("crypto");
    const expectedApiKey = crypto.createHash("sha256").update(paytechApiKey).digest("hex");
    const expectedApiSecret = crypto.createHash("sha256").update(paytechApiSecret).digest("hex");

    if (api_key_sha256 !== expectedApiKey || api_secret_sha256 !== expectedApiSecret) {
      console.warn("[Webhook] Signature invalide");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    await supabase
      .from("payments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("ref_command", ref_command);

    if (type_event === "sale_complete" && ref_command.startsWith("SUB_")) {
      const parts = ref_command.split("_");
      const companyId = parts.slice(2).join("_");

      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan: "pro",
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Webhook error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
