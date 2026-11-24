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
