import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Users, Plus, X, Shield, ShieldCheck, Mail, Lock, Settings } from "lucide-react";

export default function Equipe() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editManagerModal, setEditManagerModal] = useState<any>(null);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const res = await api.get("/usuarios/");
      setUsuarios(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (user?.papel === 'corretor') {
    return <div className="p-8"><h1 className="text-xl">Acesso Negado</h1></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Equipe</h1>
          <p className="text-slate-500">Gerencie seus corretores e acessos ao sistema.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Membro
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {usuarios.map((u) => (
            <li key={u.id} className="p-4 sm:px-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  u.papel === 'admin' ? 'bg-purple-100' : u.papel === 'gerente' ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <Users className={`w-5 h-5 ${
                    u.papel === 'admin' ? 'text-purple-600' : u.papel === 'gerente' ? 'text-blue-600' : 'text-slate-600'
                  }`} />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">{u.nome}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="w-3.5 h-3.5" />
                    {u.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                  u.papel === 'admin' ? 'bg-purple-100 text-purple-800' : 
                  u.papel === 'gerente' ? 'bg-blue-100 text-blue-800' : 
                  'bg-slate-100 text-slate-800'
                }`}>
                  {u.papel}
                </span>
                
                {user?.papel === 'admin' && u.papel !== 'admin' && (
                  <button 
                    onClick={() => setEditManagerModal(u)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Alterar Subordinação (Gerente do Corretor)"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
          {!loading && usuarios.length === 0 && (
            <li className="p-6 text-center text-slate-500">Nenhum membro encontrado.</li>
          )}
        </ul>
      </div>

      {showModal && <UserModal usuarios={usuarios} onClose={() => { setShowModal(false); fetchUsuarios(); }} />}
      {editManagerModal && (
        <EditManagerModal 
          targetUser={editManagerModal} 
          usuarios={usuarios} 
          onClose={() => { setEditManagerModal(null); fetchUsuarios(); }} 
        />
      )}
    </div>
  );
}

function UserModal({ onClose, usuarios }: { onClose: () => void, usuarios: any[] }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    papel: user?.papel === 'gerente' ? 'corretor' : 'corretor',
    gerente_id: ''
  });

  const getGerentesDropdown = () => {
    return usuarios.filter(u => u.papel === 'gerente' || u.papel === 'admin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.gerente_id) delete payload.gerente_id;
      if (user?.papel === 'gerente') delete payload.gerente_id; // backend will handle it

      await api.post("/usuarios/", payload);
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Novo Membro da Equipe</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha de Acesso</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
              Nível de Acesso
              {user?.papel === 'gerente' && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Fixo pelo seu perfil</span>}
            </label>
            <select
              disabled={user?.papel === 'gerente'}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border disabled:bg-slate-50 disabled:text-slate-500"
              value={formData.papel}
              onChange={(e) => setFormData({ ...formData, papel: e.target.value })}
            >
              {user?.papel === 'admin' && (
                <>
                  <option value="admin">Administrador (Total)</option>
                  <option value="gerente">Gerente de Vendas</option>
                </>
              )}
              <option value="corretor">Corretor de Imóveis</option>
            </select>
            {user?.papel === 'gerente' && (
              <p className="text-xs text-slate-500 mt-1">
                Como Gerente, todo corretor criado ficará subordinado a você.
              </p>
            )}
          </div>

          {user?.papel === 'admin' && formData.papel === 'corretor' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Gerente Responsável pela Conta (Opcional)
              </label>
              <select
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-blue-50/30"
                value={formData.gerente_id}
                onChange={(e) => setFormData({ ...formData, gerente_id: e.target.value })}
              >
                <option value="">-- Sem Gestor Específico (Ligado ao Admin) --</option>
                {getGerentesDropdown().map(g => (
                  <option key={g.id} value={g.id}>{g.nome} ({g.papel})</option>
                ))}
              </select>
            </div>
          )}

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
              {loading ? "Cadastrando..." : "Confirmar Cadastro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditManagerModal({ targetUser, usuarios, onClose }: { targetUser: any, usuarios: any[], onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [gerenteId, setGerenteId] = useState(targetUser.gerente_id || '');

  const potientalManagers = usuarios.filter(u => (u.papel === 'gerente' || u.papel === 'admin') && u.id !== targetUser.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`/usuarios/${targetUser.id}/gerente`, { gerente_id: gerenteId || null });
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao alterar gerência");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Alterar Superior</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="mb-4">
            <p className="text-sm text-slate-500 mb-2">
              Selecione o novo Gestor/Admin para o usuário <strong>{targetUser.nome}</strong>.
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Novo Responsável:
            </label>
            <select
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              value={gerenteId}
              onChange={(e) => setGerenteId(e.target.value)}
            >
              <option value="">-- Sem Gestor / Solto na Base --</option>
              {potientalManagers.map(g => (
                <option key={g.id} value={g.id}>{g.nome} ({g.papel})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
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
              {loading ? "Salvando..." : "Salvar Alteração"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
