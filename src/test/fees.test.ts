import { describe, expect, it } from "vitest";
import { computeFees, daysLeft } from "@/lib/format";

describe("taxas", () => {
  it("plataforma fica com 20% do valor do livro", () => {
    expect(computeFees(5000).platform).toBe(1000);
  });
  it("líquido desconta 20% e o custo real do gateway", () => {
    expect(computeFees(5000, 150).net).toBe(3850);
  });
  it("anúncio novo dura 30 dias", () => {
    const now = Date.now();
    expect(daysLeft(new Date(now + 30 * 86_400_000).toISOString(), now)).toBe(30);
  });
});

import { priceFor } from "@/lib/shipping";
describe("frete padrão", () => {
  const rates = [{ region: "SE", max_weight_g: 300, price_cents: 1200 }, { region: "SE", max_weight_g: 500, price_cents: 1500 }];
  it("usa a menor faixa de peso que comporta o livro", () => {
    expect(priceFor(rates, "SE", 340)).toBe(1500);
  });
  it("sem faixa para o peso, não há cotação", () => {
    expect(priceFor(rates, "SE", 800)).toBeNull();
  });
});
