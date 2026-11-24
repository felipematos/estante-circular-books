import { supabase } from "@/integrations/supabase/client";

export const PLATFORM_FEE_RATE = 0.2;
export const LISTING_DAYS = 30;

export function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Platform keeps 20% of the book price; gateway cost is only known after payment. */
export function computeFees(priceCents: number, gatewayFeeCents: number | null = null) {
  const platform = Math.round(priceCents * PLATFORM_FEE_RATE);
  const net = priceCents - platform - (gatewayFeeCents ?? 0);
  return { platform, gateway: gatewayFeeCents, net };
}

export function daysLeft(expiresAt: string, now = Date.now()) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000));
}

export function coverUrl(path: string) {
  return supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
}

export function parseCents(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function maskCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Algo deu errado. Tente novamente.";
}

export const ORDER_STATUS: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago · aguardando envio",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};
