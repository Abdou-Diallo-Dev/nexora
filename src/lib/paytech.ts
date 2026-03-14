// lib/paytech.ts

const PAYTECH_BASE_URL = "https://paytech.sn/api";

export interface PayTechRequestPayload {
  item_name: string;
  item_price: number;        // en FCFA
  currency: "XOF" | "USD" | "EUR";
  ref_command: string;       // ton ID unique de commande
  command_name: string;
  ipn_url: string;           // webhook pour notifications
  success_url: string;
  cancel_url: string;
  custom_field?: string;     // données custom sérialisées
  env: "test" | "prod";
}

export interface PayTechResponse {
  success: number;           // 1 = succès
  token: string;
  redirect_url: string;
}

export async function requestPayment(
  payload: PayTechRequestPayload
): Promise<PayTechResponse> {
  const res = await fetch(`${PAYTECH_BASE_URL}/payment/request-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      API_KEY: process.env.PAYTECH_API_KEY!,
      API_SECRET: process.env.PAYTECH_API_SECRET!,
    },
    body: JSON.stringify(payload),
  });

 if (!res.ok) {
    const errorBody = await res.text();
    console.error("[PayTech response]", errorBody);
    throw new Error(`PayTech error: ${res.status} ${res.statusText} - ${errorBody}`);
  }

  const data = await res.json();

  if (data.success !== 1) {
    throw new Error(`PayTech request failed: ${JSON.stringify(data)}`);
  }

  return data;
}