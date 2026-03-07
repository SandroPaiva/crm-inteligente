import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Building2, Plus, X, Search, Pencil } from "lucide-react";

export default function Empreendimentos() {
  const { user } = useAuth();
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    fetchEmpreendimentos();
  }, []);

  const fetchEmpreendimentos = async () => {
    try {
      const res = await api.get("/empreendimentos/");
      setEmpreendimentos(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (user?.papel !== 'admin') {
    return <div className="p-8"><h1 className="text-xl">Acesso Negado</h1></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Empreendimentos</h1>
          <p className="text-slate-500">Cadastre e gerencie os empreendimentos disponíveis no CRM.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Empreendimento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {empreendimentos.map((emp) => (
            <li key={emp.id} className="p-4 sm:px-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{emp.codigo}</span>
                    <h3 className="font-medium text-slate-900 truncate">{emp.nome}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${emp.disponivel ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {emp.disponivel ? 'Venda Aberta' : 'Indisponível'}
                    </span>
                  </div>
                  {emp.descricao && (
                    <p className="text-sm text-slate-500 mt-0.5 truncate">{emp.descricao}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => { setEditingItem(emp); setShowModal(true); }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar Empreendimento"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
          {!loading && empreendimentos.length === 0 && (
            <li className="p-6 text-center text-slate-500 flex flex-col items-center">
              <Building2 className="w-12 h-12 text-slate-300 mb-2" />
              Nenhum empreendimento cadastrado.
            </li>
          )}
        </ul>
      </div>

      {showModal && <EmpreendimentoModal initialData={editingItem} onClose={() => { setShowModal(false); setEditingItem(null); fetchEmpreendimentos(); }} />}
    </div>
  );
}

function EmpreendimentoModal({ onClose, initialData }: { onClose: () => void, initialData?: any }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo: initialData?.codigo || '',
    nome: initialData?.nome || '',
    descricao: initialData?.descricao || '',
    disponivel: initialData ? initialData.disponivel : true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        await api.put(`/empreendimentos/${initialData.id}`, formData);
      } else {
        await api.post("/empreendimentos/", formData);
      }
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao salvar empreendimento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">{initialData ? 'Editar Empreendimento' : 'Novo Empreendimento'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <label className="text-sm font-medium text-slate-700 flex-1">Disponível para venda</label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, disponivel: !formData.disponivel })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formData.disponivel ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.disponivel ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Código do Empreendimento</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border uppercase font-mono"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
              placeholder="Ex: RES-01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Empreendimento</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Residencial Parque XPTO"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição (Opcional)</label>
            <textarea
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              rows={3}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Detalhes ou localização..."
            />
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? "Salvando..." : (initialData ? "Salvar Alterações" : "Criar Imóvel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
