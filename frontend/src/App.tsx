// frontend/src/App.tsx
import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import api from "./services/api";
import KanbanBoard from "./components/KanbanBoard";
import QueueView from "./components/QueueView";
import LeadForm from "./components/LeadForm"; // O novo formulário

// Componente de Layout que contém o Menu e a lógica de busca de dados
function Layout() {
  const location = useLocation();
  const [leads, setLeads] = useState<any[]>([]);

  // Toda vez que a URL mudar (location.pathname), ou ao carregar, ele busca os dados fresquinhos do banco
  useEffect(() => {
    api.get("/leads/").then((response) => setLeads(response.data));
  }, [location.pathname]);

  const handleAtualizarStatus = (id: string, novoStatus: string) => {
    setLeads((leadsAtuais) =>
      leadsAtuais.map((lead) =>
        lead.id === id ? { ...lead, status: novoStatus } : lead,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Menu de Navegação Global */}
      <nav className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-blue-600">CRM Inteligente</h1>

          <div className="flex gap-2">
            <Link
              to="/kanban"
              className={`px-3 py-2 rounded-md font-medium ${location.pathname.includes("kanban") ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
            >
              📋 Kanban
            </Link>
            <Link
              to="/fila"
              className={`px-3 py-2 rounded-md font-medium ${location.pathname.includes("fila") ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
            >
              ☰ Fila
            </Link>
          </div>
        </div>

        {/* Botão de Adicionar Lead Manualmente */}
        <Link
          to="/novo-lead"
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          + Novo Lead
        </Link>
      </nav>

      {/* Miolo dinâmico das páginas */}
      <main className="flex-1 p-8">
        <Routes>
          {/* O que renderizar em cada URL */}
          <Route
            path="/"
            element={
              <KanbanBoard
                leads={leads}
                onUpdateStatus={handleAtualizarStatus}
              />
            }
          />
          <Route
            path="/kanban"
            element={
              <KanbanBoard
                leads={leads}
                onUpdateStatus={handleAtualizarStatus}
              />
            }
          />
          <Route
            path="/fila"
            element={
              <QueueView leads={leads} onUpdateStatus={handleAtualizarStatus} />
            }
          />
          <Route path="/novo-lead" element={<LeadForm />} />
        </Routes>
      </main>
    </div>
  );
}

// O App agora apenas envolve tudo com o BrowserRouter
function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
