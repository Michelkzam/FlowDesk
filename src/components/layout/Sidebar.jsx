
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Ticket, Users, UsersRound,
  BookOpen, Settings, ChevronDown, ChevronRight, Menu, X,
  PanelLeftClose, PanelLeftOpen, LogOut, Tag, Clock, Filter,
  Building2, Inbox, ListOrdered, HelpCircle, Shield,
  Calendar, Zap, FileText, Bell, ShieldCheck,
  Monitor, FileSignature, BarChart3, DollarSign, RefreshCw, Video, History,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", pageId: "dashboard" },
  {
    label: "Atendimento", icon: Ticket, children: [
      { label: "Mensagens", icon: MessageSquare, path: "/chat", pageId: "chat.principal" },
      { label: "Meus Tickets", icon: Inbox, path: "/tickets/meus", pageId: "tickets.meus" },
      { label: "Todos os Tickets", icon: ListOrdered, path: "/tickets/todos", pageId: "tickets.todos" },
      { label: "Histórico", icon: History, path: "/tickets/historico", pageId: "tickets.historico" },
      { label: "Acesso Remoto", icon: Monitor, path: "/acesso-remoto", pageId: "atendimento.acesso_remoto" },
      { label: "Videoconferência", icon: Video, path: "/videoconferencia", pageId: "atendimento.videoconferencia" },
      { label: "Agendamentos", icon: Calendar, path: "/agendamentos", pageId: "atendimento.agendamentos" },
      { label: "Aprovações", icon: ShieldCheck, path: "/tickets/aprovacao", pageId: "tickets.aprovacao" },
      { label: "Inventário", icon: Monitor, path: "/inventario", pageId: "inventario" },
      { label: "Portal do Usuário", icon: Ticket, path: "/meus-atendimentos", pageId: "portal.usuario" },
    ]
  },
  {
    label: "Cadastros", icon: Users, permission: "users.manage", children: [
      { label: "Empresas", icon: Building2, path: "/clientes", pageId: "cadastros.clientes" },
      { label: "Departamentos", icon: Building2, path: "/departamentos", pageId: "cadastros.departamentos" },
      { label: "Equipes", icon: UsersRound, path: "/equipes", pageId: "cadastros.equipes" },
      { label: "Perfil do Usuário", icon: Shield, path: "/cadastros/perfis", pageId: "cadastros.perfis" },
      { label: "Usuários do Sistema", icon: Users, path: "/usuarios", pageId: "cadastros.usuarios" },
    ]
  },
  {
    label: "Financeiro", icon: DollarSign, permission: "admin.access", children: [
      { label: "Gestão de Contratos", icon: FileSignature, path: "/contratos", pageId: "financeiro.contratos" },
    ]
  },
  {
    label: "Relatórios", icon: BarChart3, permission: "reports.view", children: [
      { label: "Cronogramas", icon: Clock, path: "/admin/cronogramas", pageId: "admin.cronogramas" },
      { label: "Filtro de Tickets", icon: Filter, path: "/admin/filtros", pageId: "admin.filtros" },
      { label: "Log de Auditoria", icon: ShieldCheck, path: "/admin/auditoria", pageId: "admin.auditoria" },
      { label: "Tópico de Ajuda", icon: HelpCircle, path: "/admin/topicos", pageId: "admin.topicos" },
    ]
  },
  {
    label: "Base de Conhecimento", icon: BookOpen, permission: "kb.create", children: [
      { label: "Artigos", icon: FileText, path: "/kb/artigos", pageId: "kb.artigos" },
      { label: "Categorias", icon: Tag, path: "/kb/categorias", pageId: "kb.categorias" },
      { label: "Respostas Rápidas", icon: Zap, path: "/kb/respostas", pageId: "kb.respostas" },
    ]
  },
  {
    label: "Sistema", icon: Settings, permission: "admin.access", children: [
      { label: "Configurações", icon: Settings, path: "/admin/configuracoes", pageId: "admin.configuracoes" },
      { label: "Escalas de Trabalho", icon: Clock, path: "/admin/escala", pageId: "admin.escala" },
      { label: "Feriados", icon: Bell, path: "/admin/feriados", pageId: "admin.feriados" },
      { label: "Planos SLA", icon: ShieldCheck, path: "/admin/sla", pageId: "admin.sla" },
      { label: "Sincronizar", icon: RefreshCw, path: "/admin/sincronizar", pageId: "admin.sincronizar" },
    ]
  },
];

