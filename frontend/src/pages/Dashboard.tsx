import { useState, useEffect } from "react";
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { TrendingUp, Users, RefreshCw } from "lucide-react";
import clsx from "clsx";
import api from "../services/api";

const salesData = [
  { name: "JAN", value: 4000 },
  { name: "FEB", value: 8000 },
  { name: "MAR", value: 12000 },
  { name: "APR", value: 35000 },
  { name: "MAY", value: 65000 },
  { name: "JUN", value: 92000 },
];

const leadSources = [
  { name: "Referrals", value: 45, color: "#2563eb" }, // Blue
  { name: "Organic", value: 25, color: "#10b981" }, // Green
  { name: "Paid Ads", value: 20, color: "#f59e0b" }, // Yellow
  { name: "Other", value: 10, color: "#cbd5e1" }, // Gray
];

const highValueDeals = [
  {
    company: "Velocity Tech",
    subInfo: "SaaS Implementation",
    logo: "V",
    value: "$84,000",
    status: "NEGOTIATION",
    statusColor: "bg-blue-100 text-blue-700",
    owner: "Jane Doe",
    ownerAvatar: "https://i.pravatar.cc/150?u=jane",
    date: "Oct 12, 2024",
  },
  {
    company: "Lumens Creative",
    subInfo: "Hardware Bundle",
    logo: "L",
    value: "$42,500",
    status: "QUALIFIED",
    statusColor: "bg-yellow-100 text-yellow-700",
    owner: "Mark Wilson",
    ownerAvatar: "https://i.pravatar.cc/150?u=mark",
    date: "Nov 05, 2024",
  },
];

export default function Dashboard() {
  const [metricas, setMetricas] = useState({ total_leads: 0, taxa_conversao: 0, ganhos: 0 });

  useEffect(() => {
    api.get("/leads/").then((res) => {
       const data = res.data || [];
       const ganhos = data.filter((l: any) => l.status === 'ganho').length;
       const taxa = data.length > 0 ? ((ganhos / data.length) * 100).toFixed(1) : "0.0";
       setMetricas({ total_leads: data.length, taxa_conversao: Number(taxa), ganhos });
    }).catch(console.error);
  }, []);

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Visão Geral (Dashboard)</h2>
        <p className="text-gray-500 text-sm mt-1">Métricas de performance em tempo real e saúde do funil</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="Receita Total"
          value={`$${(metricas.ganhos * 15)?.toLocaleString()}k`}
          trend="+12.5%"
          trendUp={true}
          subtext="Baseado em ticket médio simulado"
          icon={<div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><span className="font-bold text-lg">$</span></div>}
        />
        <KPICard
          title="Leads Ativos"
          value={metricas.total_leads.toString()}
          trend="+5.2%"
          trendUp={true}
          subtext="Todos os contatos cadastrados"
          icon={<div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"><Users size={18} /></div>}
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${metricas.taxa_conversao}%`}
          trend="+0.8%"
          trendUp={true}
          subtext="Fechamentos (Ganho) sobre todos os leads"
          icon={<div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600"><RefreshCw size={18} /></div>}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Forecast Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Previsão de Vendas</h3>
              <p className="text-sm text-gray-500">Receita projetada vs meta em 2024</p>
            </div>
            <select className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500">
              <option>Últimos 6 Meses</option>
              <option>Último Ano</option>
            </select>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
           <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Origem dos Leads</h3>
              <p className="text-sm text-gray-500">Distribuição de novos leads por canal</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">...</button>
          </div>
          
          <div className="flex items-center justify-center h-64 relative">
             <div className="w-1/2 h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadSources}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {leadSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-gray-900">1.2k</span>
                  <span className="text-xs text-gray-400 font-medium tracking-wider">LEADS</span>
                </div>
             </div>

             {/* Legend */}
             <div className="w-1/2 pl-8 flex flex-col justify-center space-y-4">
                {leadSources.map((source) => (
                  <div key={source.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                      <span className="text-sm text-gray-700 font-medium">{source.name === 'Referrals' ? 'Indicações' : source.name === 'Organic' ? 'Orgânico' : source.name === 'Paid Ads' ? 'Anúncios' : 'Outros'}</span>
                    </div>
                    <span className="text-sm text-gray-500">{source.value}%</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Top High-Value Deals Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-bold text-gray-900">Principais Negócios de Alto Valor</h3>
          <button className="text-blue-600 text-sm font-semibold hover:text-blue-700">Ver Todo o Funil</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-3 px-2">Empresa</th>
                <th className="pb-3 px-2">Valor</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Responsável</th>
                <th className="pb-3 px-2">Fechamento Esp.</th>
                <th className="pb-3 px-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {highValueDeals.map((deal, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                        {deal.logo}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{deal.company}</p>
                        <p className="text-xs text-gray-400">{deal.subInfo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-sm font-bold text-gray-900">{deal.value}</td>
                  <td className="py-4 px-2">
                    <span className={clsx("px-2.5 py-1 text-xs font-semibold rounded-full", deal.statusColor)}>
                      {deal.status === 'NEGOTIATION' ? 'NEGOCIAÇÃO' : 'QUALIFICADO'}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <img src={deal.ownerAvatar} alt="" className="w-6 h-6 rounded-full" />
                      {deal.owner}
                    </div>
                  </td>
                  <td className="py-4 px-2 text-sm text-gray-500">{deal.date}</td>
                  <td className="py-4 px-2 text-right text-gray-400 hover:text-gray-600 cursor-pointer">
                    📝
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, trend, trendUp, subtext, icon }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon}
      </div>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        <span className={clsx("text-sm font-semibold flex items-center", trendUp ? "text-emerald-500" : "text-red-500")}>
          {trendUp ? <TrendingUp size={14} className="mr-1" /> : null}
          {trend}
        </span>
      </div>
      <p className="text-xs text-gray-400">{subtext}</p>
    </div>
  );
}
