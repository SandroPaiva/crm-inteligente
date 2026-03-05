import { Home, Users, BarChart2, Briefcase, Calendar, Settings, ShieldCheck, Building2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";

const baseNavigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Kanban", href: "/negocios", icon: Briefcase },
  { name: "Relatórios", href: "/relatorios", icon: BarChart2 },
  { name: "Tarefas", href: "/tarefas", icon: Calendar },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  
  const navigation = [
    ...baseNavigation,
    ...(user?.papel !== 'corretor' ? [{ name: "Equipe", href: "/equipe", icon: ShieldCheck }] : []),
    ...(user?.papel === 'admin' ? [{ name: "Empreend.", href: "/empreendimentos", icon: Building2 }] : [])
  ];

  return (
    <div className="flex flex-col w-64 border-r border-gray-200 bg-gray-50/50 min-h-screen">
      {/* Logo Area */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
          <Share2Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">CRM Central</h1>
          <p className="text-xs text-gray-500">Edição Enterprise</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 mt-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className={clsx("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm uppercase">
            {user?.nome ? user.nome.substring(0,2) : 'US'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 leading-tight">{user?.nome || 'Usuário'}</span>
            <span className="text-xs text-gray-500 uppercase">{user?.papel || '...'}</span>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function Share2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  );
}
