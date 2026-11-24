import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createOrderCheckout } from "@/lib/payments.functions";

export function OrderCheckout({ orderId }: { orderId: string }) {
  const create = useServerFn(createOrderCheckout);
  const options = useMemo(() => ({
    fetchClientSecret: async () => {
      const r = await create({ data: { orderId, returnUrl: window.location.href, environment: getStripeEnvironment() } });
      if ("error" in r) throw new Error(r.error);
      return r.clientSecret;
    },
  }), [create, orderId]);
  return (
    <div className="overflow-hidden rounded-[20px] border border-border">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
