// frontend/src/components/LeadForm.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function LeadForm() {
  const navigate = useNavigate(); // Ferramenta para redirecionar o usuário após salvar
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nome: "",
    email_primario: "",
    celular_primario: "",
    origem: "Cadastro Manual", // Origem padrão para diferenciar do Webhook
    genero: "outros",
    empreendimento_id: "",
    corretor_id: "",
  });

  useEffect(() => {
    // Busca empreendimentos ao carregar o form
    api.get("/empreendimentos/")
      .then(res => setEmpreendimentos(res.data))
      .catch(err => console.error("Erro ao carregar empreendimentos:", err));
      
    if (user?.papel !== 'corretor') {
      api.get("/usuarios/")
        .then(res => setUsuarios(res.data))
        .catch(err => console.error("Erro ao carregar usuários:", err));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { corretor_id, empreendimento_id, ...rest } = formData;
      const payload: any = { ...rest };
      if (corretor_id) payload.corretor_id = corretor_id;
      if (empreendimento_id) payload.empreendimento_id = empreendimento_id;

      await api.post("/leads/", payload);
      alert("Lead cadastrado com sucesso!");
      navigate("/leads"); // Redireciona para a lista
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

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Gênero
          </label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            value={formData.genero}
            onChange={(e) =>
              setFormData({ ...formData, genero: e.target.value })
            }
          >
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
            <option value="outros">Outros</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Empreendimento de Interesse
          </label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            value={formData.empreendimento_id}
            onChange={(e) =>
              setFormData({ ...formData, empreendimento_id: e.target.value })
            }
          >
            <option value="">Nenhum/Indefinido</option>
            {empreendimentos.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome}</option>
            ))}
          </select>
        </div>

        {user?.papel !== 'corretor' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Atribuir a (Corretor)
            </label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              value={formData.corretor_id}
              onChange={(e) =>
                setFormData({ ...formData, corretor_id: e.target.value })
              }
            >
              <option value="">(Ninguém - Lead Solto)</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nome} ({u.papel})</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Como {user?.papel}, você pode atribuir este lead para qualquer pessoa da sua equipe.
            </p>
          </div>
        )}

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/leads")}
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
