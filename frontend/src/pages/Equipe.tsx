import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Users, Plus, X, Shield, ShieldCheck, Mail, Settings, Upload, Download, Grid, List as ListIcon } from "lucide-react";
import TeamImportWizard from "../components/TeamImportWizard";
import { generateCSV } from "../utils/reportGenerator";

export default function Equipe() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null); // Se true, modal é de edição
  const [showImportWizard, setShowImportWizard] = useState(false);

  // Layout View mode
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

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

  const handleExportCSV = () => {
    if (usuarios.length === 0) return alert("Não há usuários para exportar.");
    const dataToExport = usuarios.map(u => ({
      ID: u.id,
      Nome: u.nome,
      "E-mail": u.email,
      Papel: u.papel,
      "Manager ID": u.gerente_id || "",
      "Cadastrado Em": u.criado_em ? new Date(u.criado_em).toLocaleDateString() : ""
    }));
    generateCSV(dataToExport, "equipe_crm");
  };

  if (user?.papel === 'corretor') {
    return <div className="p-8"><h1 className="text-xl">Acesso Negado</h1></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Gestão da Equipe
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie os acessos e permissões dos seus corretores e gerentes.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg mr-2">
            <button 
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Visualização em Cards"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Visualização em Tabela"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          
          <button
            onClick={() => setShowImportWizard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>

          <button
            onClick={() => { setUserToEdit(null); setShowModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Membro
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-12">
           <div className="w-8 h-8 mx-auto border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : usuarios.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhum membro encontrado</h3>
            <p className="text-slate-500 text-sm">Sua base de equipe parece estar vazia além de você.</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usuarios.map((u) => (
            <div key={u.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative group">
              
              {user?.papel === 'admin' || (user?.papel === 'gerente' && u.papel === 'corretor') ? (
                <button 
                  onClick={() => { setUserToEdit(u); setShowModal(true); }}
                  className="absolute top-4 right-4 p-2 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Editar Membro"
                >
                  <Settings className="w-4 h-4" />
                </button>
              ) : null}

              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  u.papel === 'admin' ? 'bg-purple-100 text-purple-600' : 
                  u.papel === 'gerente' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Users className="w-6 h-6" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-slate-900 truncate" title={u.nome}>{u.nome}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 truncate" title={u.email}>
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Nível / Papel</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    u.papel === 'admin' ? 'bg-purple-100 text-purple-800' : 
                    u.papel === 'gerente' ? 'bg-blue-100 text-blue-800' : 
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {u.papel}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Membro desde</span>
                  <span className="text-slate-700 font-medium">{u.criado_em ? new Date(u.criado_em).toLocaleDateString() : '--'}</span>
                </div>
                
                {u.gerente_id && (
                  <div className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded-lg mt-2">
                    <span className="text-slate-500 text-xs">Gestor Resp.</span>
                    <span className="text-slate-700 font-medium text-xs truncate max-w-[140px]" title={usuarios.find(x => x.id === u.gerente_id)?.nome}>
                       {usuarios.find(x => x.id === u.gerente_id)?.nome || 'ID Removido'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Nome / E-mail</th>
                  <th className="px-6 py-4 font-semibold">Papel</th>
                  <th className="px-6 py-4 font-semibold">Gestor Responsável</th>
                  <th className="px-6 py-4 font-semibold">Cadastrado em</th>
                  <th className="px-6 py-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{u.nome}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold uppercase ${
                          u.papel === 'admin' ? 'bg-purple-100 text-purple-700' : 
                          u.papel === 'gerente' ? 'bg-blue-100 text-blue-700' : 
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {u.papel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       {u.gerente_id ? (
                           <span className="flex items-center gap-1.5 text-slate-700">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                              {usuarios.find(x => x.id === u.gerente_id)?.nome || 'Líder Excluído'}
                           </span>
                       ) : <span className="text-slate-400 text-xs italic">Nenhum</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                       {u.criado_em ? new Date(u.criado_em).toLocaleDateString() : '--'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user?.papel === 'admin' || (user?.papel === 'gerente' && u.papel === 'corretor') ? (
                        <button 
                          onClick={() => { setUserToEdit(u); setShowModal(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                          title="Editar/Gerenciar"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      ) : (
                         <span className="text-xs text-slate-400">Sem Permissão</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <UserModal 
        usuarios={usuarios} 
        editUserConfig={userToEdit}
        onClose={() => { setShowModal(false); setUserToEdit(null); fetchUsuarios(); }} 
      />}
      
      {showImportWizard && (
        <TeamImportWizard 
           onClose={() => setShowImportWizard(false)}
           onImportDone={() => fetchUsuarios()}
        />
      )}
    </div>
  );
}

// -------------------------------
// MODAL DE CRIAÇÃO E EDIÇÃO
// -------------------------------
function UserModal({ onClose, usuarios, editUserConfig }: { onClose: () => void, usuarios: any[], editUserConfig?: any }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const isEditing = !!editUserConfig;

  const [formData, setFormData] = useState({
    nome: editUserConfig?.nome || '',
    email: editUserConfig?.email || '',
    senha: '', // Senha é sempre enviada vazia no modo edição a não ser que o usuário mude
    papel: editUserConfig?.papel || (user?.papel === 'gerente' ? 'corretor' : 'corretor'),
    gerente_id: editUserConfig?.gerente_id || ''
  });

  const getGerentesDropdown = () => {
    return usuarios.filter(u => (u.papel === 'gerente' || u.papel === 'admin') && u.id !== editUserConfig?.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      
      // Sanitizações
      if (!payload.gerente_id) delete payload.gerente_id;
      if (user?.papel === 'gerente') delete payload.gerente_id;
      
      if (isEditing) {
         if (!payload.senha) delete payload.senha; // Se não digitou senha, não altera.
         await api.patch(`/usuarios/${editUserConfig.id}`, payload);
      } else {
         await api.post("/usuarios/", payload);
      }

      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || `Erro ao ${isEditing ? 'editar' : 'criar'} usuário`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900">
            {isEditing ? `Editando Perfil de ${editUserConfig.nome}` : 'Novo Membro da Equipe'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome Completo</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border transition-all"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail de Acesso</label>
            <input
              type="email"
              required
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border transition-all"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
               Senha de Acesso
               {isEditing && <span className="text-xs font-normal text-slate-400 font-medium italic">(Preencha só se quiser alterar)</span>}
            </label>
            <input
              type="password"
              required={!isEditing}
              autoComplete="new-password"
              placeholder={isEditing ? "Deixe em branco para manter a senha atual" : "Crie uma senha forte"}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border transition-all"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              Nível de Acesso (Papel)
              {user?.papel === 'gerente' && <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Restrito</span>}
            </label>
            <select
              disabled={user?.papel === 'gerente'}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border disabled:bg-slate-50 disabled:text-slate-500 font-medium"
              value={formData.papel}
              onChange={(e) => setFormData({ ...formData, papel: e.target.value })}
            >
              {user?.papel === 'admin' && (
                <>
                  <option value="admin">Administrador (Poder Total)</option>
                  <option value="gerente">Gerente de Vendas / Líder</option>
                </>
              )}
              <option value="corretor">Corretor de Imóveis (Padrão)</option>
            </select>
            {user?.papel === 'gerente' && !isEditing && (
              <p className="text-xs text-slate-500 mt-1.5">
                Você pode cadastrar novos corretores para seu próprio time.
              </p>
            )}
          </div>

          {user?.papel === 'admin' && formData.papel === 'corretor' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Subordinar a qual Gerente?
              </label>
              <select
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
                value={formData.gerente_id}
                onChange={(e) => setFormData({ ...formData, gerente_id: e.target.value })}
              >
                <option value="">-- Sem Chefe Imediato (Responde ao Admin) --</option>
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
              className="px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? "Salvando..." : isEditing ? "Salvar Alterações" : "Confirmar Cadastro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
