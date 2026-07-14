export type TransactionKind = "debit" | "payment" | "other-credit";
export type Confidence = "high" | "medium" | "low";

export interface NormalizedTransaction {
  id: string;
  accountId?: string;
  cardNumber?: string;
  date: Date;
  dateSource: string;
  description: string;
  status: string;
  originalType: string;
  originalAmount: number;
  currencyCode: string;
  amountInAccountCurrency?: number;
  conversionMissing: boolean;
  amount: number;
  kind: TransactionKind;
  raw: Record<string, unknown>;
}

export interface ClosingEvidence {
  method: "explicit-field" | "status-boundary" | "payment-pattern" | "fallback";
  label: string;
  detail: string;
  confidence: Confidence;
}

export interface InferredClosing {
  invoiceKey: string;
  closingDate: Date;
  paymentDate?: Date;
  evidence: ClosingEvidence;
  isOpen: boolean;
}

export interface Invoice {
  key: string;
  closingDate: Date;
  paymentDate?: Date;
  transactions: NormalizedTransaction[];
  debits: number;
  credits: number;
  payments: number;
  otherCredits: number;
  netPurchases: number;
  balanceAfterCredits: number;
  confidence: Confidence;
  evidence: ClosingEvidence;
  isOpen: boolean;
}

export interface AnalysisResult {
  transactions: NormalizedTransaction[];
  invoices: Invoice[];
  warnings: string[];
  sourcePath: string;
  paymentDetection: "description" | "recurrence" | "none";
}

export interface ParseResult {
  transactions: NormalizedTransaction[];
  warnings: string[];
  sourcePath: string;
  paymentDetection: "description" | "recurrence" | "none";
}
