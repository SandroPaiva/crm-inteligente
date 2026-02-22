// frontend/src/components/QueueView.tsx
import api from "../services/api";

// Definimos os tipos que vamos receber do componente Pai (App.tsx)
interface Lead {
  id: string;
  nome: string;
  email_primario: string;
  status: string;
}

interface QueueViewProps {
  leads: Lead[];
  onUpdateStatus: (id: string, novoStatus: string) => void;
}

const STATUS_OPCOES = [
  { value: "novo", label: "Novo Lead" },
  { value: "em_atendimento", label: "Em Atendimento" },
  { value: "proposta", label: "Proposta" },
  { value: "ganho", label: "Ganho" },
  { value: "perdido", label: "Perdido" },
];

export default function QueueView({ leads, onUpdateStatus }: QueueViewProps) {
  // Função que lida com a mudança no dropdown (select)
  const handleStatusChange = async (leadId: string, novoStatus: string) => {
    // 1. Atualiza a interface instantaneamente (chamando a função do Pai)
    onUpdateStatus(leadId, novoStatus);

    // 2. Salva no banco de dados via API
    try {
      await api.patch(`/leads/${leadId}/status`, { status: novoStatus });
    } catch (error) {
      console.error("Erro ao atualizar status na fila:", error);
      alert("Erro ao salvar no servidor.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Lead
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contato
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status Atual
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {lead.nome}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {lead.email_primario}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {/* Dropdown para mudar o status diretamente na fila */}
                <select
                  value={lead.status}
                  onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {STATUS_OPCOES.map((opcao) => (
                    <option key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                Nenhum lead encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
