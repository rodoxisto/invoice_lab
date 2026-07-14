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

  it("uses amountInAccountCurrency for transactions outside BRL", () => {
    const parsed = parseOpenFinanceJson([
      { date: "2026-02-01", amount: 20, amountInAccountCurrency: 109.5, currencyCode: "USD", type: "DEBIT", description: "Compra internacional" },
      { date: "2026-02-02", amount: 10, currencyCode: "USD", type: "DEBIT", description: "Conversão indisponível" },
    ]);
    expect(parsed.transactions[0].originalAmount).toBe(20);
    expect(parsed.transactions[0].currencyCode).toBe("USD");
    expect(parsed.transactions[0].amount).toBe(109.5);
    expect(parsed.transactions[0].conversionMissing).toBe(false);
    expect(parsed.transactions[1].amount).toBe(0);
    expect(parsed.transactions[1].conversionMissing).toBe(true);
    expect(parsed.warnings[0]).toMatch(/sem amountInAccountCurrency/i);
  });
});
