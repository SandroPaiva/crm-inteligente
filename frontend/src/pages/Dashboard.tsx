import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { TrendingUp, Users, RefreshCw, X, Download, Calendar, Filter, UserX, CheckCircle } from "lucide-react";
import clsx from "clsx";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";

const colors = ["#2563eb", "#10b981", "#f59e0b", "#cbd5e1", "#8b5cf6", "#ef4444"];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Custom metrics lists
  const [meusLeads, setMeusLeads] = useState<any[]>([]);
  const [novosLeads, setNovosLeads] = useState<any[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [funilAtivo, setFunilAtivo] = useState<any[]>([]);

  // Chart Data States
  const [salesData, setSalesData] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [topEmpreendimentos, setTopEmpreendimentos] = useState<any[]>([]);
  const [funilData, setFunilData] = useState<any[]>([]);

  // Modal State
  const [modalData, setModalData] = useState<{ title: string; data: any[]; type: 'leads' | 'tarefas' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsRes, tarefasRes] = await Promise.all([
          api.get("/leads/"),
          api.get("/tarefas/")
        ]);
        
        const allLeads = leadsRes.data || [];
        const allTarefas = tarefasRes.data || [];

        // 1. Meus Leads (do corretor logado)
        const myLeads = allLeads.filter((l: any) => l.corretor_id === user?.id);
        setMeusLeads(myLeads);

        // 2. Novos Leads (sem atribuição)
        setNovosLeads(allLeads.filter((l: any) => !l.corretor_id));

        // 3. Agendamentos Pendentes (reunião/call)
        setAgendamentos(allTarefas.filter((t: any) => 
          (t.tipo === 'reuniao' || t.tipo === 'call') && t.status === 'pendente'
        ));

        // 4. Funil Ativo (dos leads do corretor logado que não são perdidos nem fechados)
        const activeLeads = myLeads.filter((l: any) => 
          l.status !== 'perdido' && l.status !== 'ganho'
        );
        setFunilAtivo(activeLeads);

        // Chart 1: Leads em Atendimentos (Progressão Diária)
        // Agrupar leads ativos por data de criação (simulado para timeline)
        const datesMap: any = {};
        activeLeads.forEach((l: any) => {
          const d = new Date(l.criado_em);
          const monthName = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
          datesMap[monthName] = (datesMap[monthName] || 0) + 1;
        });
        const areaChartData = Object.keys(datesMap).map(k => ({ name: k, value: datesMap[k] }));
        if (areaChartData.length === 0) areaChartData.push({ name: 'HOJE', value: 0 });
        setSalesData(areaChartData);

        // Chart 2: Origem dos Leads
        const originMap: any = {};
        myLeads.forEach((l: any) => {
           let origemName = l.origem || 'Não Informada';
           if (origemName.trim() === '') origemName = 'Não Informada';
           originMap[origemName] = (originMap[origemName] || 0) + 1;
        });
        const pieChartData = Object.keys(originMap).map((k, index) => ({
           name: k,
           value: originMap[k],
           color: colors[index % colors.length]
        }));
        setLeadSources(pieChartData);

        // Chart 3: Top Empreendimentos (agrupados por empreendimento)
        const empGroupMap: Record<string, { nome: string; leads: any[]; logo: string; lastDate: string }> = {};
        myLeads
          .filter((l: any) => l.empreendimento?.nome)
          .forEach((l: any) => {
            const empId = l.empreendimento_id || l.empreendimento.nome;
            if (!empGroupMap[empId]) {
              empGroupMap[empId] = {
                nome: l.empreendimento.nome,
                leads: [],
                logo: l.empreendimento.nome.charAt(0).toUpperCase(),
                lastDate: l.criado_em,
              };
            }
            empGroupMap[empId].leads.push(l);
            // keep the most recent lead date
            if (new Date(l.criado_em) > new Date(empGroupMap[empId].lastDate)) {
              empGroupMap[empId].lastDate = l.criado_em;
            }
          });
        const deals = Object.values(empGroupMap)
          .sort((a, b) => b.leads.length - a.leads.length) // sort by lead count desc
          .slice(0, 8)
          .map(g => ({
            nome: g.nome,
            logo: g.logo,
            leadCount: g.leads.length,
            leads: g.leads,
            lastDate: new Date(g.lastDate).toLocaleDateString('pt-BR'),
          }));
        setTopEmpreendimentos(deals);

        // Chart 4: Funil de Conversão (baseado em leads do corretor)
        const statusOrder = [
          { key: 'novo',           label: 'Novos' },
          { key: 'em_atendimento', label: 'Em Atendimento' },
          { key: 'proposta',       label: 'Proposta' },
          { key: 'negociacao',     label: 'Negociação' },
          { key: 'ganho',          label: 'Ganho' },
        ];
        const statusCounts: any = {};
        myLeads.forEach((l: any) => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
        const total = myLeads.length || 1;
        const computed = statusOrder.map(s => ({
          stage: s.label,
          value: statusCounts[s.key] || 0,
          percentage: `${Math.round(((statusCounts[s.key] || 0) / total) * 100)}%`,
        }));
        setFunilData(computed);

      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchData();
  }, [user]);

  const handleExportPDF = async () => {
    const input = document.getElementById('pdf-modal-content');
    if (!input) return;
    try {
        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${modalData?.title.replace(/ /g, '_')}_Relatorio.pdf`);
    } catch (e) {
        alert("Erro ao exportar PDF.");
    }
  };

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Visão Geral (Dashboard)</h2>
        <p className="text-gray-500 text-sm mt-1">Métricas de performance em tempo real e saúde do funil</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
        <KPICard
          title="Meus Leads"
          value={meusLeads.length.toString()}
          trend="+12.3%"
          trendUp={true}
          onClick={() => setModalData({ title: "Meus Leads Atribuídos", data: meusLeads, type: 'leads' })}
          icon={<div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"><Users size={18} /></div>}
        />
        <KPICard
          title="Novos Leads"
          value={novosLeads.length.toString()}
          trend="+5.1%"
          trendUp={true}
          onClick={() => setModalData({ title: "Leads Sem Corretor", data: novosLeads, type: 'leads' })}
          icon={<div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><Filter size={18} /></div>}
        />
        <KPICard
          title="Agendamentos"
          value={agendamentos.length.toString()}
          trend="-2.4%"
          trendUp={false}
          onClick={() => setModalData({ title: "Agendamentos Pendentes", data: agendamentos, type: 'tarefas' })}
          icon={<div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600"><Calendar size={18} /></div>}
        />
        <KPICard
          title="Funil Ativo"
          value={funilAtivo.length.toString()}
          trend="+8.0%"
          trendUp={true}
          onClick={() => setModalData({ title: "Leads em Prospecção", data: funilAtivo, type: 'leads' })}
          icon={<div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600"><TrendingUp size={18} /></div>}
        />
        {/* Placeholder para futuras funcionalidades */}
        <KPICard
          title="Proposta"
          value="--%"
          trend=""
          trendUp={true}
          onClick={() => {}}
          icon={<div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600"><UserX size={18} /></div>}
        />
        <KPICard
          title="Vendas"
          value="--%"
          trend=""
          trendUp={true}
          onClick={() => {}}
          icon={<div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600"><CheckCircle size={18} /></div>}
        />
      </div>

      {/* Charts Row — 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads em Atendimento Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Leads em Atendimento</h3>
              <p className="text-sm text-gray-500">Volume de entrada no seu funil ativo</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Origem dos Leads</h3>
              <p className="text-sm text-gray-500">Distribuição de novos leads por canal</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">...</button>
          </div>
          
          {/* Donut Chart — centered, compact */}
          <div className="relative h-40 mx-auto w-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadSources.length > 0 ? leadSources : [{ name: 'Sem dados', value: 1, color: '#e5e7eb' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {(leadSources.length > 0 ? leadSources : [{ color: '#e5e7eb' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900">{meusLeads.length}</span>
              <span className="text-[10px] text-gray-400 font-medium tracking-wider">LEADS</span>
            </div>
          </div>

          {/* Legend — full width, clean horizontal rows */}
          <div className="space-y-2">
            {leadSources.map((source, index) => (
              <div key={index} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
                  <span className="text-sm text-gray-700 font-medium truncate">{source.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-sm font-bold text-gray-900">{source.value}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {meusLeads.length > 0 ? `${Math.round((source.value / meusLeads.length) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>
            ))}
            {leadSources.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">Nenhum dado disponível</p>
            )}
          </div>
        </div>

        {/* Funil de Conversão */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Funil de Conversão</h3>
              <p className="text-sm text-gray-500">Progressão dos seus leads</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-center w-full">
            {funilData.map((stage, idx) => {
              const bgColors = ['bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500'];
              const isLast = idx === funilData.length - 1;
              return (
                <div
                  key={stage.stage}
                  className={clsx('h-12 flex items-center justify-between px-4 rounded-lg font-bold transition-all', bgColors[idx], isLast ? 'text-white' : 'text-gray-900')}
                  style={{ width: `${100 - (idx * 12)}%` }}
                >
                  <span className="text-xs tracking-wider opacity-80 uppercase">{stage.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{stage.value}</span>
                    {stage.value > 0 && <span className="text-xs opacity-70">({stage.percentage})</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between text-sm py-4 border-t border-gray-100">
            <span className="text-gray-500">Total de leads</span>
            <span className="font-bold text-blue-600">{meusLeads.length}</span>
          </div>
        </div>
      </div>

      {/* Empreendimentos mais requisitados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-bold text-gray-900">Empreendimentos mais requisitados</h3>
            <p className="text-sm text-gray-500 mt-0.5">Agrupado por empreendimento — clique para ver os leads</p>
          </div>
        </div>

        {topEmpreendimentos.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Nenhum empreendimento vinculado aos seus leads ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 px-2">Empreendimento</th>
                  <th className="pb-3 px-2 text-center">Leads</th>
                  <th className="pb-3 px-2">Última Interação</th>
                  <th className="pb-3 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topEmpreendimentos.map((emp, index) => (
                  <tr
                    key={index}
                    onClick={() => setModalData({ title: `Leads — ${emp.nome}`, data: emp.leads, type: 'leads' })}
                    className="hover:bg-blue-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {emp.logo}
                        </div>
                        <span className="text-sm font-bold text-gray-900">{emp.nome}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">
                        {emp.leadCount}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-500">{emp.lastDate}</td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Ver lista →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal Report List */}
      {modalData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">{modalData.title} <span className="text-sm font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full ml-2">{modalData.data.length}</span></h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Download className="w-4 h-4" /> Exportar para PDF
                </button>
                <button onClick={() => setModalData(null)} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white" id="pdf-modal-content">
              <div className="pb-4 border-b border-gray-100 mb-4 hidden print:block">
                <h2 className="text-2xl font-bold">{modalData.title}</h2>
                <p className="text-gray-500">Relatório gerado em: {new Date().toLocaleString()}</p>
              </div>

              {modalData.data.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Nenhum dado encontrado para este filtro.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      {modalData.type === 'leads' ? (
                        <>
                          <th className="py-3 px-4">Nome do Relacionamento</th>
                          <th className="py-3 px-4">Contato</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Data de Criação</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-4">Título da Tarefa</th>
                          <th className="py-3 px-4">Tipo</th>
                          <th className="py-3 px-4">Vencimento</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modalData.data.map((item: any) => (
                      <tr 
                         key={item.id} 
                         className="hover:bg-blue-50 cursor-pointer transition-colors"
                         onClick={() => {
                            if (modalData.type === 'leads') {
                               navigate(`/leads/${item.id}`);
                            } else {
                               navigate(`/tarefas`);
                            }
                         }}
                      >
                        {modalData.type === 'leads' ? (
                          <>
                            <td className="py-3 px-4 font-medium text-gray-900">{item.nome}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{item.email_primario || item.celular_primario || "N/A"}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs uppercase">{item.status?.replace("_", " ")}</span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">{new Date(item.criado_em).toLocaleDateString()}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 font-medium text-gray-900">{item.titulo}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 uppercase">{item.tipo}</td>
                            <td className="py-3 px-4 text-sm text-gray-500">{new Date(item.data_vencimento).toLocaleString()}</td>
                          </>
                        )}
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

function KPICard({ title, value, trend, trendUp, icon, onClick }: { title: string, value: string, trend: string, trendUp: boolean, icon: React.ReactNode, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={clsx(
        "bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all",
        onClick ? "cursor-pointer border-blue-100 ring-1 ring-transparent hover:ring-blue-200" : "border-gray-100"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">{value}</h3>
        </div>
        {icon}
      </div>
      <div className="flex items-center justify-between">
        <div className={clsx("flex items-center gap-1 text-sm font-bold", trendUp ? "text-emerald-600" : "text-red-500")}>
          <TrendingUp className={clsx("w-4 h-4", !trendUp && "rotate-180")} />
          {trend}
        </div>
      </div>
    </div>
  );
}
