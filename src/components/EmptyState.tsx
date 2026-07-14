import { FileJson2, LockKeyhole, UploadCloud } from "lucide-react";

interface EmptyStateProps {
  onFile: (file: File) => void;
  error?: string;
}

export function EmptyState({ onFile, error }: EmptyStateProps) {
  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <main className="empty-page">
      <section className="hero-copy">
        <div className="eyebrow"><span /> Simulador local de faturas</div>
        <h1>Do JSON para uma fatura que faz sentido.</h1>
        <p>Importe as transações do cartão. O Invoice Lab encontra o corte, separa compras de pagamentos e organiza cada ciclo para conferência.</p>
        <div className="privacy-note"><LockKeyhole size={16} /> Seus dados ficam somente neste navegador.</div>
      </section>

      <label
        className="drop-zone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); handleFiles(event.dataTransfer.files); }}
      >
        <input type="file" accept="application/json,.json" onChange={(event) => handleFiles(event.target.files)} />
        <div className="upload-icon"><UploadCloud size={30} /></div>
        <strong>Solte seu arquivo JSON aqui</strong>
        <span>ou clique para escolher</span>
        <div className="file-chip"><FileJson2 size={15} /> Open Finance · JSON</div>
        {error && <div className="upload-error">{error}</div>}
      </label>
    </main>
  );
}
