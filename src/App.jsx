import { Toaster } from "@/components/ui/toaster"
import { ToastProvider } from "@/components/ui/use-toast"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

import { ThemeProvider } from '@/lib/ThemeContext';
import WelcomeOverlay from './components/shared/WelcomeOverlay';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import UserPortal from './pages/portal/UserPortal';

// Tickets
import TicketList from './pages/tickets/TicketList';
import TicketDetail from './pages/tickets/TicketDetail';
import TicketHistory from './pages/tickets/TicketHistory';
import ApprovalQueue from './pages/tickets/ApprovalQueue';

// Agents
import AgentsPage from './pages/agents/AgentsPage';
import DepartmentsPage from './pages/agents/DepartmentsPage';
import TeamsPage from './pages/agents/TeamsPage';
import RolesPage from './pages/agents/RolesPage';
import ProfilesPage from './pages/cadastros/ProfilesPage';

// Users
import UsersPage from './pages/users/UsersPage';
import OrganizationsPage from './pages/users/OrganizationsPage';

// Knowledge Base
import KBCategoriesPage from './pages/kb/KBCategoriesPage';
import KBArticlesPage from './pages/kb/KBArticlesPage';
import CannedResponsesPage from './pages/kb/CannedResponsesPage';

// Admin
import CategoriesPage from './pages/admin/CategoriesPage';
import HelpTopicsPage from './pages/admin/HelpTopicsPage';
import FiltersPage from './pages/admin/FiltersPage';
import SLAPage from './pages/admin/SLAPage';
import SchedulesPage from './pages/admin/SchedulesPage';
import HolidaysPage from './pages/admin/HolidaysPage';
import SettingsPage from './pages/admin/SettingsPage';
import AppointmentsPage from './pages/agenda/AppointmentsPage';
import FinanceiroDashboard from './pages/financeiro/FinanceiroDashboard';
import RelatoriosPage from './pages/relatorios/RelatoriosPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import InventarioPage from './pages/inventario/InventarioPage';
import ContratosPage from './pages/contratos/ContratosPage';
import PainelAtendentes from './pages/relatorios/PainelAtendentes';
import AgentSchedulePage from './pages/admin/AgentSchedulePage';
import SincronizarPage from './pages/admin/SincronizarPage';
import ClientesPage from './pages/cadastros/ClientesPage';
import AcessoRemotoPage from './pages/atendimento/AcessoRemotoPage';
import VideoconferenciaPage from './pages/atendimento/VideoconferenciaPage';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/portal" element={<UserPortal />} />

      {/* Protected admin/agent routes */}
      <Route path="/" element={
        <ProtectedRoute requireAgent>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="tickets/meus" element={<TicketList myTickets={true} />} />
        <Route path="tickets/todos" element={<TicketList />} />
        <Route path="tickets/historico" element={<TicketHistory />} />
        <Route path="tickets/aprovacao" element={<ApprovalQueue />} />
        <Route path="tickets/novo" element={<TicketList />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="agentes" element={<AgentsPage />} />
        <Route path="equipes" element={<TeamsPage />} />
        <Route path="funcoes" element={<RolesPage />} />
        <Route path="perfis" element={<ProfilesPage />} />
        <Route path="departamentos" element={<DepartmentsPage />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="organizacoes" element={<OrganizationsPage />} />
        <Route path="kb/categorias" element={<KBCategoriesPage />} />
        <Route path="kb/artigos" element={<KBArticlesPage />} />
        <Route path="kb/respostas" element={<CannedResponsesPage />} />
        <Route path="admin/categorias" element={
          <ProtectedRoute requireAdmin><CategoriesPage /></ProtectedRoute>
        } />
        <Route path="admin/topicos" element={
          <ProtectedRoute requireAdmin><HelpTopicsPage /></ProtectedRoute>
        } />
        <Route path="admin/filtros" element={
          <ProtectedRoute requireAdmin><FiltersPage /></ProtectedRoute>
        } />
        <Route path="admin/sla" element={
          <ProtectedRoute requireAdmin><SLAPage /></ProtectedRoute>
        } />
        <Route path="admin/cronogramas" element={
          <ProtectedRoute requireAdmin><SchedulesPage /></ProtectedRoute>
        } />
        <Route path="admin/feriados" element={
          <ProtectedRoute requireAdmin><HolidaysPage /></ProtectedRoute>
        } />
        <Route path="admin/configuracoes" element={
          <ProtectedRoute requireAdmin><SettingsPage /></ProtectedRoute>
        } />
        <Route path="agendamentos" element={<AppointmentsPage />} />
        <Route path="financeiro" element={<FinanceiroDashboard />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="admin/auditoria" element={
          <ProtectedRoute requireAdmin><AuditLogPage /></ProtectedRoute>
        } />
        <Route path="inventario" element={<InventarioPage />} />
        <Route path="contratos" element={<ContratosPage />} />
        <Route path="relatorios/atendentes" element={<PainelAtendentes />} />
        <Route path="admin/escala" element={
          <ProtectedRoute requireAdmin><AgentSchedulePage /></ProtectedRoute>
        } />
        <Route path="admin/sincronizar" element={
          <ProtectedRoute requireAdmin><SincronizarPage /></ProtectedRoute>
        } />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="acesso-remoto" element={<AcessoRemotoPage />} />
        <Route path="videoconferencia" element={<VideoconferenciaPage />} />
      </Route>

      {/* Popup route */}
      <Route path="/ticket-popup/:id" element={
        <ProtectedRoute><TicketDetail isPopup /></ProtectedRoute>
      } />

      {/* Redirect unmatched */}
      <Route path="*" element={
        isAuthenticated ? <Navigate to="/" /> : <Navigate to="/login" />
      } />
    </Routes>
  );
}

import { useState, useEffect } from 'react';

function WelcomeGate() {
  const { profile } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (profile && !sessionStorage.getItem('welcomeShown')) {
      setShowWelcome(true);
      sessionStorage.setItem('welcomeShown', '1');
    }
  }, [profile]);

  if (showWelcome) {
    return <WelcomeOverlay userName={profile?.full_name || profile?.email || "Usuário"} onClose={() => setShowWelcome(false)} />;
  }
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ToastProvider>
          <Router>
            <AuthProvider>
              <WelcomeGate />
              <AppRoutes />
            </AuthProvider>
          </Router>
          <Toaster />
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
