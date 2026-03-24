import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requestPayment } from "@/lib/paytech";

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
    const { userId, itemName, amount, commandName } = await req.json();

    if (!userId || !itemName || !amount) {
      return NextResponse.json({ error: "Parametres manquants" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL manquante" }, { status: 500 });
    }

    const refCommand = `CMD_${userId}_${Date.now()}`;

    const { error: dbError } = await supabase.from("payments").insert({
      user_id: userId,
      ref_command: refCommand,
      item_name: itemName,
      amount,
      status: "pending",
    });

    if (dbError) throw new Error(dbError.message);

    const paytech = await requestPayment({
      item_name: itemName,
      item_price: amount,
      currency: "XOF",
      ref_command: refCommand,
      command_name: commandName || itemName,
      ipn_url: `${appUrl}/api/payment/webhook`,
      success_url: `${appUrl}/payment/success?ref=${refCommand}`,
      cancel_url: `${appUrl}/payment/cancel?ref=${refCommand}`,
      custom_field: JSON.stringify({ userId }),
      env: (process.env.PAYTECH_ENV as "test" | "prod") || "test",
    });

    await supabase
      .from("payments")
      .update({ paytech_token: paytech.token })
      .eq("ref_command", refCommand);

    return NextResponse.json({
      redirect_url: paytech.redirect_url,
      ref_command: refCommand,
    });
  } catch (err: any) {
    console.error("[PayTech create]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
