import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Download, Plus, Filter, Calendar, Users, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import api from "../services/api";

export default function ContactsList() {
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    // Buscar os leads reais da API
    api.get("/leads/").then((response) => setContacts(response.data)).catch(console.error);
  }, []);

  const displayData = contacts;

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este contato?")) {
      try {
        await api.delete(`/leads/${id}`);
        setContacts(contacts.filter(c => c.id !== id));
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir contato");
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contatos de Clientes</h2>
          <p className="text-gray-500 text-sm mt-1">Uma visão centralizada de {contacts.length} relacionamentos em toda a sua organização.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <Link to="/novo-lead" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Novo Contato
          </Link>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 py-2">
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          <Filter className="w-4 h-4 text-gray-400" />
          Status: Todos
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          Últimos 30 dias
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          <Users className="w-4 h-4 text-gray-400" />
          Dono: Todas as Equipes
        </button>
        <button className="text-blue-600 text-sm font-semibold hover:text-blue-700 ml-2">
          Limpar filtros
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-4 px-6">Nome do Contato</th>
                <th className="py-4 px-6">Empresa</th>
                <th className="py-4 px-6">Celular</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Dono</th>
                <th className="py-4 px-6 w-12">Opções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayData.map((contact, i) => (
                <tr key={contact.id || i} className="hover:bg-gray-50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs uppercase tracking-wider">
                        {contact.nome ? contact.nome.substring(0, 2) : 'NA'}
                      </div>
                      <Link to={`/leads/${contact.id}`} className="text-sm font-bold text-blue-600 hover:underline">{contact.nome}</Link>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">{contact.origem || contact.empresa || '-'}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">{contact.celular_primario || '-'}</td>
                  <td className="py-4 px-6">
                    <span className={clsx(
                      "px-2.5 py-1 text-xs font-semibold rounded-full",
                      contact.status === 'ganho' ? 'bg-green-100 text-green-700' :
                      contact.status === 'perdido' ? 'bg-red-100 text-red-700' :
                      contact.status === 'novo' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {contact.status ? contact.status.toUpperCase().replace("_", " ") : 'NOVO'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <img src={'https://i.pravatar.cc/150?u=sarah'} alt="" className="w-6 h-6 rounded-full" />
                      <span className="text-sm text-gray-700">Alex Rivera</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 group flex items-center gap-2">
                    <button onClick={() => handleDelete(contact.id)} className="p-1 px-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded bg-white border border-red-200 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {displayData.length === 0 && (
                <tr>
                   <td colSpan={6} className="text-center py-8 text-gray-500">Nenhum contato encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Mostrando {displayData.length} resultados
          </span>
          <div className="flex items-center gap-1 text-sm">
            <button className="p-1 text-gray-400 hover:text-gray-600"><ChevronLeft className="w-5 h-5" /></button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 text-white font-medium">1</button>
            <button className="p-1 text-gray-600 hover:text-gray-900"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
