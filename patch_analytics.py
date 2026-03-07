import re

with open("frontend/src/pages/Analytics.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. State changes
state_additions = """
  // States for Filters & Data Table
  const [tableData, setTableData] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isLoadingData, setIsLoadingData] = useState(false);

  // When selectedTable changes, fetch base data
  useEffect(() => {
    if (activeTab === 'extract') {
      setIsLoadingData(true);
      setTableData([]);
      let endpoint = `/${selectedTable}/`;
      api.get(endpoint)
        .then(res => {
          let data = res.data;
          // Flatten associations dynamically if leads
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

  // Apply filters locally
  const filteredData = tableData.filter((item) => {
     let match = true;
     for (const [key, val] of Object.entries(filters)) {
       if (!val || val === '') continue;
       
       if (typeof val === 'boolean') {
          if (item[key] !== val) match = false;
       } else if (typeof val === 'string') {
          // Check string includes
          const itemValStr = String(item[key] || '').toLowerCase();
          const filterValStr = val.toLowerCase();
          if (!itemValStr.includes(filterValStr)) match = false;
       }
     }
     return match;
  });

  const getActiveColumns = () => {
    if (filteredData.length === 0) return [];
    return Object.keys(filteredData[0]).filter(k => 
      !['corretor', 'empreendimento', 'interacoes', 'tarefas'].includes(k)
    );
  };
"""

content = content.replace("  // States for Heatmap", state_additions + "\n  // States for Heatmap")

# 2. Export logic change
old_export = """  const handleExportData = async () => {
    setIsExporting(true);
    try {
      if (selectedTable === 'leads') {
        const res = await api.get('/leads/');
        let data = res.data;
        // Flatten associations
        const flattend = data.map((item: any) => {
          const flat: any = { ...item };
          if (includeCorretor && item.corretor) {
            flat['corretor_nome'] = item.corretor.nome;
            flat['corretor_email'] = item.corretor.email;
          }
          if (includeEmpreendimento && item.empreendimento) {
            flat['empreendimento_nome'] = item.empreendimento.nome;
            flat['empreendimento_cnpj'] = item.empreendimento.cnpj;
          }
          delete flat.corretor;
          delete flat.empreendimento;
          delete flat.interacoes;
          delete flat.tarefas;
          return flat;
        });
        generateCSV(flattend, 'Relatorio_Leads');
      } else if (selectedTable === 'usuarios') {
        const res = await api.get('/usuarios/');
        generateCSV(res.data, 'Relatorio_Usuarios');
      } else if (selectedTable === 'empreendimentos') {
        const res = await api.get('/empreendimentos/');
        generateCSV(res.data, 'Relatorio_Empreendimentos');
      } else if (selectedTable === 'tarefas') {
        const res = await api.get('/tarefas/');
        generateCSV(res.data, 'Relatorio_Tarefas');
      } else if (selectedTable === 'interacoes') {
        const res = await api.get('/interacoes/');
        generateCSV(res.data, 'Relatorio_Interacoes');
      }
    } catch (e) {
      alert("Erro ao extrair dados. " + e);
    } finally {
      setIsExporting(false);
    }
  };"""

new_export = """  const handleExportData = () => {
    setIsExporting(true);
    try {
       // Just export the filteredData directly to match exactly what is in the table
       const exportData = filteredData.map(item => {
          const cleanItem = { ...item };
          // Remove bulky objects
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
  };"""

content = content.replace(old_export, new_export)

# 3. Handle 'contatos' selection and Table rewrite
old_ui = """      {activeTab === 'extract' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6 border-b border-gray-100 pb-4">
          <h3 className="text-xl font-bold text-gray-900">Extrator Universal de Bases</h3>
          <p className="text-sm text-gray-500 mt-1">Gere arquivos .csv contendo colunas e dados brutos para explorar em outras ferramentas.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">1. Selecione a Base</h4>
            <div className="space-y-2">
              {['leads', 'usuarios', 'empreendimentos', 'tarefas', 'interacoes'].map(table => (
                <label key={table} className={clsx("flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50", selectedTable === table ? "border-blue-500 bg-blue-50/50" : "border-gray-200")}>
                  <input type="radio" name="table" value={table} checked={selectedTable === table} onChange={() => setSelectedTable(table)} className="w-4 h-4 text-blue-600" />
                  <span className="capitalize font-medium text-gray-700">{table}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-l border-gray-100 pl-8">
            <h4 className="font-semibold text-gray-700">2. Opções de Visão</h4>
            {selectedTable === 'leads' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-2">Incluir informações extras relacionadas?</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={includeCorretor} onChange={(e) => setIncludeCorretor(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-gray-700">Juntar dados do Corretor responsável</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={includeEmpreendimento} onChange={(e) => setIncludeEmpreendimento(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-gray-700">Juntar dados do Empreendimento de interesse</span>
                </label>
              </div>
            ) : (
               <p className="text-sm text-gray-400 italic">As tabelas simples ({selectedTable}) extraem todas as respectivas colunas diretamente.</p>
            )}

            <div className="pt-8">
               <button 
                 onClick={handleExportData}
                 disabled={isExporting}
                 className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
               >
                 {isExporting ? "Gerando Relatório..." : (
                   <><Download className="w-5 h-5" /> Fazer Download da Base</>
                 )}
               </button>
            </div>
          </div>
        </div>
      </div>
      )}"""

new_ui = """      {activeTab === 'extract' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-8">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-xl font-bold text-gray-900">Extrator Universal de Bases</h3>
          <p className="text-sm text-gray-500 mt-1">Selecione, filtre e explore os dados antes de gerar o download em CSV.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">1. Selecione a Base</h4>
            <div className="space-y-2">
              {['leads', 'usuarios', 'contatos', 'empreendimentos', 'tarefas', 'interacoes'].map(table => (
                <label key={table} className={clsx("flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors", selectedTable === table ? "border-blue-500 bg-blue-50/50" : "border-gray-200")}>
                  <input type="radio" name="table" value={table} checked={selectedTable === table} onChange={() => setSelectedTable(table)} className="w-4 h-4 text-blue-600" />
                  <span className="capitalize font-medium text-gray-700">{table}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4 xl:col-span-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-700">2. Filtros e Opções ({selectedTable})</h4>
              <button 
                onClick={() => setFilters({})}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Limpar Filtros
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
               {selectedTable === 'leads' && (
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <input type="text" placeholder="Nome do Lead" value={filters.nome || ''} onChange={e => setFilters({...filters, nome: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Email" value={filters.email_primario || ''} onChange={e => setFilters({...filters, email_primario: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Telefone" value={filters.celular_primario || ''} onChange={e => setFilters({...filters, celular_primario: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Origem" value={filters.origem || ''} onChange={e => setFilters({...filters, origem: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Interesse" value={filters.interesse || ''} onChange={e => setFilters({...filters, interesse: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Gênero" value={filters.genero || ''} onChange={e => setFilters({...filters, genero: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                 </div>
               )}
               {selectedTable === 'usuarios' && (
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <input type="text" placeholder="Nome" value={filters.nome || ''} onChange={e => setFilters({...filters, nome: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Email" value={filters.email || ''} onChange={e => setFilters({...filters, email: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Papel" value={filters.papel || ''} onChange={e => setFilters({...filters, papel: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                 </div>
               )}
               {selectedTable === 'contatos' && (
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <input type="text" placeholder="Nome" value={filters.nome || ''} onChange={e => setFilters({...filters, nome: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Cargo" value={filters.cargo || ''} onChange={e => setFilters({...filters, cargo: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Email" value={filters.email || ''} onChange={e => setFilters({...filters, email: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                 </div>
               )}
               {selectedTable === 'empreendimentos' && (
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <input type="text" placeholder="Nome" value={filters.nome || ''} onChange={e => setFilters({...filters, nome: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Código" value={filters.id || ''} onChange={e => setFilters({...filters, id: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                 </div>
               )}
               {selectedTable === 'interacoes' && (
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <input type="text" placeholder="Tipo" value={filters.tipo || ''} onChange={e => setFilters({...filters, tipo: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Conteúdo" value={filters.conteudo || ''} onChange={e => setFilters({...filters, conteudo: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                 </div>
               )}
               {selectedTable === 'tarefas' && (
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <input type="text" placeholder="Título" value={filters.titulo || ''} onChange={e => setFilters({...filters, titulo: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" placeholder="Status" value={filters.status || ''} onChange={e => setFilters({...filters, status: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                 </div>
               )}

               {/* Extra Options */}
               {selectedTable === 'leads' && (
                  <div className="flex gap-6 mt-4 pt-4 border-t border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={includeCorretor} onChange={(e) => setIncludeCorretor(e.target.checked)} className="rounded text-blue-600 border-gray-300" />
                      <span>Dados de Corretor</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={includeEmpreendimento} onChange={(e) => setIncludeEmpreendimento(e.target.checked)} className="rounded text-blue-600 border-gray-300" />
                      <span>Dados de Empreendimento</span>
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
                  <><Download className="w-5 h-5" /> Fazer Download da Base ({filteredData.length} registros)</>
                )}
            </button>
          </div>
        </div>

        {/* Data Preview Table */}
        <div className="mt-8">
           <h4 className="font-semibold text-gray-700 mb-4">3. Visualização Prévia dos Dados ({filteredData.length})</h4>
           <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
             {isLoadingData ? (
                <div className="p-8 text-center text-gray-500">Carregando base de dados...</div>
             ) : (
                <table className="w-full text-sm text-left whitespace-nowrap">
                   <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                     <tr>
                        {getActiveColumns().slice(0, 10).map((col, idx) => (
                           <th key={idx} className="px-4 py-3 font-semibold">{col.replace(/_/g, ' ')}</th>
                        ))}
                        {getActiveColumns().length > 10 && <th className="px-4 py-3 font-semibold text-gray-400">...</th>}
                     </tr>
                   </thead>
                   <tbody>
                      {filteredData.slice(0, 50).map((row, rIdx) => (
                         <tr key={rIdx} className="bg-white border-b hover:bg-gray-50">
                            {getActiveColumns().slice(0, 10).map((col, cIdx) => (
                               <td key={cIdx} className="px-4 py-2 text-gray-600">
                                 {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] || '')}
                               </td>
                            ))}
                            {getActiveColumns().length > 10 && <td className="px-4 py-2 text-gray-400">...</td>}
                         </tr>
                      ))}
                      {filteredData.length === 0 && (
                         <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                      )}
                   </tbody>
                </table>
             )}
           </div>
           {filteredData.length > 50 && (
             <p className="text-xs text-gray-500 mt-2 text-right">Mostrando apenas os 50 primeiros registros. Faça o download para ver todos.</p>
           )}
        </div>
      </div>
      )}"""

content = content.replace(old_ui, new_ui)

with open("frontend/src/pages/Analytics.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Analytics.tsx patched successfully!")
