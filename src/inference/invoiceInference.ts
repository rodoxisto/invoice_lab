import { addDays, addMonthsClamped, diffDays, midpointDate, monthKey, startOfDay } from "../domain/date";
import type { AnalysisResult, ClosingEvidence, Confidence, InferredClosing, Invoice, NormalizedTransaction, ParseResult } from "../domain/types";

const EXPLICIT_CLOSING_FIELDS = ["closingDate", "closeDate", "invoiceClosingDate", "billingClosingDate", "dueDateClosing"];

function explicitClosingDates(transactions: NormalizedTransaction[]): Date[] {
  const dates: Date[] = [];
  for (const transaction of transactions) {
    for (const field of EXPLICIT_CLOSING_FIELDS) {
      const value = transaction.raw[field];
      if (typeof value !== "string" && typeof value !== "number") continue;
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) dates.push(startOfDay(parsed));
    }
  }
  return [...new Map(dates.map((date) => [date.getTime(), date])).values()].sort((a, b) => a.getTime() - b.getTime());
}

interface Anchor {
  date: Date;
  evidence: ClosingEvidence;
}

function inferAnchor(transactions: NormalizedTransaction[]): Anchor {
  const explicit = explicitClosingDates(transactions);
  if (explicit.length) {
    return {
      date: explicit.at(-1)!,
      evidence: { method: "explicit-field", label: "Campo explícito", detail: "O JSON contém uma data de fechamento reconhecida.", confidence: "high" },
    };
  }

  const pending = transactions.filter((row) => /pending|pendente|processing/i.test(row.status));
  const posted = transactions.filter((row) => /posted|completed|contabilizado|conclu/i.test(row.status));
  if (pending.length && posted.length) {
    const firstPending = pending[0].date;
    const priorPosted = posted.filter((row) => row.date < firstPending).at(-1)?.date;
    if (priorPosted) {
      const gap = diffDays(firstPending, priorPosted);
      if (gap >= 1 && gap <= 10) {
        const date = gap === 1 ? startOfDay(priorPosted) : midpointDate(priorPosted, firstPending);
        return {
          date,
          evidence: {
            method: "status-boundary",
            label: "Mudança de status",
            detail: `Último POSTED em ${priorPosted.toLocaleDateString("pt-BR")} e primeiro PENDING em ${firstPending.toLocaleDateString("pt-BR")}.`,
            confidence: gap <= 3 ? "high" : "medium",
          },
        };
      }
    }
  }

  const payments = transactions.filter((row) => row.kind === "payment");
  if (payments.length) {
    const payment = payments.at(-1)!;
    return {
      date: addDays(payment.date, -8),
      evidence: {
        method: "payment-pattern",
        label: "Padrão de pagamentos",
        detail: "Sem fronteira de status; estimativa de oito dias antes do pagamento mais recente.",
        confidence: "low",
      },
    };
  }

  const latest = transactions.at(-1)!.date;
  return {
    date: addDays(latest, -7),
    evidence: {
      method: "fallback",
      label: "Estimativa de segurança",
      detail: "O arquivo não possui fechamento, pagamentos recorrentes ou mudança de status suficiente.",
      confidence: "low",
    },
  };
}

function applyClosingOverrides(closings: InferredClosing[], overrides: Record<string, Date>): InferredClosing[] {
  return closings
    .map((closing) => {
      const override = overrides[closing.invoiceKey];
      if (!override || Number.isNaN(override.getTime())) return closing;
      const closingDate = startOfDay(override);
      return {
        ...closing,
        closingDate,
        isOpen: closingDate > new Date() || (!closing.paymentDate && closingDate >= new Date()),
        evidence: {
          method: "explicit-field" as const,
          label: "Ajuste manual desta fatura",
          detail: `Fechamento da fatura ${closing.invoiceKey} ajustado individualmente para ${closingDate.toLocaleDateString("pt-BR")}.`,
          confidence: "high" as const,
        },
      };
    })
    .sort((a, b) => a.closingDate.getTime() - b.closingDate.getTime());
}

function downgrade(confidence: Confidence): Confidence {
  return confidence === "high" ? "medium" : confidence;
}

