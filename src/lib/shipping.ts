import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CEP_KEY = "sebo:cep";
type Rate = { region: string; max_weight_g: number; price_cents: number };

/** Smallest bracket that fits the weight; null when the book is heavier than every bracket. */
export function priceFor(rates: Rate[], region: string | null | undefined, weightG: number) {
  if (!region) return null;
  const r = rates.filter((x) => x.region === region && x.max_weight_g >= weightG).sort((a, b) => a.max_weight_g - b.max_weight_g)[0];
  return r ? r.price_cents : null;
}

export function useSavedCep() {
  const [cep, setCep] = useState("");
  useEffect(() => setCep(localStorage.getItem(CEP_KEY) ?? ""), []);
  const save = (v: string) => { localStorage.setItem(CEP_KEY, v); setCep(v); };
  return [cep, setCep, save] as const;
}

/** Default shipping table by destination region and weight. Region is resolved by the database from the CEP. */
export function useShipping(cep: string) {
  const digits = cep.replace(/\D/g, "");
  const rates = useQuery({
    queryKey: ["shipping-rates"], staleTime: 5 * 60_000,
    queryFn: async () => (await supabase.from("shipping_rates").select("region,max_weight_g,price_cents")).data ?? [],
  });
  const region = useQuery({
    queryKey: ["cep-region", digits], enabled: digits.length === 8, staleTime: Infinity,
    queryFn: async () => (await supabase.rpc("cep_region", { _cep: digits })).data as string | null,
  });
  return (weightG: number) => (digits.length === 8 ? priceFor(rates.data ?? [], region.data, weightG) : null);
}
