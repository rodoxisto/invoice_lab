import type { NormalizedTransaction, ParseResult, TransactionKind } from "../domain/types";

const DATE_FIELDS = ["date", "transactionDate", "bookedAt", "postedAt", "createdDate", "eventDate"];
const AMOUNT_FIELDS = ["amount", "value", "transactionAmount", "amountInAccountCurrency"];
const DESCRIPTION_FIELDS = ["description", "descriptionRaw", "merchantName", "memo", "title", "name"];
const STATUS_FIELDS = ["status", "transactionStatus", "state"];
const TYPE_FIELDS = ["type", "transactionType", "creditDebitType", "operationType"];
const PAYMENT_PATTERN = /(?:inclus[aã]o de )?pagamento(?: da| de)? fatura|pagamento ciclo|payment received|credit card payment|pagto fatura/i;
const REFUND_PATTERN = /refund|estorno|reembolso|chargeback/i;

function firstValue(record: Record<string, unknown>, fields: string[]): unknown {
  for (const field of fields) {
    if (record[field] !== undefined && record[field] !== null && record[field] !== "") return record[field];
  }
  return undefined;
}

function isTransactionArray(value: unknown): value is Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const objects = value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as Record<string, unknown>[];
  if (objects.length < Math.max(1, value.length * 0.6)) return false;
  return objects.some((item) => firstValue(item, DATE_FIELDS) && firstValue(item, AMOUNT_FIELDS) !== undefined);
}

function findTransactionArray(value: unknown, path = "$", depth = 0): { rows: Record<string, unknown>[]; path: string } | null {
  if (depth > 6 || value === null || value === undefined) return null;
  if (isTransactionArray(value)) return { rows: value, path };
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = findTransactionArray(value[i], `${path}[${i}]`, depth + 1);
      if (found) return found;
    }
  } else if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const prioritized = entries.sort(([a], [b]) => Number(/transactions|items|results|data/i.test(b)) - Number(/transactions|items|results|data/i.test(a)));
    for (const [key, child] of prioritized) {
      const found = findTransactionArray(child, `${path}.${key}`, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  const decimal = normalized.includes(",")
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized;
  const parsed = Number(decimal);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function classify(amount: number, type: string, description: string): TransactionKind {
  const isCredit = amount < 0 || /credit|cr[eé]dito/i.test(type);
  if (isCredit && PAYMENT_PATTERN.test(description)) return "payment";
  if (isCredit || REFUND_PATTERN.test(description)) return "other-credit";
  return "debit";
}

function markRecurringPayments(rows: NormalizedTransaction[]): boolean {
  if (rows.some((row) => row.kind === "payment")) return false;
  const credits = rows.filter((row) => row.kind === "other-credit" && row.amount >= 50).sort((a, b) => a.date.getTime() - b.date.getTime());
  if (credits.length < 3) return false;
  const recurring = credits.filter((candidate, index) => {
    const before = index > 0 ? Math.abs((candidate.date.getTime() - credits[index - 1].date.getTime()) / 86_400_000) : null;
    const after = index < credits.length - 1 ? Math.abs((credits[index + 1].date.getTime() - candidate.date.getTime()) / 86_400_000) : null;
    return (before !== null && before >= 20 && before <= 42) || (after !== null && after >= 20 && after <= 42);
  });
  if (recurring.length < 3) return false;
  recurring.forEach((row) => { row.kind = "payment"; });
  return true;
}

export function parseOpenFinanceJson(input: unknown): ParseResult {
  const found = findTransactionArray(input);
  if (!found) throw new Error("Não foi encontrada uma lista de transações com data e valor.");

  const warnings: string[] = [];
  const transactions: NormalizedTransaction[] = [];
  found.rows.forEach((raw, index) => {
    const dateRaw = firstValue(raw, DATE_FIELDS);
    const amountRaw = firstValue(raw, AMOUNT_FIELDS);
    const date = parseDate(dateRaw);
    const originalAmount = parseAmount(amountRaw);
    if (!date || originalAmount === null) {
      warnings.push(`Linha ${index + 1} ignorada: data ou valor inválido.`);
      return;
    }
    const description = String(firstValue(raw, DESCRIPTION_FIELDS) ?? "Lançamento sem descrição").trim();
    const type = String(firstValue(raw, TYPE_FIELDS) ?? "").trim();
    const status = String(firstValue(raw, STATUS_FIELDS) ?? "UNKNOWN").toUpperCase();
    const kind = classify(originalAmount, type, description);
    const cardMetadata = raw.creditCardMetadata && typeof raw.creditCardMetadata === "object" ? raw.creditCardMetadata as Record<string, unknown> : undefined;
    transactions.push({
      id: String(raw.id ?? raw.providerId ?? `${date.toISOString()}-${index}`),
      accountId: raw.accountId ? String(raw.accountId) : undefined,
      cardNumber: cardMetadata?.cardNumber ? String(cardMetadata.cardNumber) : undefined,
      date,
      dateSource: String(dateRaw),
      description,
      status,
      originalType: type,
      originalAmount,
      amount: Math.abs(originalAmount),
      kind,
      raw,
    });
  });
  if (!transactions.length) throw new Error("Nenhuma transação válida foi encontrada.");
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
  const hadDescriptionPayment = transactions.some((row) => row.kind === "payment");
  const usedRecurrence = markRecurringPayments(transactions);
  return {
    transactions,
    warnings,
    sourcePath: found.path,
    paymentDetection: hadDescriptionPayment ? "description" : usedRecurrence ? "recurrence" : "none",
  };
}
