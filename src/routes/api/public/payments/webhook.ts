import { createFileRoute } from "@tanstack/react-router";
import { createStripeClient, verifyWebhook, type StripeEnv } from "@/lib/stripe.server";

async function markPaid(session: any, env: StripeEnv) {
  const orderId = session.metadata?.order_id;
  if (!orderId || !/^[0-9a-f-]{36}$/.test(orderId)) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let gatewayFee: number | null = null;
  try {
    if (session.payment_intent) {
      const stripe = createStripeClient(env);
      const pi = await stripe.paymentIntents.retrieve(String(session.payment_intent), { expand: ["latest_charge.balance_transaction"] });
      const bt = (pi.latest_charge as any)?.balance_transaction;
      if (bt && typeof bt === "object" && typeof bt.fee === "number") gatewayFee = bt.fee;
    }
  } catch (e) {
    console.error("fee lookup failed", e);
  }
  await supabaseAdmin
    .from("orders")
    .update({
      status: "paid", paid_at: new Date().toISOString(), payment_session_id: session.id, payment_env: env,
      ...(gatewayFee !== null && { gateway_fee_cents: gatewayFee }), updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending_payment");
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ received: true, ignored: "invalid env" });
        try {
          const event = await verifyWebhook(request, rawEnv);
          const obj = event.data.object;
          if (event.type === "checkout.session.completed" && obj.payment_status !== "unpaid") await markPaid(obj, rawEnv);
          if (event.type === "checkout.session.async_payment_succeeded") await markPaid(obj, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
