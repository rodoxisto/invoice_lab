import { describe, expect, it } from "vitest";
import { parseOpenFinanceJson } from "./jsonParser";

describe("JSON parser", () => {
  it("finds a nested transaction array and normalizes localized amounts", () => {
    const parsed = parseOpenFinanceJson({ data: { items: [
      { transactionDate: "2026-01-10", value: "R$ 1.234,56", creditDebitType: "DEBIT", merchantName: "Loja" },
      { transactionDate: "2026-01-20", value: "-1.234,56", creditDebitType: "CREDIT", memo: "Pagamento da fatura" },
    ] } });
    expect(parsed.sourcePath).toBe("$.data.items");
    expect(parsed.transactions[0].amount).toBe(1234.56);
    expect(parsed.transactions[1].kind).toBe("payment");
  });

  it("rejects JSON without transactions", () => {
    expect(() => parseOpenFinanceJson({ hello: "world" })).toThrow(/lista de transações/i);
  });
});
