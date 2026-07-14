import { CalendarDays, Check, Info, Landmark, WalletCards } from "lucide-react";
import { formatCurrency, formatDate, formatMonth } from "../domain/date";
import type { Invoice } from "../domain/types";
import { TransactionTable } from "./TransactionTable";

const confidenceCopy = { high: "Alta confiança", medium: "Confiança média", low: "Baixa confiança" };

export function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  return (
    <div className="invoice-detail">
      <div className="invoice-title-row">
        <div>
          <div className="invoice-state">{invoice.isOpen ? "Ciclo em aberto" : <><Check size={14} /> Ciclo fechado</>}</div>
          <h2>{formatMonth(invoice.key)}</h2>
        </div>
        <div className={`confidence-badge ${invoice.confidence}`}><span />{confidenceCopy[invoice.confidence]}</div>
      </div>

      <section className="statement-card">
        <div className="statement-brand"><WalletCards size={24} /><span>Resumo da fatura</span></div>
        <div className="main-total"><span>Créditos totais</span><strong>{formatCurrency(invoice.credits)}</strong><small>Valor de referência identificado no arquivo</small></div>
        <div className="statement-grid">
          <div><span>Fechamento estimado</span><strong><CalendarDays size={16} /> {formatDate(invoice.closingDate)}</strong></div>
          <div><span>Pagamento identificado</span><strong><Landmark size={16} /> {formatDate(invoice.paymentDate)}</strong></div>
          <div><span>Total debitado</span><strong>{formatCurrency(invoice.debits)}</strong></div>
          <div><span>Compras líquidas</span><strong>{formatCurrency(invoice.netPurchases)}</strong></div>
        </div>
        <div className="credit-breakdown">
          <div><span>Pagamento do usuário</span><strong>{formatCurrency(invoice.payments)}</strong></div>
          <div><span>Outros créditos / estornos</span><strong>{formatCurrency(invoice.otherCredits)}</strong></div>
          <div><span>Saldo após todos os créditos</span><strong className={invoice.balanceAfterCredits < 0 ? "negative" : ""}>{formatCurrency(invoice.balanceAfterCredits)}</strong></div>
        </div>
      </section>

      <section className="evidence-strip">
        <Info size={18} />
        <div><strong>{invoice.evidence.label}</strong><span>{invoice.evidence.detail}</span></div>
      </section>

      <TransactionTable transactions={invoice.transactions} />
    </div>
  );
}
