import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, MessageSquare, Phone, Mail, Building2, Filter, SortDesc } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import clsx from "clsx";

interface Lead {
  id: string;
  nome: string;
  empresa?: string;
  email_primario: string;
  status: string;
  valor?: number;
  numero_sequencial?: number;
  celular_primario?: string;
  empreendimento_nome?: string;
  owner?: string;
  ownerAvatar?: string;
}

const COLUNAS = [
  { id: "novo", title: "PROSPECÇÃO", color: "text-blue-600", bgLine: "bg-blue-600" },
  { id: "em_atendimento", title: "QUALIFICAÇÃO", color: "text-emerald-600", bgLine: "bg-emerald-600" },
  { id: "proposta", title: "PROPOSTA", color: "text-amber-500", bgLine: "bg-amber-500" },
  { id: "negociacao", title: "NEGOCIAÇÃO", color: "text-purple-600", bgLine: "bg-purple-600" },
  { id: "ganho", title: "GANHO", color: "text-green-600", bgLine: "bg-green-600" },
  { id: "perdido", title: "PERDIDO", color: "text-red-600", bgLine: "bg-red-600" },
];

export default function Kanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/leads/").then((response) => setLeads(response.data)).catch(console.error);
  }, []);

  const displayLeads = leads;

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const novoStatus = destination.droppableId;
    
    // Optistic UI update
    setLeads(currentLeads => 
      currentLeads.map(lead => 
        lead.id === draggableId ? { ...lead, status: novoStatus } : lead
      )
    );

    try {
      await api.patch(`/leads/${draggableId}/status`, { status: novoStatus });
    } catch (error) {
      console.error("Erro ao atualizar o status:", error);
      // Optional: Revert on error
    }
  };

  const getColumnTotal = (colId: string) => {
    return displayLeads
      .filter(l => l.status === colId)
      .reduce((sum, lead) => sum + (lead.valor || 0), 0)
      .toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-6 border-b border-gray-200">
          <button className="pb-4 px-2 text-sm font-bold text-blue-600 border-b-2 border-blue-600 flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center text-[10px] text-blue-700">📊</span>
            Kanban View
          </button>
          <button className="pb-4 px-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2">
            <span className="w-4 h-4 flex items-center justify-center text-[10px]">≡</span>
            List View
          </button>
          <button className="pb-4 px-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2">
            <span className="w-4 h-4 flex items-center justify-center text-[10px]">📈</span>
            Forecast
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4 text-gray-400" />
            Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
            <SortDesc className="w-4 h-4 text-gray-400" />
            Value: High to Low
          </button>
        </div>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 flex-1 items-start">
          {COLUNAS.map((col) => {
            const columnLeads = displayLeads.filter(l => l.status === col.id);
            
            return (
              <Droppable key={col.id} droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={clsx(
                      "flex flex-col min-w-[320px] rounded-xl bg-gray-50 border border-gray-100/50 p-4 transition-colors",
                      snapshot.isDraggingOver && "bg-gray-100 border-gray-200"
                    )}
                  >
                    {/* Column Header */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800 text-sm">{col.title}</h3>
                        <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                          {columnLeads.length}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-500">{getColumnTotal(col.id)}</span>
                    </div>

                    {/* Draggable Cards */}
                    <div className="flex-1 min-h-[150px] space-y-3">
                      {columnLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              id={`kanban-card-${lead.id}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => navigate(`/leads/${lead.id}`)}
                              className={clsx(
                                "group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer relative overflow-hidden",
                                snapshot.isDragging && "shadow-lg ring-2 ring-blue-400 scale-[1.02] z-50",
                                snapshot.isDragging ? "" : ""
                              )}
                            >
                              {/* Accent Line Left */}
                              {(col.id === 'proposta' || col.id === 'negociacao') && (
                                <div className={clsx("absolute left-0 top-0 bottom-0 w-1", col.bgLine)} />
                              )}
                              
                              <div className="flex justify-between items-start mb-2">
                                <span className={clsx("text-xs font-bold tracking-wider", col.color)}>
                                  #{String(lead.numero_sequencial || "0").padStart(7, '0')}
                                </span>
                                <button className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <h4 className="font-bold text-gray-900 text-sm mb-3 leading-snug pr-4 line-clamp-2">
                                {lead.nome}
                              </h4>

                              <div className="space-y-1 mb-4">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Mail className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{lead.email_primario || '---'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Phone className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{lead.celular_primario || '---'}</span>
                                </div>
                                {lead.empreendimento_nome && (
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit mt-1.5">
                                    <Building2 className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{lead.empreendimento_nome}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex justify-end items-center mt-auto">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center border border-white shrink-0 uppercase">
                                  {lead.nome.substring(0,2)}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
