import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Filter, Download, X, Upload, Calendar as CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from "clsx";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import LeadImportWizard from "../components/LeadImportWizard";

type SortKey = 'numero_sequencial' | 'nome' | 'celular_primario' | 'corretor' | 'status';
type SortDir = 'asc' | 'desc';
type DatePreset = '7' | '15' | '30' | 'custom' | null;

const STATUS_OPTIONS = ['novo', 'em_atendimento', 'proposta', 'negociacao', 'ganho', 'perdido'];

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active)
    return (
      <span className="inline-flex flex-col ml-1 opacity-30">
        <ArrowUp className="w-3 h-3 -mb-1" />
        <ArrowDown className="w-3 h-3" />
      </span>
    );
  return dir === 'asc'
    ? <ArrowUp className="inline w-3.5 h-3.5 ml-1 text-blue-600" />
    : <ArrowDown className="inline w-3.5 h-3.5 ml-1 text-blue-600" />;
}

export default function ContactsList() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);

  // --- Filter state ---
  const [searchText, setSearchText] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'numero' | 'nome' | 'celular' | 'corretor' | 'status'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [corretorFilter, setCorretorFilter] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>(null);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [corretores, setCorretores] = useState<any[]>([]);

  // --- Pagination state ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- Dropdown open state ---
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showDatePanel, setShowDatePanel] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  // --- Sort state ---
  const [sortKey, setSortKey] = useState<SortKey>('numero_sequencial');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // --- Import wizard ---
  const [showImportWizard, setShowImportWizard] = useState(false);

  useEffect(() => {
    api.get("/leads/").then((res) => setContacts(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (user?.papel !== 'corretor') {
      api.get("/usuarios/")
        .then((res) => setCorretores(res.data))
        .catch(console.error);
    }
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchPanel(false);
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDatePanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const clearFilters = () => {
    setSearchText('');
    setSearchField('all');
    setStatusFilter('');
    setCorretorFilter('');
    setDatePreset(null);
    setCustomStart('');
    setCustomEnd('');
    setShowSearchPanel(false);
    setShowDatePanel(false);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchText || statusFilter || datePreset || corretorFilter;

  // --- Compute date range from preset ---
  const dateRange = useMemo(() => {
    if (!datePreset) return null;
    if (datePreset === 'custom') {
      if (!customStart || !customEnd) return null;
      return { from: new Date(customStart + 'T00:00:00'), to: new Date(customEnd + 'T23:59:59') };
    }
    const days = parseInt(datePreset);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from, to };
  }, [datePreset, customStart, customEnd]);

  // --- Filtered + sorted data ---
  const filteredData = useMemo(() => {
    let data = [...contacts];

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      data = data.filter(c => {
        switch (searchField) {
          case 'numero':   return String(c.numero_sequencial ?? '').includes(q);
          case 'nome':     return (c.nome ?? '').toLowerCase().includes(q);
          case 'celular':  return (c.celular_primario ?? '').toLowerCase().includes(q);
          case 'corretor': return (c.corretor?.nome ?? '').toLowerCase().includes(q);
          case 'status':   return (c.status ?? '').toLowerCase().includes(q);
          default:         return (
            String(c.numero_sequencial ?? '').includes(q) ||
            (c.nome ?? '').toLowerCase().includes(q) ||
            (c.celular_primario ?? '').toLowerCase().includes(q) ||
            (c.corretor?.nome ?? '').toLowerCase().includes(q) ||
            (c.status ?? '').toLowerCase().includes(q)
          );
        }
      });
    }

    if (statusFilter) data = data.filter(c => c.status === statusFilter);
    if (corretorFilter) data = data.filter(c => c.corretor?.id === corretorFilter);

    if (dateRange) {
      data = data.filter(c => {
        const d = new Date(c.criado_em);
        return d >= dateRange.from && d <= dateRange.to;
      });
    }

    data.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'numero_sequencial': va = a.numero_sequencial ?? 0; vb = b.numero_sequencial ?? 0; break;
        case 'nome':              va = (a.nome ?? '').toLowerCase(); vb = (b.nome ?? '').toLowerCase(); break;
        case 'celular_primario':  va = (a.celular_primario ?? '').replace(/\D/g, ''); vb = (b.celular_primario ?? '').replace(/\D/g, ''); break;
        case 'corretor':          va = (a.corretor?.nome ?? '').toLowerCase(); vb = (b.corretor?.nome ?? '').toLowerCase(); break;
        case 'status':            va = (a.status ?? '').toLowerCase(); vb = (b.status ?? '').toLowerCase(); break;
        default: return 0;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [contacts, searchText, searchField, statusFilter, corretorFilter, dateRange, sortKey, sortDir]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset to page 1 when filters or itemsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredData.length, itemsPerPage]);

  const itemsPerPageOptions = [
    10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 
    200, 300, 400, 500, 600, 700, 800, 900, 1000
  ];

  // --- CSV Export ---
  const handleExportCSV = () => {
    const headers = ['Número', 'Nome', 'Celular', 'Corretor', 'Status', 'Criado em'];
    const rows = filteredData.map(c => [
      String(c.numero_sequencial ?? 0).padStart(7, '0'),
      c.nome ?? '',
      c.celular_primario ?? '',
      c.corretor?.nome ?? '',
      (c.status ?? '').replace('_', ' '),
      c.criado_em ? new Date(c.criado_em).toLocaleDateString('pt-BR') : '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este lead?")) {
      try {
        await api.delete(`/leads/${id}`);
        setContacts(contacts.filter(c => c.id !== id));
      } catch {
        alert("Erro ao excluir lead");
      }
    }
  };

  const reloadLeads = () => api.get("/leads/").then(r => setContacts(r.data));

  const thClass = "py-4 px-6 cursor-pointer select-none hover:text-blue-600 whitespace-nowrap transition-colors";

  const datePresetLabel = datePreset === 'custom'
    ? (customStart && customEnd ? `${customStart} → ${customEnd}` : 'Personalizado')
    : datePreset ? `Últimos ${datePreset} dias` : 'Filtrar por data';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-gray-500 text-sm mt-1">{contacts.length} leads cadastrados • {filteredData.length} exibidos</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          {user?.papel === 'admin' && (
            <button
              onClick={() => setShowImportWizard(true)}
              className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Importar CSV
            </button>
          )}
          <Link to="/novo-lead" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Novo Lead
          </Link>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search Panel */}
        <div className="relative" ref={searchRef}>
          <button
            onClick={() => { setShowSearchPanel(p => !p); setShowDatePanel(false); }}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm",
              (searchText || statusFilter || corretorFilter) ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            )}
          >
            <Filter className="w-4 h-4" />
            {(searchText || statusFilter || corretorFilter) ? 'Filtro ativo' : 'Filtrar'}
            {(searchText || statusFilter || corretorFilter) && (
              <span className="w-5 h-5 bg-white/20 rounded-full text-[10px] font-bold flex items-center justify-center">
                {[searchText, statusFilter, corretorFilter].filter(Boolean).length}
              </span>
            )}
          </button>

          {showSearchPanel && (
            <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Buscar por campo</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  { v: 'all',     l: 'Tudo' },
                  { v: 'numero',  l: 'Número' },
                  { v: 'nome',    l: 'Nome' },
                  { v: 'celular', l: 'Celular' },
                  { v: 'corretor',l: 'Corretor' },
                  { v: 'status',  l: 'Status' },
                ].map(opt => (
                  <button key={opt.v} onClick={() => setSearchField(opt.v as any)}
                    className={clsx("px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                      searchField === opt.v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                    {opt.l}
                  </button>
                ))}
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Digite para buscar..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {searchText && (
                  <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Filtrar por Status</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                <button onClick={() => setStatusFilter('')}
                  className={clsx("px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                    !statusFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                  Todos
                </button>
                {STATUS_OPTIONS.map(s => (
                  <button key={s} onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
                    className={clsx("px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                      statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {user?.papel !== 'corretor' && corretores.length > 0 && (
                <>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Filtrar por Corretor</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setCorretorFilter('')}
                      className={clsx("px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                        !corretorFilter ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                      Todos
                    </button>
                    {corretores.map(c => (
                      <button key={c.id} onClick={() => setCorretorFilter(c.id === corretorFilter ? '' : c.id)}
                        className={clsx("px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                          corretorFilter === c.id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                          {c.nome.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Date Range Panel */}
        <div className="relative" ref={dateRef}>
          <button
            onClick={() => { setShowDatePanel(p => !p); setShowSearchPanel(false); }}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm",
              datePreset ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            {datePresetLabel}
            {datePreset && (
              <span className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                onClick={e => { e.stopPropagation(); setDatePreset(null); setCustomStart(''); setCustomEnd(''); }}>
                <X className="w-3 h-3" />
              </span>
            )}
          </button>

          {showDatePanel && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Período</p>
              <div className="space-y-1 mb-4">
                {[{ v: '7', l: 'Últimos 7 dias' }, { v: '15', l: 'Últimos 15 dias' }, { v: '30', l: 'Últimos 30 dias' }, { v: 'custom', l: 'Personalizado' }].map(opt => (
                  <button key={opt.v} onClick={() => setDatePreset(opt.v as DatePreset)}
                    className={clsx("w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      datePreset === opt.v ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100")}>
                    {opt.l}
                  </button>
                ))}
              </div>
              {datePreset === 'custom' && (
                <div className="space-y-3 border-t border-gray-100 pt-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Data inicial</label>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Data final</label>
                    <input type="date" value={customEnd} min={customStart} onChange={e => setCustomEnd(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {customStart && customEnd && (
                    <button onClick={() => setShowDatePanel(false)}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                      Aplicar período
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters}
            className="flex items-center gap-1.5 text-red-500 text-sm font-semibold hover:text-red-700 transition-colors">
            <X className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className={thClass} onClick={() => handleSort('numero_sequencial')}>Número <SortIcon active={sortKey === 'numero_sequencial'} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort('nome')}>Nome do Contato <SortIcon active={sortKey === 'nome'} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort('celular_primario')}>Celular <SortIcon active={sortKey === 'celular_primario'} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort('corretor')}>Corretor <SortIcon active={sortKey === 'corretor'} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort('status')}>Status <SortIcon active={sortKey === 'status'} dir={sortDir} /></th>
                <th className="py-4 px-6 w-14">Opções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((contact, i) => (
                <tr key={contact.id || i} className="hover:bg-gray-50 transition-colors group">
                  <td className="py-4 px-6 text-sm text-gray-500 font-mono">
                    #{String(contact.numero_sequencial ?? 0).padStart(7, '0')}
                  </td>
                  <td className="py-4 px-6">
                    <Link to={`/leads/${contact.id}`} className="text-sm font-bold text-blue-600 hover:underline">{contact.nome}</Link>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {contact.celular_primario || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="py-4 px-6">
                    {contact.corretor ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                          {contact.corretor.nome.substring(0, 2)}
                        </div>
                        <span className="text-sm text-gray-700 truncate max-w-[140px]" title={contact.corretor.nome}>{contact.corretor.nome}</span>
                      </div>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="py-4 px-6">
                    <span className={clsx("px-2.5 py-1 text-xs font-semibold rounded-full",
                      contact.status === 'ganho'          ? 'bg-green-100 text-green-700' :
                      contact.status === 'perdido'        ? 'bg-red-100 text-red-700' :
                      contact.status === 'novo'           ? 'bg-blue-100 text-blue-700' :
                      contact.status === 'em_atendimento' ? 'bg-yellow-100 text-yellow-700' :
                      contact.status === 'proposta'       ? 'bg-purple-100 text-purple-700' :
                      contact.status === 'negociacao'     ? 'bg-orange-100 text-orange-700' :
                                                            'bg-gray-100 text-gray-600')}>
                      {(contact.status ?? 'novo').toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button onClick={() => handleDelete(contact.id)}
                      className="p-1 px-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded bg-white border border-red-200 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">
                  Nenhum lead encontrado com os filtros atuais.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredData.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 rounded-b-xl">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Exibindo</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded pb-1 pt-0.5 px-2 bg-white text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {itemsPerPageOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <span>por página</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Página {currentPage} de {totalPages || 1}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Import Wizard */}
      {showImportWizard && (
        <LeadImportWizard
          onClose={() => setShowImportWizard(false)}
          onImportDone={reloadLeads}
        />
      )}
    </div>
  );
}
