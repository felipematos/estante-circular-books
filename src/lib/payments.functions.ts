import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";

async function resolveOrCreateCustomer(stripe: ReturnType<typeof createStripeClient>, options: { email?: string | undefined; userId?: string | undefined }): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    if (found.data[0]) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createOrderCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ orderId: z.string().uuid(), returnUrl: z.string().url(), environment: z.enum(["sandbox", "live"]) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (error || !order) return { error: "Pedido não encontrado." };
    if (order.buyer_id !== userId) return { error: "Este pedido não é seu." };
    if (order.status !== "pending_payment") return { error: "Este pedido não está aguardando pagamento." };
    const origin = new URL(data.returnUrl).origin;
    try {
      const stripe = createStripeClient(data.environment as StripeEnv);
      const { data: u } = await supabase.auth.getUser();
      const customer = await resolveOrCreateCustomer(stripe, { email: u.user?.email ?? undefined, userId });
      const amount = order.price_cents + (order.shipping_cents ?? 0);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        customer,
        line_items: [{
          quantity: 1,
          price_data: { currency: "brl", unit_amount: amount, product_data: { name: `Livro usado: ${order.title}`.slice(0, 250) } },
        }],
        payment_intent_data: { description: `Livro usado: ${order.title}`.slice(0, 250), metadata: { order_id: order.id } },
        metadata: { order_id: order.id, userId, managed_payments: "false" },
        return_url: `${origin}/pedidos/${order.id}?pago=1`,
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });
