// frontend/src/components/LeadForm.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function LeadForm() {
  const navigate = useNavigate(); // Ferramenta para redirecionar o usuário após salvar
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email_primario: "",
    celular_primario: "",
    origem: "Cadastro Manual", // Origem padrão para diferenciar do Webhook
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Reutilizamos o endpoint robusto que já valida os dados!
      await api.post("/webhook/leads/", formData);
      alert("Lead cadastrado com sucesso!");
      navigate("/kanban"); // Redireciona para o Kanban após salvar
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.detail || "Erro ao cadastrar lead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Cadastrar Novo Lead
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nome Completo *
          </label>
          <input
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            E-mail *
          </label>
          <input
            type="email"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            value={formData.email_primario}
            onChange={(e) =>
              setFormData({ ...formData, email_primario: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Celular / WhatsApp *
          </label>
          <input
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            value={formData.celular_primario}
            onChange={(e) =>
              setFormData({ ...formData, celular_primario: e.target.value })
            }
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/kanban")}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar Lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
