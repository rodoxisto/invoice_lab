import { useMemo, useState } from "react";
import { FileJson2, RotateCcw, Settings2, ShieldCheck } from "lucide-react";
import { EmptyState } from "./components/EmptyState";
import { InvoiceList } from "./components/InvoiceList";
import { InvoiceDetail } from "./components/InvoiceDetail";
import { Diagnostics } from "./components/Diagnostics";
import { inferInvoices } from "./inference/invoiceInference";
import { parseOpenFinanceJson } from "./parsers/jsonParser";
import type { AnalysisResult, ParseResult } from "./domain/types";

export default function App() {
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [accountKey, setAccountKey] = useState("all");
  const [overrideDate, setOverrideDate] = useState("");
  const [appliedOverride, setAppliedOverride] = useState<Date | undefined>();
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const accounts = useMemo(() => {
    if (!parsed) return [];
    const values = parsed.transactions.map((row) => row.accountId || row.cardNumber).filter(Boolean) as string[];
    return [...new Set(values)];
  }, [parsed]);

  const analysis: AnalysisResult | null = useMemo(() => {
    if (!parsed) return null;
    const filtered = accountKey === "all" ? parsed : { ...parsed, transactions: parsed.transactions.filter((row) => (row.accountId || row.cardNumber) === accountKey) };
    return inferInvoices(filtered, appliedOverride);
  }, [parsed, accountKey, appliedOverride]);

  const selectedInvoice = analysis?.invoices.find((invoice) => invoice.key === selectedKey) ?? analysis?.invoices[0];

  async function importFile(file: File) {
    setError("");
    try {
      if (!file.name.toLowerCase().endsWith(".json")) throw new Error("Escolha um arquivo com extensão .json.");
      const content = await file.text();
      const data = JSON.parse(content);
      const result = parseOpenFinanceJson(data);
      setParsed(result);
      setFileName(file.name);
      setSelectedKey("");
      const accountValues = result.transactions.map((row) => row.accountId || row.cardNumber).filter(Boolean) as string[];
      const uniqueAccounts = [...new Set(accountValues)];
      setAccountKey(uniqueAccounts.length > 1 ? uniqueAccounts[0] : "all");
      setAppliedOverride(undefined);
      setOverrideDate("");
    } catch (cause) {
      setError(cause instanceof SyntaxError ? "O arquivo não contém um JSON válido." : cause instanceof Error ? cause.message : "Não foi possível ler o arquivo.");
    }
  }

  function reset() {
    setParsed(null);
    setFileName("");
    setError("");
    setSelectedKey("");
    setAppliedOverride(undefined);
  }

  if (!analysis || !selectedInvoice) return <EmptyState onFile={importFile} error={error} />;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand"><span><FileJson2 size={22} /></span><div><strong>Invoice Lab</strong><small>Open Finance playground</small></div></div>
        <div className="header-actions">
          <div className="file-name"><ShieldCheck size={15} /><span>{fileName}</span></div>
          {accounts.length > 1 && <select value={accountKey} onChange={(event) => { setAccountKey(event.target.value); setSelectedKey(""); }}>{accounts.map((account) => <option value={account} key={account}>{account}</option>)}</select>}
          <button className="icon-button" title="Importar outro arquivo" onClick={reset}><RotateCcw size={18} /></button>
          <button className="diagnostic-button" onClick={() => setShowDiagnostics(true)}><Settings2 size={17} /> Diagnóstico</button>
        </div>
      </header>
      <div className="workspace">
        <InvoiceList invoices={analysis.invoices} selected={selectedInvoice.key} onSelect={setSelectedKey} />
        <main className="content"><InvoiceDetail invoice={selectedInvoice} /></main>
      </div>
      {showDiagnostics && <Diagnostics
        analysis={analysis}
        invoice={selectedInvoice}
        override={overrideDate}
        onOverride={setOverrideDate}
        onApply={() => { setAppliedOverride(new Date(`${overrideDate}T12:00:00`)); setSelectedKey(""); setShowDiagnostics(false); }}
        onReset={() => { setAppliedOverride(undefined); setOverrideDate(""); setSelectedKey(""); setShowDiagnostics(false); }}
        onClose={() => setShowDiagnostics(false)}
      />}
    </div>
  );
}
