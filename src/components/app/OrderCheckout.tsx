import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useMemo, useState } from "react";
import { ErrorBox } from "./Shell";
import { useServerFn } from "@tanstack/react-start";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createOrderCheckout } from "@/lib/payments.functions";

export function OrderCheckout({ orderId }: { orderId: string }) {
  const create = useServerFn(createOrderCheckout);
  const [err, setErr] = useState<string | null>(null);
  const options = useMemo(() => ({
    fetchClientSecret: async () => {
      const r = await create({ data: { orderId, returnUrl: window.location.href, environment: getStripeEnvironment() } });
      if ("error" in r) { setErr("Não foi possível abrir o pagamento agora. Tente novamente em instantes."); console.error(r.error); throw new Error(r.error); }
      return r.clientSecret;
    },
  }), [create, orderId]);
  if (err) return <ErrorBox message={err} onRetry={() => window.location.reload()} />;
  return (
    <div className="overflow-hidden rounded-[20px] border border-border">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
