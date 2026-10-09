import { describe, expect, it } from "vitest";
import { greetingForHour, producerFirstName } from "@/lib/greeting";

describe("Saudação do produtor", () => {
  it("usa o primeiro nome do cadastro da conta atual", () => {
    expect(producerFirstName(" Maria Izabel Maia ")).toBe("Maria");
    expect(producerFirstName("João Silva")).toBe("João");
    expect(producerFirstName(null)).toBe("");
  });
  it("muda com a hora local", () => {
    expect(greetingForHour(0)).toBe("Bom dia");
    expect(greetingForHour(11)).toBe("Bom dia");
    expect(greetingForHour(12)).toBe("Boa tarde");
    expect(greetingForHour(17)).toBe("Boa tarde");
    expect(greetingForHour(18)).toBe("Boa noite");
    expect(greetingForHour(23)).toBe("Boa noite");
  });
});