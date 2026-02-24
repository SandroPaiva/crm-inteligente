// frontend/src/components/KanbanBoard.tsx
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

interface Lead {
  id: string;
  nome: string;
  email_primario: string;
  status: string;
}

// Agora o Kanban recebe os leads e a função de atualizar via Props
interface KanbanBoardProps {
  leads: Lead[];
  onUpdateStatus: (id: string, novoStatus: string) => void;
}

const COLUNAS = {
  novo: "Novo Lead",
  em_atendimento: "Em Atendimento",
  proposta: "Proposta",
  ganho: "Ganho",
  perdido: "Perdido",
};

export default function KanbanBoard({
  leads,
  onUpdateStatus,
}: KanbanBoardProps) {
  const navigate = useNavigate(); // 2. Hook
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const novoStatus = destination.droppableId;

    // 1. Avisa o Pai (App.tsx) para atualizar a tela instantaneamente
    onUpdateStatus(draggableId, novoStatus);

    // 2. Salva no banco via API
    try {
      await api.patch(`/leads/${draggableId}/status`, { status: novoStatus });
    } catch (error) {
      console.error("Erro ao atualizar o status:", error);
      alert("Erro ao salvar a alteração no servidor.");
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.entries(COLUNAS).map(([statusKey, tituloColuna]) => {
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
                            onClick={() => navigate(`/leads/${lead.id}`)}
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
