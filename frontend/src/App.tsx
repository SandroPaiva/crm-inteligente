import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ContactsList from "./pages/ContactsList";
import Kanban from "./pages/Kanban";
import Analytics from "./pages/Analytics";
import LeadDetails from "./components/LeadDetails";
import LeadForm from "./components/LeadForm";
import Tarefas from "./pages/Tarefas";
import Login from "./pages/Login";
import Equipe from "./pages/Equipe";
import Empreendimentos from "./pages/Empreendimentos";

const PrivateRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><p className="text-white">Carregando...</p></div>;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Rotas Protegidas */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/leads" element={<ContactsList />} />
              <Route path="/negocios" element={<Kanban />} />
              <Route path="/relatorios" element={<Analytics />} />
              <Route path="/leads/:id" element={<LeadDetails />} />
              <Route path="/novo-lead" element={<LeadForm />} />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/equipe" element={<Equipe />} />
              <Route path="/empreendimentos" element={<Empreendimentos />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
