import { useState, useEffect } from "react";
import { Search, FileSpreadsheet, Download } from "lucide-react";
import clsx from "clsx";
import api from "../services/api";
import { generateCSV } from "../utils/reportGenerator";

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<'heatmap' | 'extract'>('extract');
  
  // States for Extraction & Data Table
  const [selectedTable, setSelectedTable] = useState<string>('leads');
  const [includeCorretor, setIncludeCorretor] = useState(true);
  const [includeEmpreendimento, setIncludeEmpreendimento] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  const [tableData, setTableData] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isLoadingData, setIsLoadingData] = useState(false);

  // States for Heatmap
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [heatmapWeek, setHeatmapWeek] = useState(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
  const [heatmapModal, setHeatmapModal] = useState<{ day: string, hour: string, data: any[] } | null>(null);

  useEffect(() => {
    // Carregar interações REAIS do banco
    api.get("/interacoes/")
      .then(res => setInteracoes(res.data))
      .catch(err => console.error("Erro ao carregar interações", err));
  }, []);

  // When selectedTable changes or toggle changes, fetch base data
  useEffect(() => {
    if (activeTab === 'extract') {
      setIsLoadingData(true);
      setTableData([]);
      let endpoint = `/${selectedTable}/`;
      api.get(endpoint)
        .then(res => {
          let data = res.data;
          // Flatten associations dynamically se for Leads e checks marcados
          if (selectedTable === 'leads') {
             data = data.map((item: any) => {
               const flat: any = { ...item };
               if (includeCorretor && item.corretor) {
                 flat['corretor_nome'] = item.corretor.nome;
                 flat['corretor_email'] = item.corretor.email;
               }
               if (includeEmpreendimento && item.empreendimento) {
                 flat['empreendimento_nome'] = item.empreendimento.nome;
                 flat['empreendimento_cnpj'] = item.empreendimento.cnpj;
               }
               return flat;
             });
          }
          setTableData(data);
        })
        .catch(err => console.error("Erro ao buscar dados", err))
        .finally(() => setIsLoadingData(false));
    }
  }, [selectedTable, activeTab, includeCorretor, includeEmpreendimento]);

  // Apply filters locally (Client-Side Filtering)
  const filteredData = tableData.filter((item) => {
     let match = true;
     for (const [key, val] of Object.entries(filters)) {
       if (val === undefined || val === '' || val === null || val === false) continue;
       
       if (typeof val === 'boolean') {
          // If the item doesn't explicitly have true, it fails.
          if (item[key] !== true && item[key] !== "true") match = false;
       } else if (typeof val === 'string') {
          // Check string includes (dates, inputs, ids)
          const itemValStr = String(item[key] || '').toLowerCase();
          const filterValStr = val.toLowerCase();
          
          if (key === "criado_em" || key === "data_vencimento" || key === "data de cadastro") {
            // Very simple date string matching: item contains the sub-date 
            if (!itemValStr.includes(filterValStr)) match = false;
          } else {
            if (!itemValStr.includes(filterValStr)) match = false;
          }
       }
     }
     return match;
  });

  const getActiveColumns = () => {
    if (filteredData.length === 0) return [];
    // Ignore direct objects array for the table preview
    return Object.keys(filteredData[0]).filter(k => 
      !['corretor', 'empreendimento', 'interacoes', 'tarefas'].includes(k)
    );
  };

  const handleExportData = () => {
    setIsExporting(true);
    try {
       // Just export the filteredData directly
       const exportData = filteredData.map(item => {
          const cleanItem = { ...item };
          delete cleanItem.corretor;
          delete cleanItem.empreendimento;
          delete cleanItem.interacoes;
          delete cleanItem.tarefas;
          return cleanItem;
       });
       generateCSV(exportData, `Relatorio_${selectedTable}`);
    } catch (e) {
      alert("Erro ao extrair dados. " + e);
    } finally {
      setIsExporting(false);
    }
  };

  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  const hours = ['8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h'];

  const getIntensityData = () => {
    const grid: Record<string, Record<string, any[]>> = {};
    days.forEach(d => {
      grid[d] = {};
      hours.forEach(h => grid[d][h] = []);
    });

    const dayRef = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    interacoes.forEach(i => {
      const d = new Date(i.criado_em);
      const dayName = dayRef[d.getDay()];
      const hStr = d.getHours() + 'h';
      
      if (grid[dayName] && grid[dayName][hStr]) {
        grid[dayName][hStr].push(i);
      }
    });
    return grid;
  };

  const heatmapData = getIntensityData();

  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-blue-50/50';
    if (count === 1) return 'bg-blue-200';
    if (count <= 3) return 'bg-blue-400';
    if (count <= 6) return 'bg-blue-600';
    return 'bg-blue-800';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatórios & Insights</h2>
          <p className="text-gray-500 text-sm mt-1">Extração de dados dinâmicos e painéis de densidade de atividades.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setActiveTab('extract')}
            className={clsx("flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors shadow-sm", activeTab === 'extract' ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-700 bg-white hover:bg-gray-50")}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Extração de Dados
          </button>
          <button 
            onClick={() => setActiveTab('heatmap')}
            className={clsx("flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors shadow-sm", activeTab === 'heatmap' ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-700 bg-white hover:bg-gray-50")}
          >
            <Search className="w-4 h-4" />
            Densidade de Atividades
          </button>
        </div>
      </div>

      {activeTab === 'extract' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-8">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-xl font-bold text-gray-900">Extrator Universal de Bases</h3>
          <p className="text-sm text-gray-500 mt-1">Selecione a base, filtre os registros em tela e exporte a tabela final.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">1. Selecione a Base</h4>
            <div className="space-y-2">
              {['leads', 'usuarios', 'contatos', 'empreendimentos', 'tarefas', 'interacoes'].map(table => (
                <label key={table} className={clsx("flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors", selectedTable === table ? "border-blue-500 bg-blue-50/50" : "border-gray-200")}>
                  <input type="radio" name="table" value={table} checked={selectedTable === table} onChange={() => { setSelectedTable(table); setFilters({}); }} className="w-4 h-4 text-blue-600" />
                  <span className="capitalize font-medium text-gray-700">{table}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-700">2. Filtros e Opções de Visão</h4>
              <button onClick={() => setFilters({})} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">Limpar Filtros</button>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
               {selectedTable === 'leads' && (
                 <>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <input type="text" placeholder="Nome (Ex: João, Maria)" value={filters.nome || ''} onChange={e => setFilters({...filters, nome: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                      <input type="text" placeholder="E-mail" value={filters.email_primario || ''} onChange={e => setFilters({...filters, email_primario: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                      <input type="text" placeholder="Telefone" value={filters.celular_primario || ''} onChange={e => setFilters({...filters, celular_primario: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                      <input type="text" placeholder="Origem" value={filters.origem || ''} onChange={e => setFilters({...filters, origem: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                      <input type="text" placeholder="Interesse" value={filters.interesse || ''} onChange={e => setFilters({...filters, interesse: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                      <input type="text" placeholder="Gênero" value={filters.genero || ''} onChange={e => setFilters({...filters, genero: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                      <input type="date" title="Data de Cadastro" value={filters.criado_em || ''} onChange={e => setFilters({...filters, criado_em: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                      {includeEmpreendimento && (
                        <input type="text" placeholder="Empreendimento" value={filters.empreendimento_nome || ''} onChange={e => setFilters({...filters, empreendimento_nome: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                      )}
                   </div>
                   <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-200 mt-4">
                     <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                        <input type="checkbox" checked={filters.permite_contato_email || false} onChange={e => setFilters({...filters, permite_contato_email: e.target.checked})} className="rounded text-blue-600 border-gray-300 w-4 h-4"/>
                        Permite E-mail
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                        <input type="checkbox" checked={filters.permite_contato_ligacao || false} onChange={e => setFilters({...filters, permite_contato_ligacao: e.target.checked})} className="rounded text-blue-600 border-gray-300 w-4 h-4"/>
                        Permite Ligação
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                        <input type="checkbox" checked={filters.permite_contato_whatsapp || false} onChange={e => setFilters({...filters, permite_contato_whatsapp: e.target.checked})} className="rounded text-blue-600 border-gray-300 w-4 h-4"/>
                        Permite WhatsApp
                     </label>
                   </div>
                 </>
               )}
               {selectedTable === 'usuarios' && (
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <input type="text" placeholder="Nome" value={filters.nome || ''} onChange={e => setFilters({...filters, nome: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="text" placeholder="E-mail" value={filters.email || ''} onChange={e => setFilters({...filters, email: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="text" placeholder="Papel" value={filters.papel || ''} onChange={e => setFilters({...filters, papel: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="text" placeholder="ID do Gerente Responsável" value={filters.gerente_id || ''} onChange={e => setFilters({...filters, gerente_id: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="date" title="Data de Cadastro" value={filters.criado_em || ''} onChange={e => setFilters({...filters, criado_em: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                 </div>
               )}
               {selectedTable === 'contatos' && (
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <input type="text" placeholder="Nome" value={filters.nome || ''} onChange={e => setFilters({...filters, nome: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="text" placeholder="Cargo" value={filters.cargo || ''} onChange={e => setFilters({...filters, cargo: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="text" placeholder="E-mail" value={filters.email || ''} onChange={e => setFilters({...filters, email: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="text" placeholder="Telefone" value={filters.telefone || ''} onChange={e => setFilters({...filters, telefone: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="date" title="Criado em" value={filters.criado_em || ''} onChange={e => setFilters({...filters, criado_em: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                 </div>
               )}
               {selectedTable === 'empreendimentos' && (
                 <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Nome" value={filters.nome || ''} onChange={e => setFilters({...filters, nome: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="text" placeholder="Código (ID)" value={filters.id || ''} onChange={e => setFilters({...filters, id: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="text" placeholder="Descrição" value={filters.descricao || ''} onChange={e => setFilters({...filters, descricao: e.target.value})} className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="date" title="Data de Criação" value={filters.criado_em || ''} onChange={e => setFilters({...filters, criado_em: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                 </div>
               )}
               {selectedTable === 'interacoes' && (
                 <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Tipo" value={filters.tipo || ''} onChange={e => setFilters({...filters, tipo: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="text" placeholder="Conteúdo da Mensagem" value={filters.conteudo || ''} onChange={e => setFilters({...filters, conteudo: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="date" title="Data da Interação" value={filters.criado_em || ''} onChange={e => setFilters({...filters, criado_em: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                 </div>
               )}
               {selectedTable === 'tarefas' && (
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <input type="text" placeholder="Título" value={filters.titulo || ''} onChange={e => setFilters({...filters, titulo: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="text" placeholder="Status" value={filters.status || ''} onChange={e => setFilters({...filters, status: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="text" placeholder="Descrição" value={filters.descricao || ''} onChange={e => setFilters({...filters, descricao: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="date" title="Data de Vencimento" value={filters.data_vencimento || ''} onChange={e => setFilters({...filters, data_vencimento: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input type="date" title="Data de Criação" value={filters.criado_em || ''} onChange={e => setFilters({...filters, criado_em: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                 </div>
               )}

               {/* Extra Cross-Table Options / Flatten Triggers */}
               {selectedTable === 'leads' && (
                  <div className="flex gap-6 mt-4 pt-4 border-t border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-800">
                      <input type="checkbox" checked={includeCorretor} onChange={(e) => setIncludeCorretor(e.target.checked)} className="rounded w-4 h-4 text-blue-600 border-gray-300" />
                      <span>Ver e Exportar Dados do Corretor</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-800">
                      <input type="checkbox" checked={includeEmpreendimento} onChange={(e) => setIncludeEmpreendimento(e.target.checked)} className="rounded w-4 h-4 text-blue-600 border-gray-300" />
                      <span>Ver e Exportar Dados do Empreendimento</span>
                    </label>
                  </div>
               )}
            </div>
            
            <button 
                onClick={handleExportData}
                disabled={isExporting || isLoadingData || filteredData.length === 0}
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition mt-4"
              >
                {isExporting ? "Gerando Relatório..." : (
                  <><Download className="w-5 h-5" /> Fazer Download da Base Restrita ({filteredData.length} registros)</>
                )}
            </button>
          </div>
        </div>

        {/* Data Preview Table */}
        <div className="mt-8 border-t border-gray-100 pt-6">
           <div className="flex justify-between items-center mb-4">
             <h4 className="font-semibold text-gray-800">3. Visualização Prévia dos Dados na Tabela</h4>
             <span className="text-sm bg-blue-50 text-blue-700 font-semibold px-3 py-1 rounded-full">{filteredData.length} encontrados</span>
           </div>
           
           <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
             {isLoadingData ? (
                <div className="p-8 text-center text-gray-500 font-medium">Carregando dados da Tabela do Servidor...</div>
             ) : (
                <table className="w-full text-sm text-left whitespace-nowrap">
                   <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                     <tr>
                        {getActiveColumns().slice(0, 10).map((col, idx) => (
                           <th key={idx} className="px-4 py-3 font-semibold">{col.replace(/_/g, ' ')}</th>
                        ))}
                        {getActiveColumns().length > 10 && <th className="px-4 py-3 font-semibold text-gray-400">... ({getActiveColumns().length - 10} mais cols)</th>}
                     </tr>
                   </thead>
                   <tbody>
                      {filteredData.slice(0, 50).map((row, rIdx) => (
                         <tr key={rIdx} className="bg-white border-b hover:bg-blue-50 transition-colors">
                            {getActiveColumns().slice(0, 10).map((col, cIdx) => {
                               let printVal = row[col];
                               if (typeof printVal === 'boolean') printVal = printVal ? "Sim" : "Não";
                               else if (typeof printVal === 'object' && printVal !== null) printVal = "{...}";
                               return (
                                 <td key={cIdx} className="px-4 py-2 text-gray-600">
                                   {printVal || <span className="text-gray-300">-</span>}
                                 </td>
                               );
                            })}
                            {getActiveColumns().length > 10 && <td className="px-4 py-2 text-gray-400">...</td>}
                         </tr>
                      ))}
                      {filteredData.length === 0 && (
                         <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-500 font-medium">Nenhum registro encontrado correspondente aos filtros.</td></tr>
                      )}
                   </tbody>
                </table>
             )}
           </div>
           {filteredData.length > 50 && (
             <p className="text-xs font-semibold text-gray-500 mt-3 text-right">Mostrando amostra dos 50 primeiros registros. Para visualização total, faça o download do CSV.</p>
           )}
        </div>
      </div>
      )}

      {activeTab === 'heatmap' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
         <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Densidade de Atividade</h3>
              <p className="text-sm text-gray-500">Mapeamento de horários com maior volume de interações nesta semana base.</p>
            </div>
            <div className="flex items-center gap-4">
               {/* Week Picker Mock / Simple Date */}
               <input 
                 type="date" 
                 value={heatmapWeek} 
                 onChange={(e) => setHeatmapWeek(e.target.value)}
                 className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" 
               />
               <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                 MENOS
                 <div className="flex gap-0.5 mx-2">
                    <div className="w-3 h-3 bg-blue-50 border border-gray-100"></div>
                    <div className="w-3 h-3 bg-blue-200"></div>
                    <div className="w-3 h-3 bg-blue-400"></div>
                    <div className="w-3 h-3 bg-blue-600"></div>
                    <div className="w-3 h-3 bg-blue-800"></div>
                 </div>
                 MAIS
               </div>
            </div>
          </div>

          <div className="overflow-x-auto">
             <div className="min-w-[800px]">
                {/* Headers */}
                <div className="flex ml-20 mb-2">
                   {hours.map((h, i) => (
                     <div key={i} className="flex-1 text-center text-[10px] font-bold text-gray-400">{h}</div>
                   ))}
                </div>

                {/* Grid */}
                <div className="flex flex-col gap-1">
                   {days.map((day) => (
                     <div key={day} className="flex items-center gap-4 h-8">
                       <span className="w-16 text-xs font-semibold text-gray-600 shrink-0">{day}</span>
                       <div className="flex flex-1 gap-1 h-full">
                         {hours.map((hStr) => {
                           const count = heatmapData[day]?.[hStr]?.length || 0;
                           const className = getIntensityClass(count);
                           return (
                             <div 
                               key={hStr} 
                               title={`${count} interações às ${hStr}`}
                               onClick={() => {
                                 if (count > 0) {
                                   setHeatmapModal({ day, hour: hStr, data: heatmapData[day][hStr] });
                                 }
                               }}
                               className={clsx(
                                 "flex-1 rounded-sm transition-colors cursor-pointer hover:ring-2 hover:ring-blue-400 relative group",
                                 className
                               )} 
                             />
                           )
                         })}
                       </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
      </div>
      )}

      {/* Heatmap Insights Modal */}
      {heatmapModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">
                Interações: {heatmapModal.day} às {heatmapModal.hour}
              </h3>
              <button onClick={() => setHeatmapModal(null)} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-gray-200">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {heatmapModal.data.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Nenhum dado encontrado.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="py-3 px-4">Relacionamento (Lead)</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Conteúdo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {heatmapModal.data.map((item: any) => (
                      <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{item.lead?.nome || "Lead Desconhecido"}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 uppercase">{item.tipo}</td>
                        <td className="py-3 px-4 text-xs text-gray-500 truncate max-w-[200px]" title={item.conteudo}>{item.conteudo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
