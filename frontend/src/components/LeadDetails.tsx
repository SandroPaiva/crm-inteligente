// frontend/src/components/LeadDetails.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

// Tipagem dos dados (igual ao Backend)
interface Interacao {
  id: string;
  tipo: string;
  conteudo: string;
  criado_em: string;
}

interface LeadDetalhado {
  id: string;
  nome: string;
  email_primario: string;
  celular_primario: string;
  status: string;
  interacoes: Interacao[]; // A lista de histórico
}

const STATUS_OPCOES = [
  { value: "novo", label: "Novo Lead" },
  { value: "em_atendimento", label: "Em Atendimento" },
  { value: "proposta", label: "Proposta" },
  { value: "ganho", label: "Ganho" },
  { value: "perdido", label: "Perdido" },
];

export default function LeadDetails() {
  const { id } = useParams(); // Pega o ID da URL
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetalhado | null>(null);

  // Estado do formulário de nova interação
  const [novaNota, setNovaNota] = useState("");
  const [novoStatus, setNovoStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Busca os dados assim que a tela abre
  useEffect(() => {
    carregarLead();
  }, [id]);

  const carregarLead = async () => {
    try {
      const response = await api.get(`/leads/${id}`);
      setLead(response.data);
      setNovoStatus(response.data.status); // Já deixa o select preenchido com o status atual
    } catch (error) {
      alert("Erro ao carregar lead.");
      navigate("/kanban");
    }
  };

  const handleSalvarInteracao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaNota) return;

    setLoading(true);
    try {
      // Envia a nota E o status (Regra de Negócio)
      await api.post(`/leads/${id}/interacoes`, {
        tipo: "nota", // Por enquanto fixo como nota, depois podemos expandir
        conteudo: novaNota,
        novo_status: novoStatus,
      });

      setNovaNota(""); // Limpa o campo
      carregarLead(); // Recarrega a tela para mostrar a nota nova na lista
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar interação.");
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return <div className="p-8">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* COLUNA DA ESQUERDA: DADOS DO CLIENTE */}
      <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{lead.nome}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">
              Status Atual
            </label>
            <span className="block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm w-fit mt-1">
              {STATUS_OPCOES.find((o) => o.value === lead.status)?.label ||
                lead.status}
            </span>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">
              E-mail
            </label>
            <p className="text-gray-700">{lead.email_primario}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">
              Celular
            </label>
            <p className="text-gray-700">{lead.celular_primario}</p>
          </div>
          <button
            onClick={() => navigate("/kanban")}
            className="text-blue-600 text-sm hover:underline mt-4"
          >
            ← Voltar para o Kanban
          </button>
        </div>
      </div>

      {/* COLUNA DA DIREITA: HISTÓRICO E AÇÃO */}
      <div className="md:col-span-2 space-y-6">
        {/* Formulário de Nova Interação */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-4">Registrar Interação</h3>
          <form onSubmit={handleSalvarInteracao}>
            <textarea
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
              rows={3}
              placeholder="Escreva uma nota, resumo da ligação ou e-mail..."
              value={novaNota}
              onChange={(e) => setNovaNota(e.target.value)}
              required
            />

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Mover para:</span>
                <select
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value)}
                  className="border-gray-300 rounded-md shadow-sm text-sm p-2 border"
                >
                  {STATUS_OPCOES.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar Interação"}
              </button>
            </div>
          </form>
        </div>

        {/* Linha do Tempo (Timeline) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-6">Histórico</h3>
          <div className="space-y-6">
            {lead.interacoes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Nenhuma interação registrada ainda.
              </p>
            ) : (
              lead.interacoes.map((interacao) => (
                <div key={interacao.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                    <div className="w-0.5 bg-gray-200 flex-1 h-full mt-1"></div>
                  </div>
                  <div className="pb-4">
                    <p className="text-xs text-gray-400 mb-1">
                      {new Date(interacao.criado_em).toLocaleString()}
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg text-gray-800 text-sm border border-gray-100">
                      {interacao.conteudo}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
