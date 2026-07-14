import { AlertTriangle, Braces, CalendarClock, SlidersHorizontal, X } from "lucide-react";
import { formatDate } from "../domain/date";
import type { AnalysisResult, Invoice } from "../domain/types";

interface DiagnosticsProps {
  analysis: AnalysisResult;
  invoice: Invoice;
  override: string;
  onOverride: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function Diagnostics({ analysis, invoice, override, onOverride, onApply, onReset, onClose }: DiagnosticsProps) {
  return (
    <div className="diagnostic-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="diagnostic-panel">
        <div className="diagnostic-title"><div><SlidersHorizontal size={19} /><strong>Diagnóstico da inferência</strong></div><button onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>
        <div className="diagnostic-content">
          <div className="diagnostic-card primary"><CalendarClock size={20} /><div><span>Fechamento desta fatura</span><strong>{formatDate(invoice.closingDate)}</strong><small>{invoice.evidence.label}</small></div></div>
          <div className="diagnostic-card"><Braces size={20} /><div><span>Estrutura localizada</span><strong>{analysis.sourcePath}</strong><small>{analysis.transactions.length} transações normalizadas</small></div></div>
          <div className="diagnostic-copy"><strong>Como chegamos a esta data?</strong><p>{invoice.evidence.detail}</p><p>Compras e estornos vão para o primeiro fechamento posterior. Pagamentos são vinculados ao fechamento imediatamente anterior.</p></div>
          {analysis.warnings.length > 0 && <div className="warning-box"><AlertTriangle size={18} /><div><strong>Pontos para conferir</strong>{analysis.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div></div>}
          <div className="override-box">
            <strong>Ajuste para conferência</strong>
            <p>Informe uma data real do PDF. Os demais meses serão reprojetados automaticamente usando esse novo dia de corte.</p>
            <input type="date" value={override} onChange={(event) => onOverride(event.target.value)} />
            <div><button className="button secondary" onClick={onReset}>Restaurar inferência</button><button className="button primary" onClick={onApply} disabled={!override}>Aplicar data</button></div>
          </div>
        </div>
      </aside>
    </div>
  );
}
