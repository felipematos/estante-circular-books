import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";
const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error("Pagamentos ainda não configurados para esta versão do app.");
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe() {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}
export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}
export function isTestPayments() {
  return clientToken?.startsWith("pk_test_") ?? false;
}
export function paymentsConfigured() {
  return !!clientToken;
}
