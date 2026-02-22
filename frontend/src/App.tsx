// frontend/src/App.tsx
import { useEffect, useState } from "react";
import api from "./services/api";

// Definimos o formato (interface) do Lead que vem da API
interface Lead {
  id: string;
  nome: string;
  email_primario: string;
  status: string;
}

function App() {
  // Estado para guardar a lista de leads
  const [leads, setLeads] = useState<Lead[]>([]);

  // Busca os dados assim que o componente é montado
  useEffect(() => {
    api
      .get("/leads/")
      .then((response) => {
        setLeads(response.data); // Guarda os leads no estado
      })
      .catch((error) => {
        console.error("Erro ao buscar leads:", error);
      });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Meus Leads (Teste de Conexão)
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {leads.length === 0 ? (
          <p>Nenhum lead encontrado. Cadastre um pelo Swagger/Webhook!</p>
        ) : (
          <ul>
            {leads.map((lead) => (
              <li key={lead.id} className="border-b py-3 last:border-0">
                <span className="font-semibold">{lead.nome}</span> -{" "}
                {lead.email_primario}
                <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {lead.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
