import { Download, ChevronDown } from "lucide-react";
import clsx from "clsx";

const funnelData = [
  { stage: 'LEADS', value: 1420, percentage: null, color: 'bg-blue-100' },
  { stage: 'QUALIFIED', value: 842, percentage: '59%', color: 'bg-blue-200' },
  { stage: 'PROPOSALS', value: 312, percentage: '22%', color: 'bg-blue-300' },
  { stage: 'NEGOTIATION', value: 128, percentage: '9%', color: 'bg-blue-400' },
  { stage: 'CLOSED WON', value: 42, percentage: '3%', color: 'bg-blue-500', text: 'text-white' },
];

const recentDeals = [
  { rep: "Alex Rivera", repColor: "bg-blue-100", company: "CloudScale Inc.", value: "$85,200", status: "Closed Won", statusColor: "bg-green-100 text-green-700", time: "12 Days" },
  { rep: "Jordan Smith", repColor: "bg-stone-400", company: "Terraform Logistics", value: "$42,500", status: "Closed Won", statusColor: "bg-green-100 text-green-700", time: "21 Days" },
  { rep: "Morgan Lee", repColor: "bg-orange-300", company: "NexGen Retail", value: "$120,000", status: "Negotiating", statusColor: "bg-yellow-100 text-yellow-700", time: "34 Days" },
];

export default function Analytics() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const hours = ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p', '12a', '2a', '4a', '6a', '8a', '10a'];

  const getIntensity = (h: number) => {
    // higher intensity between 9am-4pm (cols 4 to 9)
    if (h >= 4 && h <= 9) return Math.floor(Math.random() * 3) + 2; // 2-4
    return Math.floor(Math.random() * 2); // 0-1
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatórios de Vendas & Analytics</h2>
          <p className="text-gray-500 text-sm mt-1">Insights de ações na velocidade de vendas e produtividade do representante.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <CalendarIcon className="w-4 h-4" />
            Últimos 30 Dias <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <UsersIcon className="w-4 h-4" />
            Todos Departamentos <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title="RECEITA TOTAL" value="$1.24M" trend="+12.3%" trendUp={true} color="bg-blue-600" />
        <KPICard title="TICKET MÉDIO" value="$24.8k" trend="+5.1%" trendUp={true} color="bg-emerald-500" />
        <KPICard title="TAXA DE CONVERSÃO" value="18.5%" trend="-2.4%" trendUp={false} color="bg-red-500" />
        <KPICard title="FUNIL ATIVO" value="142" trend="+8.0%" trendUp={true} color="bg-orange-500" />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance by Rep (Placeholder for Bar Chart) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2 flex flex-col">
           <div className="flex justify-between items-start mb-6">
            <h3 className="text-base font-bold text-gray-900">Performance de Vendas por Representante</h3>
            <button className="text-gray-400 hover:text-gray-600">...</button>
          </div>
          <div className="flex-1 flex items-end gap-4 justify-between pt-8 px-4 pb-2 border-b border-gray-100">
            {/* Mock bar chart visual */}
            {[100, 80, 50, 60, 40, 30, 80].map((h, i) => (
              <div key={i} className="w-16 bg-blue-100 rounded-t flex items-end justify-center" style={{ height: `${h}%` }}>
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${h * 0.7}%` }}></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-4 pt-4 text-xs font-semibold text-gray-400 uppercase">
             <span>Alex R.</span><span>Jordan M.</span><span>Casey S.</span><span>Taylor P.</span><span>Morgan L.</span><span>Riley B.</span><span>Devon W.</span>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-900 mb-6">Funil de Conversão</h3>
          
          <div className="flex flex-col gap-2 items-center w-full">
            {funnelData.map((stage, idx) => (
              <div key={stage.stage} className={clsx("h-12 flex items-center justify-between px-4 rounded-lg w-full font-bold transition-all", stage.color, stage.text || 'text-gray-900')}
                style={{ width: `${100 - (idx * 15)}%` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs tracking-wider opacity-80 uppercase">{stage.stage}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{stage.value}</span>
                  {stage.percentage && (
                    <span className="text-xs opacity-70">({stage.percentage})</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between text-sm py-4 border-t border-gray-100">
             <span className="text-gray-500">Velocidade Lead-to-Won</span>
             <span className="font-bold text-blue-600">14 Dias</span>
          </div>
        </div>
      </div>

      {/* Activity Density Heatmap */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
         <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Densidade de Atividade</h3>
              <p className="text-sm text-gray-500">Horários de pico de interações de vendas.</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
               LOW
               <div className="flex gap-0.5 mx-2">
                  <div className="w-3 h-3 bg-blue-50"></div>
                  <div className="w-3 h-3 bg-blue-200"></div>
                  <div className="w-3 h-3 bg-blue-400"></div>
                  <div className="w-3 h-3 bg-blue-600"></div>
                  <div className="w-3 h-3 bg-blue-800"></div>
               </div>
               HIGH
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
                   {days.map((day, _d) => (
                     <div key={day} className="flex items-center gap-4 h-8">
                       <span className="w-16 text-xs font-semibold text-gray-600 shrink-0">{day}</span>
                       <div className="flex flex-1 gap-1 h-full">
                         {hours.map((_h, i) => {
                           const intensity = getIntensity(i);
                           return (
                             <div 
                               key={i} 
                               className={clsx(
                                 "flex-1 rounded-sm transition-colors cursor-pointer hover:ring-2 hover:ring-blue-400",
                                 intensity === 0 && "bg-blue-50/50",
                                 intensity === 1 && "bg-blue-200",
                                 intensity === 2 && "bg-blue-400",
                                 intensity === 3 && "bg-blue-600",
                                 intensity === 4 && "bg-blue-800",
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

      {/* Recent Deal Closures Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
         <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-bold text-gray-900">Fechamentos Recentes</h3>
          <button className="text-blue-600 text-sm font-semibold hover:text-blue-700">Ver Todos os Leads</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-3 px-2">Representante</th>
                <th className="pb-3 px-2">Conta Cliente</th>
                <th className="pb-3 px-2">Valor</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Tempo de Fechamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentDeals.map((deal, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-3">
                      <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm", deal.repColor)}>
                         {/* Avatar Placeholder */}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{deal.rep}</span>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-sm text-gray-600">{deal.company}</td>
                  <td className="py-4 px-2 text-sm font-bold text-gray-900">{deal.value}</td>
                  <td className="py-4 px-2">
                    <span className={clsx("px-2.5 py-1 text-xs font-bold rounded-full", deal.statusColor)}>
                      {deal.status === 'Closed Won' ? 'Ganho' : deal.status === 'Negotiating' ? 'Em Negociação' : deal.status}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-sm text-gray-500">{deal.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function KPICard({ title, value, trend, trendUp, color }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h3>
        <span className={clsx("px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1", trendUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
          {trend}
        </span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-black tracking-tight text-gray-900">{value}</span>
      </div>
      <div className={clsx("absolute bottom-0 left-0 right-0 h-1", color)}></div>
    </div>
  );
}

function CalendarIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
}
function UsersIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
}
