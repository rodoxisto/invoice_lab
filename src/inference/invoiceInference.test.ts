import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOpenFinanceJson } from "../parsers/jsonParser";
import { inferAnchorForInspection, inferInvoices } from "./invoiceInference";

describe("invoice inference", () => {
  it("finds the C6 closing boundary between POSTED and PENDING", () => {
    const input = JSON.parse(readFileSync("json_pluggy_c6_jef.json", "utf8"));
    const parsed = parseOpenFinanceJson(input);
    const anchor = inferAnchorForInspection(parsed.transactions);
    expect(anchor.evidence.method).toBe("status-boundary");
    expect(anchor.date.getFullYear()).toBe(2026);
    expect(anchor.date.getMonth()).toBe(5);
    expect(anchor.date.getDate()).toBe(26);
  });

  it("assigns the July payment to the invoice closed in June", () => {
    const input = JSON.parse(readFileSync("json_pluggy_c6_jef.json", "utf8"));
    const analysis = inferInvoices(parseOpenFinanceJson(input));
    const july = analysis.invoices.find((invoice) => invoice.key === "2026-07");
    expect(july?.closingDate.getDate()).toBe(26);
    expect(july?.closingDate.getMonth()).toBe(5);
    expect(july?.payments).toBe(829.13);
    expect(july?.debits).toBe(829.13);
  });

  it("infers another closing day from a different status boundary", () => {
    const input = [
      { id: "a", date: "2026-01-13T12:00:00Z", amount: 100, type: "DEBIT", status: "POSTED", description: "Compra A" },
      { id: "b", date: "2026-01-15T12:00:00Z", amount: 50, type: "DEBIT", status: "PENDING", description: "Compra B" },
      { id: "c", date: "2026-01-22T12:00:00Z", amount: -100, type: "CREDIT", status: "PENDING", description: "Pagamento de fatura" },
    ];
    const parsed = parseOpenFinanceJson(input);
    const anchor = inferAnchorForInspection(parsed.transactions);
    expect(anchor.date.getDate()).toBe(14);
    const analysis = inferInvoices(parsed);
    expect(analysis.invoices.some((invoice) => invoice.closingDate.getDate() === 14)).toBe(true);
  });

  it("sums foreign purchases using the account currency amount", () => {
    const input = [
      { id: "a", date: "2026-01-13T12:00:00Z", amount: 20, amountInAccountCurrency: 109.5, currencyCode: "USD", type: "DEBIT", status: "POSTED", description: "Compra USD" },
      { id: "b", date: "2026-01-15T12:00:00Z", amount: 50, currencyCode: "BRL", type: "DEBIT", status: "PENDING", description: "Compra BRL" },
    ];
    const analysis = inferInvoices(parseOpenFinanceJson(input));
    expect(analysis.invoices.reduce((sum, invoice) => sum + invoice.debits, 0)).toBe(159.5);
  });
});