function buildClosings(transactions: NormalizedTransaction[], anchor: Anchor): InferredClosing[] {
  const minDate = addDays(transactions[0].date, -35);
  const maxDate = addDays(transactions.at(-1)!.date, 45);
  const dates: Date[] = [];
  for (let offset = -36; offset <= 36; offset++) {
    const date = addMonthsClamped(anchor.date, offset);
    if (date >= minDate && date <= maxDate) dates.push(date);
  }
  dates.sort((a, b) => a.getTime() - b.getTime());
  const payments = transactions.filter((row) => row.kind === "payment");

  return dates.map((closingDate, index) => {
    const nextClosing = dates[index + 1];
    const payment = payments.find((row) => row.date > closingDate && (!nextClosing || row.date <= nextClosing));
    const key = payment ? monthKey(payment.date) : monthKey(addMonthsClamped(closingDate, 1));
    const isAnchor = closingDate.getTime() === startOfDay(anchor.date).getTime();
    const evidence = isAnchor ? anchor.evidence : {
      ...anchor.evidence,
      label: `${anchor.evidence.label} · ciclo projetado`,
      detail: `Fechamento projetado mensalmente a partir de ${anchor.date.toLocaleDateString("pt-BR")}.`,
      confidence: downgrade(anchor.evidence.confidence),
    };
    return {
      invoiceKey: key,
      closingDate,
      paymentDate: payment?.date,
      evidence,
      isOpen: closingDate > new Date() || (!payment && closingDate >= startOfDay(transactions.at(-1)!.date)),
    };
  });
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function invoiceFromClosing(closing: InferredClosing, transactions: NormalizedTransaction[]): Invoice {
  const debits = round(transactions.filter((row) => row.kind === "debit").reduce((sum, row) => sum + row.amount, 0));
  const payments = round(transactions.filter((row) => row.kind === "payment").reduce((sum, row) => sum + row.amount, 0));
  const otherCredits = round(transactions.filter((row) => row.kind === "other-credit").reduce((sum, row) => sum + row.amount, 0));
  const credits = round(payments + otherCredits);
  return {
    key: closing.invoiceKey,
    closingDate: closing.closingDate,
    paymentDate: closing.paymentDate,
    transactions: [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime()),
    debits,
    credits,
    payments,
    otherCredits,
    netPurchases: round(debits - otherCredits),
    balanceAfterCredits: round(debits - credits),
    confidence: closing.evidence.confidence,
    evidence: closing.evidence,
    isOpen: closing.isOpen,
  };
}

export function inferInvoices(parsed: ParseResult, closingOverrides: Record<string, Date> = {}): AnalysisResult {
  const { transactions } = parsed;
  const anchor = inferAnchor(transactions);
  const closings = applyClosingOverrides(buildClosings(transactions, anchor), closingOverrides);
  const grouped = new Map<InferredClosing, NormalizedTransaction[]>();
  closings.forEach((closing) => grouped.set(closing, []));

  for (const transaction of transactions) {
    let closing: InferredClosing | undefined;
    if (transaction.kind === "payment") {
      closing = [...closings].reverse().find((candidate) => candidate.closingDate <= transaction.date);
    } else {
      closing = closings.find((candidate) => candidate.closingDate >= startOfDay(transaction.date));
    }
    if (closing) grouped.get(closing)!.push(transaction);
  }

  const invoices = closings
    .map((closing) => invoiceFromClosing(closing, grouped.get(closing)!))
    .filter((invoice) => invoice.transactions.length > 0)
    .sort((a, b) => b.closingDate.getTime() - a.closingDate.getTime());

  const warnings = [...parsed.warnings];
  if (anchor.evidence.confidence === "low") warnings.push("A data de fechamento tem baixa confiança; confira o diagnóstico antes de comparar os totais.");
  if (parsed.paymentDetection === "recurrence") warnings.push("Pagamentos reconhecidos por recorrência, pois as descrições não eram conclusivas.");
  if (parsed.paymentDetection === "none") warnings.push("Nenhum pagamento de fatura foi identificado.");

  return { ...parsed, invoices, warnings };
}

export function inferAnchorForInspection(transactions: NormalizedTransaction[]): { date: Date; evidence: ClosingEvidence } {
  return inferAnchor(transactions);
}