function NavItem({ item, depth = 0, collapsed, openMenu, setOpenMenu }) {
  const location = useLocation();
  const open = item.children ? openMenu === item.label : false;
  const [hovered, setHovered] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0 });
  const itemRef = useRef(null);
  const timeoutRef = useRef(null);
  const isActive = item.path && (item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path));

  const toggleOpen = () => {
    if (item.children) {
      setOpenMenu(prev => prev === item.label ? null : item.label);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.top });
    }
    setHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setHovered(false), 200);
  };

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  if (item.children) {
    if (collapsed && depth === 0) {
      const hasActiveChild = item.children?.some(c =>
        c.path ? location.pathname.startsWith(c.path) : false
      );
      return (
        <div
          ref={itemRef}
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            className={cn(
              "w-full flex items-center justify-center p-2.5 rounded-lg transition-all",
              hasActiveChild
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            {item.icon && <item.icon className="w-5 h-5" />}
          </button>
          {hovered && (
            <div
              className="fixed z-[100] ml-16 bg-sidebar border border-sidebar-border rounded-lg shadow-xl py-1 min-w-[200px]"
              style={{ top: dropdownPos.top }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 border-b border-sidebar-border">
                {item.label}
              </div>
              {item.children.map(child => (
                <Link
                  key={child.label}
                  to={child.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm transition-all",
                    child.path && location.pathname.startsWith(child.path)
                      ? "bg-sidebar-primary/20 text-sidebar-primary font-semibold"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                  onClick={() => setHovered(false)}
                >
                  {child.icon && <child.icon className="w-4 h-4 shrink-0" />}
                  <span>{child.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }
    return (
      <div>
        <button
          onClick={toggleOpen}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            depth > 0 && "pl-8",
            isChildActive && "text-sidebar-foreground"
          )}
        >
          {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5">
            {item.children.map(child => (
              <NavItem key={child.label} item={child} depth={depth + 1} collapsed={collapsed} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (collapsed && depth === 0) {
    return (
      <Link to={item.path} title={item.label}
        className={cn(
          "flex items-center justify-center p-2.5 rounded-lg transition-all",
          isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}>
        {item.icon && <item.icon className="w-5 h-5" />}
      </Link>
    );
  }

  return (
    <Link to={item.path}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
        depth > 0 && "pl-8",
        depth > 1 && "pl-12",
        isActive
          ? "bg-sidebar-primary/20 text-sidebar-primary font-semibold border-l-2 border-sidebar-primary"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}>
      {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
      <span>{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const { logout, profile, can, canAccessPage } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (item.permission && !can(item.permission)) return false;
    if (item.pageId && !canAccessPage(item.pageId)) return false;
    if (item.children) {
      const visibleChildren = item.children.filter(c => {
        if (c.permission && !can(c.permission)) return false;
        if (c.pageId && !canAccessPage(c.pageId)) return false;
        return true;
      });
      return visibleChildren.length > 0;
    }
    return true;
  }).map(item => {
    if (item.children) {
      return { ...item, children: item.children.filter(c => {
        if (c.permission && !can(c.permission)) return false;
        if (c.pageId && !canAccessPage(c.pageId)) return false;
        return true;
      }) };
    }
    return item;
  });

  return (
    <>
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-md border border-border">
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />}

      <aside className={cn(
        "fixed top-0 left-0 h-full bg-sidebar border-r border-sidebar-border z-50 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-60",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className={cn("p-4 border-b border-sidebar-border flex flex-col items-center gap-2", collapsed && "justify-center p-3")}>
          {!collapsed ? (
            <>
              {localStorage.getItem("appLogo") ? (
                <img
                  src={localStorage.getItem("appLogo")}
                  alt="Logo"
                  className="w-40 h-40 object-contain rounded-lg"
                  onError={e => { e.target.style.display = "none"; }}
                />
              ) : (
                <div className="w-40 h-40 rounded-lg bg-sidebar-primary/10 flex items-center justify-center">
                  <Ticket className="w-12 h-12 text-sidebar-primary/40" />
                </div>
              )}
              <div className="w-full text-center">
                <h1 className="text-sm font-bold text-sidebar-foreground truncate">{localStorage.getItem("appName") || "FlowDesk"}</h1>
                <p className="text-xs text-sidebar-foreground/40">Sistema de Suporte</p>
              </div>
            </>
          ) : (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-sidebar-primary/10 flex items-center justify-center">
              {localStorage.getItem("appLogo") ? (
                <img
                  src={localStorage.getItem("appLogo")}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={e => { e.target.style.display = "none"; e.target.parentElement.innerHTML = '<svg class="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'; }}
                />
              ) : (
                <Ticket className="w-5 h-5 text-white" />
              )}
            </div>
          )}
          <button
            onClick={() => { onToggleCollapse?.(); setMobileOpen(false); }}
            className="hidden lg:flex items-center justify-center p-1.5 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-sidebar-foreground/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {filteredNavItems.map(item => (
            <NavItem key={item.label} item={item} collapsed={collapsed} openMenu={openMenu} setOpenMenu={setOpenMenu} />
          ))}
        </nav>

        {/* Footer */}
        <div className={cn("p-2 border-t border-sidebar-border")}>
          <button
            onClick={() => logout()}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-red-400 hover:text-red-300 hover:bg-red-500/10",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
}