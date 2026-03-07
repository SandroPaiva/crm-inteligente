import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Upload, ChevronRight, CheckCircle, AlertTriangle,
  AlertCircle, ArrowRight, FileText, Eye, RotateCcw
} from "lucide-react";
import clsx from "clsx";
import api from "../services/api";

// ─── Field definitions ───────────────────────────────────────────────────────

interface DestField {
  key: string;
  label: string;
  required: boolean;
  description: string;
}

const DEST_FIELDS: DestField[] = [
  { key: 'nome',            label: 'Nome',                required: true,  description: 'Nome completo do lead' },
  { key: 'email_primario',  label: 'E-mail',              required: true,  description: 'E-mail principal' },
  { key: 'celular_primario',label: 'Celular / Telefone',  required: true,  description: 'Número de contato principal' },
  { key: 'origem',          label: 'Origem',              required: false, description: 'Canal de origem (ex: Landing Page)' },
  { key: 'interesse',       label: 'Interesse',           required: false, description: 'Produto ou tipo de imóvel de interesse' },
  { key: 'genero',          label: 'Gênero',              required: false, description: 'masculino / feminino / outros' },
  { key: 'corretor',        label: 'Corretor',            required: false, description: 'Nome do corretor (deve existir no sistema)' },
  { key: 'empreendimento',  label: 'Empreendimento',      required: false, description: 'Nome do empreendimento (deve existir no sistema)' },
  { key: '__ignore__',      label: 'Ignorar coluna',      required: false, description: 'Esta coluna não será importada' },
];

// ─── Auto-detect mapping ──────────────────────────────────────────────────────

const ALIASES: Record<string, string[]> = {
  nome:             ['nome', 'name', 'contato', 'cliente', 'lead', 'nomecontato', 'nomecliente'],
  email_primario:   ['email', 'email_primario', 'e-mail', 'emailprimario', 'correio', 'mail'],
  celular_primario: ['celular', 'telefone', 'phone', 'cel', 'whatsapp', 'fone', 'celular_primario', 'tel'],
  origem:           ['origem', 'source', 'canal', 'origin', 'fontenolead'],
  interesse:        ['interesse', 'interest', 'produto', 'product', 'tipoimovel'],
  genero:           ['genero', 'gênero', 'gender', 'sexo', 'sex'],
  corretor:         ['corretor', 'broker', 'vendedor', 'responsavel', 'resp', 'agente', 'atendente'],
  empreendimento:   ['empreendimento', 'projeto', 'property', 'imovel', 'imóvel', 'desenvolvimento', 'product', 'predio'],
};

