import { Bell, HelpCircle, Search, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-8">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar contatos, negócios ou relatórios..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow placeholder-gray-400"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 ml-4">
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
        
        {/* User Profile Info & Logout */}
        <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-700">{user?.nome || 'Usuário'}</span>
            <span className="text-xs text-blue-600 uppercase font-bold tracking-wider">{user?.papel || '...'}</span>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
            <UserIcon className="w-5 h-5 text-slate-500" />
          </div>
          <button 
            onClick={logout}
            title="Sair do Sistema"
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-2"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
