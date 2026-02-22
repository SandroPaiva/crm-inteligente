// frontend/src/App.tsx
import KanbanBoard from "./components/KanbanBoard";

function App() {
  return (
    <div className="min-h-screen p-8 flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">CRM Inteligente</h1>
        <p className="text-gray-500">Gestão de Atendimento de Leads</p>
      </header>

      {/* Aqui chamamos o nosso componente Kanban! */}
      <main className="flex-1">
        <KanbanBoard />
      </main>
    </div>
  );
}

export default App;
