// frontend/src/App.tsx
import { useState, useEffect } from "react";
import api from "./services/api";
import KanbanBoard from "./components/KanbanBoard";
import QueueView from "./components/QueueView";

interface Lead {
  id: string;
  nome: string;
  email_primario: string;
  status: string;
}

function App() {
  const [visaoAtiva, setVisaoAtiva] = useState<"kanban" | "fila">("kanban");
  const [leads, setLeads] = useState<Lead[]>([]);

  // O App.tsx agora é o único responsável por buscar os dados iniciais
  useEffect(() => {
    api.get("/leads/").then((response) => setLeads(response.data));
  }, []);

  // Esta função é passada para os filhos. Quando o status muda lá, a lista principal atualiza aqui.
  const handleAtualizarStatus = (id: string, novoStatus: string) => {
    setLeads((leadsAtuais) =>
      leadsAtuais.map((lead) =>
        lead.id === id ? { ...lead, status: novoStatus } : lead,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col">
      <header className="mb-8 flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">CRM Inteligente</h1>
          <p className="text-gray-500 mt-1">Gestão de Atendimento de Leads</p>
        </div>

        {/* Botões para alternar as visões */}
        <div className="flex bg-gray-200 p-1 rounded-lg">
          <button
            onClick={() => setVisaoAtiva("kanban")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              visaoAtiva === "kanban"
                ? "bg-white shadow-sm text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📋 Kanban
          </button>
          <button
            onClick={() => setVisaoAtiva("fila")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              visaoAtiva === "fila"
                ? "bg-white shadow-sm text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ☰ Fila
          </button>
        </div>
      </header>

      <main className="flex-1">
        {visaoAtiva === "kanban" ? (
          <KanbanBoard leads={leads} onUpdateStatus={handleAtualizarStatus} />
        ) : (
          <QueueView leads={leads} onUpdateStatus={handleAtualizarStatus} />
        )}
      </main>
    </div>
  );
}

export default App;
