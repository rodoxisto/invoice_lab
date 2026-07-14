import { CheckCircle2, CircleDashed } from "lucide-react";
import { formatCurrency, formatMonth } from "../domain/date";
import type { Invoice } from "../domain/types";

interface InvoiceListProps {
  invoices: Invoice[];
  selected: string;
  onSelect: (key: string) => void;
}

export function InvoiceList({ invoices, selected, onSelect }: InvoiceListProps) {
  return (
    <aside className="invoice-list" aria-label="Faturas encontradas">
      <div className="list-heading">
        <span>Faturas encontradas</span>
        <strong>{invoices.length}</strong>
      </div>
      <div className="invoice-list-scroll">
        {invoices.map((invoice) => (
          <button key={`${invoice.key}-${invoice.closingDate.toISOString()}`} className={`invoice-list-item ${selected === invoice.key ? "active" : ""}`} onClick={() => onSelect(invoice.key)}>
            <span className={`status-dot ${invoice.isOpen ? "open" : "closed"}`}>{invoice.isOpen ? <CircleDashed size={16} /> : <CheckCircle2 size={16} />}</span>
            <span className="invoice-list-copy">
              <strong>{formatMonth(invoice.key)}</strong>
              <small>{invoice.isOpen ? "Fatura aberta" : "Fatura fechada"}</small>
            </span>
            <span className="invoice-list-value">{formatCurrency(invoice.credits || invoice.debits)}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
