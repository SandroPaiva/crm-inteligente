// frontend/src/components/KanbanBoard.tsx
import { useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import api from "../services/api";

// Definimos o formato do nosso Lead
interface Lead {
  id: string;
  nome: string;
  email_primario: string;
  status: string;
}

// Definimos as colunas e os seus títulos (as chaves devem corresponder ao Enum do backend)
const COLUNAS = {
  novo: "Novo Lead",
  em_atendimento: "Em Atendimento",
  proposta: "Proposta",
  ganho: "Ganho",
  perdido: "Perdido",
};

export default function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);

  // 1. Buscar os leads na API ao carregar o componente
  useEffect(() => {
    api.get("/leads/").then((response) => setLeads(response.data));
  }, []);

  // 2. Função acionada quando o utilizador solta o cartão
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Se largou fora de uma coluna válida, não faz nada
    if (!destination) return;

    // Se largou no mesmo sítio de onde tirou, não faz nada
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const novoStatus = destination.droppableId;

    // Atualização Otimista: Atualizamos o visual instantaneamente para o utilizador não esperar
    setLeads((leadsAtuais) =>
      leadsAtuais.map((lead) =>
        lead.id === draggableId ? { ...lead, status: novoStatus } : lead,
      ),
    );

    // Chamamos a API em segundo plano para persistir a mudança no PostgreSQL
    try {
      await api.patch(`/leads/${draggableId}/status`, { status: novoStatus });
    } catch (error) {
      console.error("Erro ao atualizar o status:", error);
      // Se a API falhar, poderíamos reverter o estado aqui (rollback)
      alert("Erro ao salvar a alteração no servidor.");
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.entries(COLUNAS).map(([statusKey, tituloColuna]) => {
          // Filtramos os leads para mostrar apenas os desta coluna
          const leadsDestaColuna = leads.filter(
            (lead) => lead.status === statusKey,
          );

          return (
            <Droppable key={statusKey} droppableId={statusKey}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col min-w-[300px] p-4 rounded-xl transition-colors ${
                    snapshot.isDraggingOver ? "bg-blue-50" : "bg-gray-100"
                  }`}
                >
                  <h2 className="font-bold text-gray-700 mb-4 flex justify-between">
                    {tituloColuna}
                    <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {leadsDestaColuna.length}
                    </span>
                  </h2>

                  <div className="flex-1 min-h-[150px]">
                    {leadsDestaColuna.map((lead, index) => (
                      <Draggable
                        key={lead.id}
                        draggableId={lead.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-4 mb-3 rounded-lg shadow-sm border border-gray-200 bg-white ${
                              snapshot.isDragging
                                ? "shadow-lg ring-2 ring-blue-400"
                                : ""
                            }`}
                          >
                            <h3 className="font-semibold text-gray-800">
                              {lead.nome}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {lead.email_primario}
                            </p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {/* Placeholder necessário pela biblioteca para manter o espaço ao arrastar */}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
