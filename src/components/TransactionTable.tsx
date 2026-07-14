import { ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react";
import { formatCurrency, formatDate } from "../domain/date";
import type { NormalizedTransaction } from "../domain/types";

export function TransactionTable({ transactions }: { transactions: NormalizedTransaction[] }) {
  return (
    <section className="transactions-card">
      <div className="section-title">
        <div><span>Lançamentos</span><strong>{transactions.length} itens</strong></div>
        <ReceiptText size={20} />
      </div>
      <div className="transaction-table">
        <div className="transaction-head"><span>Data</span><span>Descrição</span><span>Natureza</span><span>Valor</span></div>
        {transactions.map((transaction) => {
          const isDebit = transaction.kind === "debit";
          const label = transaction.kind === "payment" ? "Pagamento" : transaction.kind === "other-credit" ? "Crédito" : "Compra";
          return (
            <div className="transaction-row" key={transaction.id}>
              <span className="transaction-date">{formatDate(transaction.date)}</span>
              <span className="transaction-description"><strong>{transaction.description}</strong><small>{transaction.status}</small></span>
              <span className={`nature-pill ${isDebit ? "debit" : "credit"}`}>{isDebit ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}{label}</span>
              <span className={`transaction-value ${isDebit ? "" : "credit"} ${transaction.conversionMissing ? "missing" : ""}`}>
                <strong>{transaction.conversionMissing ? "Conversão ausente" : `${isDebit ? "" : "− "}${formatCurrency(transaction.amount)}`}</strong>
                {transaction.currencyCode !== "BRL" && <small>{formatCurrency(Math.abs(transaction.originalAmount), transaction.currencyCode)} no lançamento</small>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
