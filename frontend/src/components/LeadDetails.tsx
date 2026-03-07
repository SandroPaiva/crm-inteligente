import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Phone, Mail, MapPin, Link2, Plus, Upload, Building2, FileText, X } from "lucide-react";
import clsx from "clsx";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import PhoneInput from "./PhoneInput";

export default function LeadDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'tasks'>('timeline');

  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactData, setNewContactData] = useState({ nome: '', cargo: '', email: '', telefone: '' });
  const [savingContact, setSavingContact] = useState(false);

  const [isAssigning, setIsAssigning] = useState(false);
  const [corretores, setCorretores] = useState<any[]>([]);
  const [selectedCorretor, setSelectedCorretor] = useState<string>('');
  const [savingAssign, setSavingAssign] = useState(false);

  const [isAssigningEmp, setIsAssigningEmp] = useState(false);
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [savingAssignEmp, setSavingAssignEmp] = useState(false);

  useEffect(() => {
    // Buscar lista de corretores
    if (user?.papel !== 'corretor') {
      api.get("/usuarios/").then((res) => {
        setCorretores(res.data);
      }).catch(console.error);
    }
    
    // Buscar lista de empreendimentos
    api.get("/empreendimentos/").then((res) => {
      setEmpreendimentos(res.data);
    }).catch(console.error);
  }, [user]);

  const handleAssignBroker = async () => {
    setSavingAssign(true);
    try {
      if (!selectedCorretor) {
        alert("Selecione um corretor");
        return;
      }
      await api.patch(`/leads/${id}/corretor`, { corretor_id: selectedCorretor });
      setIsAssigning(false);
      fetchLead();
    } catch (e) {
      alert("Erro ao atribuir corretor.");
    } finally {
      setSavingAssign(false);
    }
  };

  const handleAssignEmp = async () => {
    setSavingAssignEmp(true);
    try {
      if (!selectedEmp) {
        alert("Selecione um empreendimento");
        return;
      }
      await api.patch(`/leads/${id}/empreendimento`, { empreendimento_id: selectedEmp });
      setIsAssigningEmp(false);
      fetchLead();
    } catch (e) {
      alert("Erro ao vincular empreendimento.");
    } finally {
      setSavingAssignEmp(false);
    }
  };


  const handleAddContact = async () => {
    setSavingContact(true);
    try {
      await api.post(`/leads/${id}/contatos`, newContactData);
      setIsAddingContact(false);
      setNewContactData({ nome: '', cargo: '', email: '', telefone: '' });
      fetchLead();
    } catch (e) {
      alert("Erro ao adicionar contato.");
    } finally {
      setSavingContact(false);
    }
  };

  const openEditModal = () => {
    if (lead) {
      setEditFormData({
        nome: lead.nome || "",
        email_primario: lead.email_primario || "",
        celular_primario: lead.celular_primario || "",
        interesse: lead.interesse || "",
        origem: lead.origem || "",
        genero: lead.genero || "outros",
        status: lead.status || "novo",
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      await api.put(`/leads/${id}`, editFormData);
      setIsEditing(false);
      fetchLead();
    } catch (e) {
      alert("Erro ao atualizar perfil.");
    } finally {
      setSavingEdit(false);
    }
  };
  const fetchLead = () => {
    if (id) {
      setLoading(true);
      api.get(`/leads/${id}`)
         .then((res) => {
            setLead(res.data);
            setLoading(false);
         })
         .catch((err) => {
            console.error(err);
            setLoading(false);
         });
    }
  };

  useEffect(() => {
    fetchLead();
  }, [id]);

  if (loading) return <div className="p-8">Carregando detalhes...</div>;
  if (!lead) return <div className="p-8 text-red-500">Lead não encontrado.</div>;

  let avatarUrl = "https://i.pravatar.cc/150?u="+lead.id;
  if (lead.genero === 'masculino') avatarUrl = "https://xsgames.co/randomusers/avatar.php?g=male&uid="+lead.id;
  if (lead.genero === 'feminino') avatarUrl = "https://xsgames.co/randomusers/avatar.php?g=female&uid="+lead.id;

  // Data mapping from backend
  const profile = {
    name: lead.nome,
    title: lead.interesse || "Interesse não especificado",
    company: lead.origem || "Não informado",
    email: lead.email_primario,
    phone: lead.celular_primario,
    linkedin: lead.utms?.linkedin || "",
    location: `${lead.cidade || ''} - ${lead.estado || ''}`,
    status: lead.status ? lead.status.toUpperCase().replace("_", " ") : "NOVO",
    avatar: avatarUrl,
    totalDeals: "-",
    openTasks: lead.tarefas ? lead.tarefas.filter((t: any) => t.status === "pendente").length : 0,
    completedTasks: lead.tarefas ? lead.tarefas.filter((t: any) => t.status === "concluida").length : 0
  };

  const timeline = lead.interacoes?.map((int: any) => ({
    type: int.tipo,
    title: int.tipo === 'nota' ? 'Nota Adicionada' : int.tipo,
    time: new Date(int.criado_em).toLocaleString(),
    content: int.conteudo,
    tag: null,
    icon: FileText,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-100'
  })) || [];

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Detalhes do Lead</h1>
        <p className="text-sm text-gray-500 mt-1">Visualize e edite as informações completas deste lead.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT COLUMN: Profile */}
      <div className="lg:col-span-3 space-y-6">
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
            <img src={profile.avatar} alt={profile.name} className="w-24 h-24 rounded-full border-4 border-white shadow-sm mb-4" />
            <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
            <p className="text-sm text-gray-500 mb-2">{profile.title}</p>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mb-6">
              {profile.status}
            </span>

            <div className="w-full space-y-4 mb-8">
               <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  {profile.company}
               </div>
               <div className="flex items-center gap-3 text-sm text-blue-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {profile.email}
               </div>
               <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {profile.phone}
               </div>
               
                {/* Broker/Corretor Assignment UI */}
               <div className="pt-4 mt-6 border-t border-gray-100 w-full">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Atribuído a / Corretor</label>
                  {lead.corretor ? (
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                           {lead.corretor.nome.substring(0, 2)}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-gray-900 leading-none">{lead.corretor.nome}</p>
                           {user?.papel !== 'corretor' && (
                             <p onClick={() => { setSelectedCorretor(lead.corretor_id || ''); setIsAssigning(true); }} className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline">Reatribuir</p>
                           )}
                        </div>
                     </div>
                  ) : (
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                           ND
                        </div>
                        <div>
                           <p className="text-sm font-medium text-gray-500 leading-none">Não definido</p>
                           {user?.papel !== 'corretor' && (
                             <p onClick={() => setIsAssigning(true)} className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline">Atribuir Corretor</p>
                           )}
                        </div>
                     </div>
                  )}
               </div>

               {/* Empreendimento Assignment UI */}
               <div className="pt-4 mt-4 border-t border-gray-100 w-full">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Empreendimento de Interesse</label>
                  {lead.empreendimento?.nome ? (
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                           <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-gray-900 leading-none">{lead.empreendimento.nome}</p>
                           <p onClick={() => { setSelectedEmp(lead.empreendimento_id || ''); setIsAssigningEmp(true); }} className="text-xs text-emerald-600 mt-1 cursor-pointer hover:underline">Alterar Empreendimento</p>
                        </div>
                     </div>
                  ) : (
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                           <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                           <p className="text-sm font-medium text-gray-500 leading-none">Nenhum vinculado</p>
                           <p onClick={() => setIsAssigningEmp(true)} className="text-xs text-emerald-600 mt-1 cursor-pointer hover:underline">Vincular Empreendimento</p>
                        </div>
                     </div>
                  )}
               </div>
               {profile.linkedin && (
                 <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Link2 className="w-4 h-4 text-gray-400" />
                    {profile.linkedin}
                 </div>
               )}
               {profile.location !== " - " && (
                 <div className="flex items-center gap-3 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {profile.location}
                 </div>
               )}
            </div>

             <div className="w-full space-y-3">
              <button
                onClick={async () => {
                  const nota = window.prompt("Digite uma nota sobre o lead:");
                  if (nota) {
                    try {
                      await api.post(`/leads/${id}/interacoes`, {
                        tipo: 'nota',
                        conteudo: nota,
                        novo_status: lead?.status || 'novo'
                      });
                      fetchLead();
                    } catch (e) {
                      alert("Erro ao adicionar nota.");
                    }
                  }
                }}
                className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Nova Atividade
              </button>
              <button 
                onClick={openEditModal}
                className="w-full justify-center items-center py-2.5 bg-gray-50 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-100 border border-gray-200 transition-colors">
                Editar Perfil
              </button>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Open Tasks</span>
              <span className="text-2xl font-bold text-gray-900">{profile.openTasks}</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Completed Tasks</span>
              <span className="text-2xl font-bold text-gray-900">{profile.completedTasks}</span>
            </div>
         </div>
      </div>

      {/* MIDDLE COLUMN: Timeline/Tabs */}
      <div className="lg:col-span-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-8rem)]">
         {/* Tabs */}
         <div className="flex border-b border-gray-100 px-6 pt-2">
            <button 
              onClick={() => setActiveTab('timeline')}
              className={clsx("px-6 py-4 text-sm font-bold flex items-center gap-2", activeTab === 'timeline' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-800")}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Timeline
            </button>
            <button 
              onClick={() => setActiveTab('tasks')}
              className={clsx("px-6 py-4 text-sm font-bold flex items-center gap-2", activeTab === 'tasks' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-800")}>
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
               Tarefas
            </button>
         </div>

         {/* Timeline Content */}
         {activeTab === 'timeline' && (
           <div className="flex-1 overflow-auto p-6 space-y-8">
              {timeline.map((item: any, idx: number) => (
                <div key={idx} className="relative pl-10">
                  {/* Connector Line */}
                  {idx !== timeline.length - 1 && (
                    <div className="absolute left-4 top-10 bottom-[-2rem] w-px bg-gray-200"></div>
                  )}
                  
                  {/* Icon */}
                  <div className={clsx("absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center", item.iconBg, item.iconColor)}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Content */}
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                      <span className="text-xs text-gray-400 font-medium">{item.time}</span>
                    </div>
                    <p className={clsx("text-sm mb-3", item.type === 'email' ? 'italic text-gray-600' : 'text-gray-600')}>
                      {item.content}
                    </p>
                    {item.tag && (
                      item.tagIsLink ? (
                        <a href="#" className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1">
                          {item.tag} <Link2 className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                          {item.tag}
                        </span>
                      )
                    )}
                  </div>
                </div>
              ))}
           </div>
         )}

         {/* Tasks Content */}
         {activeTab === 'tasks' && (
           <div className="flex-1 overflow-auto p-6 space-y-4">
              {(!lead.tarefas || lead.tarefas.length === 0) ? (
                <p className="text-sm text-gray-500">Nenhuma tarefa para este lead.</p>
              ) : (
                lead.tarefas.map((t: any) => (
                  <div key={t.id} className="p-4 border border-gray-100 rounded-lg shadow-sm flex items-start gap-4 hover:border-gray-200 transition-colors">
                    <button 
                      onClick={async () => {
                         try {
                           const novoStatus = t.status === "pendente" ? "concluida" : "pendente";
                           await api.patch(`/tarefas/${t.id}`, { status: novoStatus });
                           fetchLead();
                         } catch (err) {}
                      }}
                      className={clsx("w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors", t.status === "concluida" ? "border-emerald-500 bg-emerald-500" : "border-gray-300 hover:border-blue-500")}>
                      {t.status === "concluida" && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <div>
                      <h4 className={clsx("text-sm font-bold", t.status === "concluida" ? "text-gray-400 line-through" : "text-gray-900")}>{t.titulo}</h4>
                      {t.descricao && <p className="text-xs text-gray-500 mt-1">{t.descricao}</p>}
                    </div>
                  </div>
                ))
              )}
              <div className="pt-4 border-t border-gray-100 mt-4">
                <button 
                  onClick={async () => {
                    const titulo = window.prompt("Digite o título da nova tarefa:");
                    if (titulo) {
                      try {
                        await api.post(`/leads/${id}/tarefas`, { titulo, descricao: "" });
                        fetchLead();
                      } catch (err) { alert("Erro ao criar tarefa."); }
                    }
                  }}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Tarefa
                </button>
              </div>
           </div>
         )}
      </div>

      {/* RIGHT COLUMN: Sidebar Widgets */}
      <div className="lg:col-span-3 space-y-6">
         {/* Associated Contacts */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-sm font-bold text-gray-900">Associated Contacts</h3>
               <button 
                 onClick={() => setIsAddingContact(true)}
                 className="text-blue-600 text-sm font-bold hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full transition-colors">ADD</button>
            </div>
            <div className="space-y-4">
               {(!lead.contatos || lead.contatos.length === 0) ? (
                 <p className="text-xs text-gray-500">Nenhum contato associado.</p>
               ) : (
                 lead.contatos.map((contato: any) => {
                   const initials = contato.nome.substring(0, 2).toUpperCase();
                   return (
                     <div key={contato.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">{initials}</div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-tight">{contato.nome}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{contato.cargo || "Sem cargo"}</p>
                          {(contato.email || contato.telefone) && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{contato.telefone} {contato.email && `• ${contato.email}`}</p>
                          )}
                        </div>
                     </div>
                   );
                 })
               )}
            </div>
         </div>

         {/* Documents */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-sm font-bold text-gray-900">Documentos Anexados</h3>
               <button className="p-1 text-gray-400 hover:text-gray-600">
                  <Upload className="w-4 h-4" />
               </button>
            </div>
            
            <div className="py-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 rounded-lg">
               <FileText className="w-8 h-8 text-gray-300 mb-2" />
               <p className="text-sm font-medium text-gray-600">Nenhum documento</p>
               <p className="text-xs text-gray-400 max-w-[200px] mt-1">
                 A capacidade de anexar contratos e propostas será implementada em atualizações futuras.
               </p>
            </div>
         </div>

         {/* Map Widget */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-32 bg-gray-200 relative">
               {/* Map Pattern Placeholder */}
               <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-blue-600 drop-shadow-md" fill="white" />
               </div>
            </div>
            <div className="p-4 text-center">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">MAIN HEADQUARTERS</p>
               <p className="text-xs text-gray-600">123 Market St, San Francisco, CA</p>
            </div>
         </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Editar Perfil</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={editFormData.nome}
                  onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                />
              </div>
              {user?.papel !== 'corretor' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail Primário</label>
                  <input
                    type="email"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={editFormData.email_primario}
                    onChange={(e) => setEditFormData({ ...editFormData, email_primario: e.target.value })}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-400 flex items-center gap-2">
                    E-mail Primário <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">Restrito</span>
                  </label>
                  <input
                    type="email"
                    disabled
                    className="w-full rounded-md bg-gray-100 text-gray-500 border-gray-300 shadow-sm p-2 border cursor-not-allowed"
                    value={editFormData.email_primario}
                    title="Vendedores não possuem permissão para alterar o e-mail cadastrado."
                  />
                </div>
              )}
              
              {user?.papel !== 'corretor' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Celular Primário</label>
                  <PhoneInput
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={editFormData.celular_primario}
                    onChange={(val) => setEditFormData({ ...editFormData, celular_primario: val })}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-400 flex items-center gap-2">
                    Celular Primário <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">Restrito</span>
                  </label>
                  <PhoneInput
                    disabled
                    className="w-full rounded-md bg-gray-100 text-gray-500 border-gray-300 shadow-sm p-2 border cursor-not-allowed"
                    value={editFormData.celular_primario}
                    onChange={() => {}}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origem / Empresa</label>
                <input
                  type="text"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={editFormData.origem}
                  onChange={(e) => setEditFormData({ ...editFormData, origem: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
                <select
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={editFormData.genero || "outros"}
                  onChange={(e) => setEditFormData({ ...editFormData, genero: e.target.value })}
                >
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fase do Funil</label>
                <select
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={editFormData.status || "novo"}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="novo">Novo</option>
                  <option value="em_atendimento">Em Atendimento</option>
                  <option value="proposta">Proposta</option>
                  <option value="negociacao">Negociação</option>
                  <option value="ganho">Ganho</option>
                  <option value="perdido">Perdido</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEdit ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Contact Modal */}
      {isAddingContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Adicionar Contato</h3>
              <button onClick={() => setIsAddingContact(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={newContactData.nome}
                  onChange={(e) => setNewContactData({ ...newContactData, nome: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo / Relacionamento</label>
                <input
                  type="text"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={newContactData.cargo}
                  onChange={(e) => setNewContactData({ ...newContactData, cargo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={newContactData.email}
                  onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <PhoneInput
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={newContactData.telefone}
                  onChange={(val) => setNewContactData({ ...newContactData, telefone: val })}
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setIsAddingContact(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddContact}
                disabled={savingContact || !newContactData.nome}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {savingContact ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Assign Broker Modal */}
        {isAssigning && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-in zoom-in-95">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Atribuir Corretor</h3>
                <button onClick={() => setIsAssigning(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Profissional</label>
                <select
                  value={selectedCorretor}
                  onChange={(e) => setSelectedCorretor(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                >
                  <option value="">Selecione...</option>
                  {corretores.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsAssigning(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">Cancelar</button>
                  <button 
                    onClick={handleAssignBroker} 
                    disabled={savingAssign || !selectedCorretor}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  >
                    {savingAssign ? "Salvando..." : "Confirmar Atribuição"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assign Empreendimento Modal */}
        {isAssigningEmp && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-in zoom-in-95">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-emerald-50/50">
                <h3 className="text-lg font-bold text-gray-900">Vincular Empreendimento</h3>
                <button onClick={() => setIsAssigningEmp(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Empreendimento</label>
                <select
                  value={selectedEmp}
                  onChange={(e) => setSelectedEmp(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border"
                >
                  <option value="">Selecione...</option>
                  {empreendimentos.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nome}</option>
                  ))}
                </select>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsAssigningEmp(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">Cancelar</button>
                  <button 
                    onClick={handleAssignEmp} 
                    disabled={savingAssignEmp || !selectedEmp}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50"
                  >
                    {savingAssignEmp ? "Salvando..." : "Confirmar Vínculo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
