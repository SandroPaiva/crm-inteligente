import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Check, MoreHorizontal } from "lucide-react";
import api from "../services/api";
import clsx from "clsx";

export default function Tarefas() {
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for the layout
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming'>('today');
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [activeLeadFull, setActiveLeadFull] = useState<any | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resTarefas, resLeads] = await Promise.all([
        api.get("/tarefas/"),
        api.get("/leads/")
      ]);
      setTarefas(resTarefas.data);
      setLeads(resLeads.data);
      
      // Auto-select first task if exists
      if (resTarefas.data.length > 0 && !activeTask) {
        setActiveTask(resTarefas.data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch full lead details when a task is selected to get Contacts
  useEffect(() => {
    if (activeTask && activeTask.lead_id) {
      api.get(`/leads/${activeTask.lead_id}`).then(res => {
        setActiveLeadFull(res.data);
      }).catch(console.error);
    } else {
      setActiveLeadFull(null);
    }
  }, [activeTask]);

  const toggleStatus = async (tarefa: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const novoStatus = tarefa.status === "pendente" ? "concluida" : "pendente";
      await api.patch(`/tarefas/${tarefa.id}`, { status: novoStatus });
      // update local
      setTarefas(tarefas.map(t => t.id === tarefa.id ? { ...t, status: novoStatus } : t));
      if (activeTask?.id === tarefa.id) {
        setActiveTask({ ...activeTask, status: novoStatus });
      }
    } catch (e) {
      alert("Erro ao atualizar tarefa.");
    }
  };

  // Enriched tasks with lead basic info
  const enrichedTasks = tarefas.map(t => ({
    ...t,
    lead: leads.find(l => l.id === t.lead_id) || null
  }));

  // Filtering Logic (Simple mockup for dates: assuming everything is Today for now unless overdue by past dates)
  // Since we don't have deep date generation in all dummy data, we will just simulate the Tabs.
  const now = new Date();
  
  const overdueTasks = enrichedTasks.filter(t => t.status === 'pendente' && t.data_vencimento && new Date(t.data_vencimento) < now);
  
  // Pending tasks that are not overdue
  const todayTasks = enrichedTasks.filter(t => t.status === 'pendente' && (!t.data_vencimento || new Date(t.data_vencimento) >= now));
  
  const completedCount = enrichedTasks.filter(t => t.status === 'concluida').length;

  const getVisibleTasks = () => {
    if (activeTab === 'overdue') return overdueTasks;
    if (activeTab === 'today') return todayTasks;
    return enrichedTasks; // Upcoming will just show all for the sake of demo
  };

  const visibleTasks = getVisibleTasks();

  if (loading && tarefas.length === 0) return <div className="p-8">Carregando gerenciador...</div>;

  return (
    <div className="flex h-screen bg-white">
      
      {/* COLUMN 1: Task Manager Menu */}
      <div className="w-64 border-r border-gray-200 flex flex-col pt-6 shrink-0 h-full overflow-y-auto">
        <div className="px-6 mb-8">
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Task Manager</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Sales Workspace</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50">
            <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-gray-500">❖</span>
            Overview
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-blue-700 bg-blue-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            My Tasks
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50">
            <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-gray-500">👥</span>
            Team Activities
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            Calendar
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50">
            <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-gray-500">↓</span>
            Archive
          </button>
        </nav>

        {/* Mini Calendar Widget */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">AUGUST 2024</span>
            <div className="flex gap-1">
              <button className="p-1 text-gray-400 hover:text-gray-800"><ChevronLeft className="w-3 h-3" /></button>
              <button className="p-1 text-gray-400 hover:text-gray-800"><ChevronRight className="w-3 h-3" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-gray-400 font-medium py-1">{d}</div>)}
            {/* Dummy Days */}
            <div className="text-gray-300 py-1 cursor-default">28</div>
            <div className="text-gray-300 py-1 cursor-default">29</div>
            <div className="text-gray-300 py-1 cursor-default">30</div>
            <div className="text-gray-300 py-1 cursor-default">31</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">1</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">2</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">3</div>
            
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">4</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">5</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">6</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">7</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">8</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">9</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">10</div>

            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">11</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">12</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">13</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">14</div>
            <div className="bg-blue-600 text-white font-bold rounded-full py-1 cursor-pointer">15</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">16</div>
            <div className="text-gray-700 hover:bg-gray-100 rounded-full py-1 cursor-pointer">17</div>
          </div>
        </div>
      </div>

      {/* COLUMN 2: Tasks List */}
      <div className="flex-1 flex flex-col border-r border-gray-200 bg-white h-full overflow-hidden">
        <div className="p-8 pb-0 shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Tasks & Activities</h2>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors">
              <span className="text-lg leading-none">+</span> Create Task
            </button>
          </div>

          <div className="flex gap-8 border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('overdue')}
              className={clsx("pb-4 text-sm font-bold transition-colors relative", activeTab === 'overdue' ? "text-red-500" : "text-gray-500 hover:text-gray-800")}
            >
              Overdue ({overdueTasks.length})
              {activeTab === 'overdue' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />}
            </button>
            <button 
              onClick={() => setActiveTab('today')}
              className={clsx("pb-4 text-sm font-bold transition-colors relative", activeTab === 'today' ? "text-blue-600" : "text-gray-500 hover:text-gray-800")}
            >
              Today ({todayTasks.length})
              {activeTab === 'today' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
            </button>
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={clsx("pb-4 text-sm font-bold transition-colors relative", activeTab === 'upcoming' ? "text-gray-900" : "text-gray-500 hover:text-gray-800")}
            >
              All / Upcoming ({tarefas.length})
              {activeTab === 'upcoming' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-2">
          {visibleTasks.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Nenhuma tarefa nesta categoria.</div>
          ) : (
            visibleTasks.map(t => {
              const isActive = activeTask?.id === t.id;
              const isDone = t.status === 'concluida';
              return (
                <div 
                  key={t.id}
                  onClick={() => setActiveTask(t)}
                  className={clsx(
                    "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer relative",
                    isActive ? "bg-blue-50/50 border-blue-200 shadow-sm" : "bg-white border-transparent hover:border-gray-200",
                    isDone && "bg-gray-50 opacity-60"
                  )}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l-xl" />}
                  
                  <button 
                    onClick={(e) => toggleStatus(t, e)} 
                    className={clsx(
                      "w-6 h-6 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                      isDone ? "bg-blue-600 border-blue-600" : "border-gray-300 hover:border-blue-400 bg-white"
                    )}
                  >
                    {isDone && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h4 className={clsx("text-sm font-bold truncate", isDone ? "line-through text-gray-500" : "text-gray-900")}>
                      {t.titulo}
                    </h4>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {t.lead?.nome || "Lead Desconhecido"} {t.lead?.origem && `- ${t.lead.origem}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {t.prioridade === 'high' ? (
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">High</span>
                    ) : (t.prioridade === 'medium' ? (
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded">Medium</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded">Low</span>
                    ))}
                    
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900">
                        {t.data_vencimento ? new Date(t.data_vencimento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "10:00 AM"}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">Today</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 3: Active Task Detail */}
      <div className="w-[450px] bg-gray-50/50 shrink-0 h-full overflow-y-auto flex flex-col">
        {activeTask ? (() => {
          const isDone = activeTask.status === 'concluida';
          return (
            <>
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">Active Task</span>
                  <button className="text-gray-400 hover:text-gray-700">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mt-2 leading-tight">
                  {activeTask.titulo}
                </h2>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Due Date</p>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                      {activeTask.data_vencimento ? new Date(activeTask.data_vencimento).toLocaleDateString() : "Aug 15, 2024"}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Time</p>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Clock className="w-4 h-4 text-blue-600" />
                      10:00 - 11:30 AM
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {activeTask.descricao || "Nenhuma descrição fornecida para esta tarefa. Entre em contato com o responsável se necessitar de mais detalhes ou instruções."}
                  </p>
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Related Deal & Contact</h3>
                  
                  {/* Lead / Deal Card */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-3 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <span className="font-bold text-xl leading-none">🏢</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {activeLeadFull ? activeLeadFull.nome : "Carregando..."}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {activeLeadFull ? `${activeLeadFull.origem} • ${activeLeadFull.status?.toUpperCase()}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Contact Card */}
                  {activeLeadFull && activeLeadFull.contatos && activeLeadFull.contatos.length > 0 ? (
                    activeLeadFull.contatos.map((contato: any) => (
                      <div key={contato.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={`https://ui-avatars.com/api/?name=${contato.nome}&background=random`} alt="" className="w-full h-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{contato.nome}</p>
                          <p className="text-xs text-gray-500 truncate">{contato.cargo || "Contato SEC"}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <span className="font-bold text-gray-400">?</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">Sem contato associado</p>
                        <p className="text-xs text-gray-400">O lead não possui contatos.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="p-6 bg-white border-t border-gray-200 flex gap-3 mt-auto">
                <button 
                  onClick={() => toggleStatus(activeTask)}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors",
                    isDone 
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"
                  )}
                >
                  {isDone ? <><CheckCircle2 className="w-5 h-5" /> Completed</> : <><CheckCircle2 className="w-5 h-5" /> Mark as Done</>}
                </button>
                <button className="px-6 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 text-sm font-bold rounded-xl shadow-sm transition-colors">
                  Edit
                </button>
              </div>
            </>
          );
        })() : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Selecione uma tarefa para ver os detalhes
          </div>
        )}
      </div>

    </div>
  );
}
