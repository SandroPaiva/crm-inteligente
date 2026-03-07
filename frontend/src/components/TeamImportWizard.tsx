import { useState, useRef, useCallback } from "react";
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
  { key: 'nome',    label: 'Nome',    required: true,  description: 'Nome completo' },
  { key: 'email',   label: 'E-mail',  required: true,  description: 'E-mail de login' },
  { key: 'senha',   label: 'Senha',   required: false, description: 'Senha provisória (padrão se vazio)' },
  { key: 'papel',   label: 'Nível',   required: false, description: 'admin, gerente, corretor' },
  { key: '__ignore__', label: 'Ignorar', required: false, description: 'Não importa esta coluna' },
];

const ALIASES: Record<string, string[]> = {
  nome:  ['nome', 'name', 'colaborador', 'funcionario', 'usuario', 'usuário'],
  email: ['email', 'e-mail', 'mail', 'conta', 'login'],
  senha: ['senha', 'password', 'pass', 'codigo'],
  papel: ['papel', 'role', 'nivel', 'nível', 'acesso', 'permissao', 'perfil', 'cargo'],
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

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onImportDone: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

export default function TeamImportWizard({ onClose, onImportDone }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState('');

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      let text = e.target?.result as string;
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
      
      const autoMap: Record<string, string> = {};
      headers.forEach(h => { autoMap[h] = autoDetect(h); });
      setMapping(autoMap);
      setStep('mapping');
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  const mappedDests = Object.values(mapping).filter(v => v !== '__ignore__');
  const requiredMapped = ['nome', 'email'].every(r => mappedDests.includes(r));

  const previewRows = csvRows.slice(0, 5).map(row => {
    const out: Record<string, string> = {};
    csvHeaders.forEach(h => {
      const dest = mapping[h];
      if (dest && dest !== '__ignore__') out[dest] = row[h] || '';
    });
    return out;
  });

  const handleImport = async () => {
    setImporting(true);
    try {
      const rows = csvRows.map(row => {
        const out: Record<string, string> = {};
        csvHeaders.forEach(h => {
          const dest = mapping[h];
          if (dest && dest !== '__ignore__') out[dest] = row[h] || '';
        });
        return out;
      });
      const res = await api.post('/usuarios/importar-json', { rows });
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Importar Equipe via CSV</h2>
              <p className="text-sm text-gray-500 mt-1">Carregue sua base de colaboradores em massa para o CRM</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
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
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-5 text-sm space-y-3">
                <p className="font-bold text-blue-900">Formato esperado do CSV</p>
                <div className="bg-blue-100 rounded-lg p-3 font-mono text-xs text-blue-800">
                  Nome, Email, Senha(Opcional), Papel(Opcional)
                </div>
                <p className="text-xs text-blue-700">
                  O nome e o email da linha farão o usuário ser criado na base. As senhas em branco serão montadas por padrão geradas pelo e-mail e os papéis não fornecidos serão tidos como "Corretor".
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
                  Clique ou arraste a lista de usuários aqui
                </p>
                <p className="text-xs text-gray-400 mt-1">.csv (UTF-8)</p>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Arquivo: <span className="font-semibold text-gray-800">{fileName}</span> —{' '}
                  <span className="text-blue-600 font-semibold">{csvRows.length} linhas</span> encontradas.
                </p>
                <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <RotateCcw className="w-3.5 h-3.5" /> Trocar arquivo
                </button>
              </div>

              {!requiredMapped && (
                <div className="flex items-center gap-2 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Campos obrigatórios não identificados: <strong>Nome</strong> e <strong>E-mail</strong>.</span>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-2.5 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Sua Coluna (CSV)</th>
                      <th className="py-2.5 px-4 text-center w-8"><ArrowRight className="w-4 h-4 mx-auto text-gray-300" /></th>
                      <th className="py-2.5 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Destino CRM</th>
                      <th className="py-2.5 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amostra de Dado</th>
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
                              <span className="font-mono text-sm text-gray-800 truncate" title={h}>{h}</span>
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
                                "w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 transition-colors",
                                destKey === '__ignore__' ? "border-gray-200 text-gray-400 bg-gray-50 focus:ring-gray-300" : "border-blue-200 focus:border-blue-500 text-gray-800 bg-white"
                              )}
                            >
                              {DEST_FIELDS.map(f => (
                                <option key={f.key} value={f.key} disabled={f.key !== '__ignore__' && f.key !== destKey && mappedDests.includes(f.key)}>
                                  {f.key === '__ignore__' ? '— Ignorar —' : `${f.label}${f.required ? ' *' : ''}`}
                                </option>
                              ))}
                            </select>
                            {destField && destField.key !== '__ignore__' && (
                              <p className="text-[10px] text-gray-400 mt-1 pl-1">{destField.description}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500 font-mono truncate max-w-[140px]" title={example}>{example}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Visualizando as primeiras <span className="font-semibold px-1">5</span> linhas da base de funcionários mapeados.
              </p>
              
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="text-sm w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {Object.keys(previewRows[0] || {}).map(k => {
                        const f = DEST_FIELDS.find(d => d.key === k);
                        return <th key={k} className="py-2.5 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{f?.label || k}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="py-3 px-4 text-gray-700 max-w-[200px] truncate" title={v}>{v || <span className="text-gray-300">—</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4 flex gap-3 mt-4 text-sm text-blue-800">
                 <AlertCircle className="w-5 h-5 shrink-0 text-blue-500" />
                 <p>Ao importar <b>{csvRows.length} usuários</b>, eles poderão acessar o CRM instantaneamente utilizando as planilhas definidas ou o e-mail cadastrado usando o padrão criado. Gerentes ou Admins poderão resetar essas senhas depois.</p>
              </div>
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="space-y-4">
              {importResult.erro ? (
                <div className="flex items-start gap-4 bg-red-50/50 border border-red-100 rounded-xl p-5 fade-in">
                  <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                  <div>
                    <p className="font-bold text-red-800 text-lg">Houve um bloqueio</p>
                    <p className="text-red-600 mt-1.5">{importResult.erro}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-4 bg-emerald-50 border border-emerald-100 rounded-xl p-5 pt-6 pb-6 shadow-sm fade-in">
                    <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-800 text-xl">Importação Finalizada!</p>
                      <div className="grid grid-cols-3 gap-8 mt-5">
                        <div>
                          <p className="text-4xl font-black text-emerald-600">{importResult.importados}</p>
                          <p className="text-xs font-medium text-emerald-700 mt-1 uppercase tracking-wider">Criados</p>
                        </div>
                        <div>
                          <p className="text-4xl font-black text-gray-400">{importResult.ignorados_duplicados}</p>
                          <p className="text-xs font-medium text-gray-600 mt-1 uppercase tracking-wider">E-mails Duplicados</p>
                        </div>
                        <div>
                          <p className="text-4xl font-black text-red-500/80">{importResult.erros?.length ?? 0}</p>
                          <p className="text-xs font-medium text-red-600 mt-1 uppercase tracking-wider">Erros/Incompatíveis</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {importResult.erros?.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-100">
                      <p className="font-bold text-red-800 text-sm mb-2 uppercase tracking-wide">Relatório de Rejeição ({importResult.erros.length})</p>
                      <ul className="text-xs text-red-700 space-y-1.5 max-h-40 overflow-y-auto pl-2 border-l-2 border-red-200">
                        {importResult.erros.map((e: string, i: number) => <li key={i}>{e}</li>)}
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
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
              >
                Voltar
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-200 transition-colors">
              {step === 'result' ? 'Fechar a Tela' : 'Cancelar Tudo'}
            </button>

            {step === 'mapping' && (
              <button
                disabled={!requiredMapped}
                onClick={() => setStep('preview')}
                className={clsx("flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-colors",
                  requiredMapped ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg" : "bg-gray-100 text-gray-400 cursor-not-allowed")}
              >
                Ver Tabela <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}
            
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {importing
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adicionando os usuários...</>
                  : <><Upload className="w-4 h-4" /> Importar Lista Oficialmente</>
                }
              </button>
            )}
            
            {step === 'result' && !importResult?.erro && (
              <button onClick={reset}
                className="flex items-center gap-2 px-5 py-2 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
                <RotateCcw className="w-4 h-4" /> Enviar Nova Planilha
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
