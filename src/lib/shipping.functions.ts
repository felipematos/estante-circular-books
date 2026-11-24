import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ShippingQuote = { available: false; reason: string } | { available: true; cents: number; service: string; days: number };

/** Integration point for the carrier API. No provider is configured yet, so no price is invented. */
export const quoteShipping = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ fromCep: z.string().regex(/^\d{5}/), toCep: z.string().regex(/^\d{8}$/), weightG: z.number().int().min(1).max(30000) }).parse(d))
  .handler(async (): Promise<ShippingQuote> => {
    if (!process.env["SHIPPING_PROVIDER"]) {
      return { available: false, reason: "Cotação de frete ainda indisponível. Combine o envio com o vendedor pelo chat." };
    }
    return { available: false, reason: "Transportadora ainda não conectada." };
  });