function autoDetect(header: string): string {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [field, aliases] of Object.entries(ALIASES)) {
    if (aliases.some(a => a.replace(/[^a-z0-9]/g, '') === normalized)) return field;
  }
  return '__ignore__';
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect separator
  const sep = lines[0].includes(';') ? ';' : ',';

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  }).filter(row => Object.values(row).some(v => v.trim() !== ''));

  return { headers, rows };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onImportDone: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeadImportWizard({ onClose, onImportDone }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // csvHeader -> destKey
  const [fileName, setFileName] = useState('');

  // System data for validation
  const [corretores, setCorretores] = useState<string[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);

  // Import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    api.get('/usuarios/').then(r => setCorretores(r.data.map((u: any) => u.nome))).catch(() => setCorretores([]));
    api.get('/empreendimentos/').then(r => setEmpreendimentos(r.data.map((e: any) => e.nome))).catch(() => setEmpreendimentos([]));
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      let text = e.target?.result as string;
      // Strip BOM
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
      // Auto-detect mapping
      const autoMap: Record<string, string> = {};
      headers.forEach(h => { autoMap[h] = autoDetect(h); });
      setMapping(autoMap);
      setStep('mapping');
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  // Count which dest fields are mapped
  const mappedDests = Object.values(mapping).filter(v => v !== '__ignore__');
  const requiredMapped = ['nome', 'email_primario', 'celular_primario'].every(r => mappedDests.includes(r));

  // Build preview rows applying mapping
  const previewRows = csvRows.slice(0, 5).map(row => {
    const out: Record<string, string> = {};
    csvHeaders.forEach(h => {
      const dest = mapping[h];
      if (dest && dest !== '__ignore__') out[dest] = row[h] || '';
    });
    return out;
  });

  // Validate corretor/empreendimento in preview
  const validateRow = (row: Record<string, string>) => {
    const warnings: string[] = [];
    if (row.corretor && !corretores.some(c => c.toLowerCase().includes(row.corretor.toLowerCase()))) {
      warnings.push(`Corretor "${row.corretor}" não encontrado`);
    }
    if (row.empreendimento && !empreendimentos.some(e => e.toLowerCase().includes(row.empreendimento.toLowerCase()))) {
      warnings.push(`Empreendimento "${row.empreendimento}" não encontrado`);
    }
    return warnings;
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      // Build rows from mapping
      const rows = csvRows.map(row => {
        const out: Record<string, string> = {};
        csvHeaders.forEach(h => {
          const dest = mapping[h];
          if (dest && dest !== '__ignore__') out[dest] = row[h] || '';
        });
        return out;
      });
      const res = await api.post('/leads/importar-json', { rows });
      setImportResult(res.data);
      onImportDone();
      setStep('result');
    } catch (err: any) {
      setImportResult({ erro: err?.response?.data?.detail || 'Erro ao importar.' });
      setStep('result');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setFileName('');
    setImportResult(null);
  };

  const stepLabels: Record<Step, string> = {
    upload: '1. Carregar arquivo',
    mapping: '2. Mapear campos',
    preview: '3. Pré-visualizar',
    result: '4. Resultado',
  };
  const stepOrder: Step[] = ['upload', 'mapping', 'preview', 'result'];
  const currentStepIdx = stepOrder.indexOf(step);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Importar Leads via CSV</h2>
              <p className="text-xs text-gray-500 mt-0.5">Mapeie os campos do seu arquivo com os campos do sistema</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {stepOrder.map((s, idx) => (
              <div key={s} className="flex items-center gap-1">
                <div className={clsx(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all",
                  idx < currentStepIdx  ? "bg-emerald-100 text-emerald-700" :
                  idx === currentStepIdx ? "bg-blue-600 text-white" :
                                          "bg-gray-100 text-gray-400"
                )}>
                  {idx < currentStepIdx ? <CheckCircle className="w-3 h-3" /> : <span>{idx + 1}</span>}
                  {stepLabels[s].split('. ')[1]}
                </div>
                {idx < stepOrder.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div className="bg-blue-50 rounded-xl p-4 text-sm space-y-2">
                <p className="font-bold text-blue-900">Formato esperado</p>
                <p className="text-blue-700 text-xs">O arquivo pode ter qualquer nome de coluna — você irá mapeá-los no próximo passo.</p>
                <div className="bg-blue-100 rounded-lg p-2 font-mono text-xs text-blue-700 overflow-x-auto whitespace-nowrap">
                  Nome, Telefone, Email, Origem, Interesse, Corretor, Empreendimento
                </div>
                <p className="text-xs text-blue-600">
                  ✅ Aceita separadores por vírgula ou ponto-e-vírgula &nbsp;|&nbsp; ✅ Codificação UTF-8 ou Excel (ANSI)
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
              >
                <Upload className="w-10 h-10 text-gray-300 group-hover:text-blue-400 mx-auto mb-3 transition-colors" />
                <p className="font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">
                  Clique ou arraste o arquivo CSV aqui
                </p>
                <p className="text-xs text-gray-400 mt-1">Formatos: .csv (UTF-8 ou Excel)</p>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            </div>
          )}

          {/* ── Step 2: Mapping ── */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Arquivo: <span className="font-semibold text-gray-800">{fileName}</span> —{' '}
                  <span className="text-blue-600 font-semibold">{csvRows.length} linhas</span>
                </p>
                <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <RotateCcw className="w-3.5 h-3.5" /> Trocar arquivo
                </button>
              </div>

              {!requiredMapped && (
                <div className="flex items-center gap-2 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Campos obrigatórios não mapeados: <strong>Nome</strong>, <strong>E-mail</strong> e <strong>Celular</strong>.</span>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-2.5 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Coluna no CSV</th>
                      <th className="py-2.5 px-4 text-center text-xs font-bold text-gray-400 w-8"><ArrowRight className="w-4 h-4 mx-auto" /></th>
                      <th className="py-2.5 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Campo no sistema</th>
                      <th className="py-2.5 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Exemplo do CSV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {csvHeaders.map(h => {
                      const destKey = mapping[h] || '__ignore__';
                      const destField = DEST_FIELDS.find(f => f.key === destKey);
                      const isAutoMapped = autoDetect(h) !== '__ignore__';
                      const example = csvRows[0]?.[h] || '—';

                      return (
                        <tr key={h} className={clsx("transition-colors", destKey === '__ignore__' ? "bg-gray-50/60 opacity-70" : "bg-white")}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="font-mono text-sm text-gray-800">{h}</span>
                              {isAutoMapped && destKey !== '__ignore__' && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">auto</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 text-center text-gray-300">→</td>
                          <td className="py-3 px-4">
                            <select
                              value={destKey}
                              onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                              className={clsx(
                                "w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                                destKey === '__ignore__' ? "border-gray-200 text-gray-400 bg-gray-50" : "border-blue-200 text-gray-800 bg-white"
                              )}
                            >
                              {DEST_FIELDS.map(f => (
                                <option key={f.key} value={f.key} disabled={f.key !== '__ignore__' && f.key !== destKey && mappedDests.includes(f.key)}>
                                  {f.key === '__ignore__' ? '— Ignorar coluna —' : `${f.label}${f.required ? ' *' : ''}`}
                                </option>
                              ))}
                            </select>
                            {destField && destField.key !== '__ignore__' && (
                              <p className="text-[10px] text-gray-400 mt-1 pl-1">{destField.description}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500 font-mono max-w-[140px] truncate" title={example}>
                            {example}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Step 3: Preview ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Prévia das primeiras <span className="font-semibold">5 linhas</span> com o mapeamento aplicado.
                  Total: <span className="font-semibold text-blue-600">{csvRows.length} leads</span> serão importados.
                </p>
              </div>

              <div className="info-note bg-blue-50 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Corretor e Empreendimento</strong> são buscados por nome no sistema. Se não encontrados,
                  o lead ainda é importado mas esses campos ficam em branco (detalhes no resultado).
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="text-sm w-full min-w-max">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {Object.keys(previewRows[0] || {}).map(k => {
                        const f = DEST_FIELDS.find(d => d.key === k);
                        return (
                          <th key={k} className="py-2 px-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {f?.label || k}
                          </th>
                        );
                      })}
                      <th className="py-2 px-3 text-left text-xs font-bold text-amber-500 uppercase tracking-wider">Avisos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.map((row, i) => {
                      const warnings = validateRow(row);
                      return (
                        <tr key={i} className={clsx(warnings.length > 0 ? "bg-amber-50" : "bg-white")}>
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="py-2.5 px-3 text-gray-700 max-w-[160px] truncate" title={v}>{v || <span className="text-gray-300">—</span>}</td>
                          ))}
                          <td className="py-2.5 px-3">
                            {warnings.length > 0 ? (
                              <div className="space-y-1">
                                {warnings.map((w, wi) => (
                                  <div key={wi} className="flex items-center gap-1 text-xs text-amber-700">
                                    <AlertTriangle className="w-3 h-3 shrink-0" /> {w}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {csvRows.length > 5 && (
                <p className="text-xs text-gray-400 text-center">... e mais {csvRows.length - 5} linhas não exibidas na prévia.</p>
              )}
            </div>
          )}

          {/* ── Step 4: Result ── */}
          {step === 'result' && importResult && (
            <div className="space-y-4">
              {importResult.erro ? (
                <div className="flex items-start gap-3 bg-red-50 rounded-xl p-4">
                  <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-700 text-base">Erro na importação</p>
                    <p className="text-sm text-red-600 mt-1">{importResult.erro}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 bg-emerald-50 rounded-xl p-4">
                    <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-700 text-base">Importação concluída!</p>
                      <div className="flex gap-6 mt-2 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-black text-emerald-700">{importResult.importados}</div>
                          <div className="text-xs text-emerald-600">Importados</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-gray-500">{importResult.ignorados_duplicados}</div>
                          <div className="text-xs text-gray-500">Duplicados ignorados</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-red-500">{importResult.erros?.length ?? 0}</div>
                          <div className="text-xs text-red-500">Erros</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corretor warnings */}
                  {importResult.avisos_corretor?.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <p className="font-semibold text-amber-800 text-sm">Avisos sobre Corretores</p>
                      </div>
                      <p className="text-xs text-amber-700 mb-2">
                        Os corretores abaixo não foram encontrados no sistema. Os leads foram importados, mas sem corretor atribuído.
                        Para resolver, verifique se os nomes estão corretos em <strong>Equipe → Usuários</strong>.
                      </p>
                      <ul className="text-xs text-amber-700 space-y-1 max-h-28 overflow-y-auto">
                        {importResult.avisos_corretor.map((w: string, i: number) => <li key={i}>• {w}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Empreendimento warnings */}
                  {importResult.avisos_empreendimento?.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <p className="font-semibold text-amber-800 text-sm">Avisos sobre Empreendimentos</p>
                      </div>
                      <p className="text-xs text-amber-700 mb-2">
                        Os empreendimentos abaixo não foram encontrados. Os leads foram importados sem empreendimento.
                        Cadastre os empreendimentos em <strong>Empreendimentos</strong> e vincule os leads manualmente.
                      </p>
                      <ul className="text-xs text-amber-700 space-y-1 max-h-28 overflow-y-auto">
                        {importResult.avisos_empreendimento.map((w: string, i: number) => <li key={i}>• {w}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Row errors */}
                  {importResult.erros?.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <p className="font-semibold text-red-800 text-sm">Linhas com erros</p>
                      </div>
                      <ul className="text-xs text-red-700 space-y-1 max-h-28 overflow-y-auto">
                        {importResult.erros.map((e: string, i: number) => <li key={i}>• {e}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between shrink-0">
          <div>
            {step !== 'upload' && step !== 'result' && (
              <button
                onClick={() => setStep(stepOrder[currentStepIdx - 1] as Step)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                ← Voltar
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={step === 'result' ? onClose : onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors">
              {step === 'result' ? 'Fechar' : 'Cancelar'}
            </button>

            {step === 'upload' && (
              <p className="text-xs text-gray-400 italic">Selecione um arquivo para continuar</p>
            )}
            {step === 'mapping' && (
              <button
                disabled={!requiredMapped}
                onClick={() => setStep('preview')}
                className={clsx("flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                  requiredMapped ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-400 cursor-not-allowed")}
              >
                <Eye className="w-4 h-4" /> Pré-visualizar
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {importing
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importando...</>
                  : <><Upload className="w-4 h-4" /> Confirmar e Importar {csvRows.length} leads</>
                }
              </button>
            )}
            {step === 'result' && !importResult?.erro && (
              <button onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                <RotateCcw className="w-4 h-4" /> Importar outro arquivo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
