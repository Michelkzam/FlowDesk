import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { playSystemSound } from '@/lib/soundSystem';
import { ALL_PERMISSIONS } from '@/lib/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          return {
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email,
            role: authUser.user_metadata?.role || 'user',
            status: 'active'
          };
        }
        return null;
      }

      if (data.role_id) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('name')
          .eq('id', data.role_id)
          .single();
        if (roleData) {
          data.role_name = roleData.name;
        }
      }

      return data;
    } catch (err) {
      console.error('[Auth] Erro ao buscar perfil:', err);
      return null;
    }
  }, []);

  const fetchPermissions = useCallback(async (profileData) => {
    if (!profileData) { setPermissions([]); setPages([]); return; }
    if (profileData.role === 'admin') { setPermissions(ALL_PERMISSIONS); setPages(null); return; }
    if (!profileData.role_id) {
      const fallbackPermissions = profileData.role === 'agent'
        ? ["tickets.create", "tickets.edit", "tickets.delete", "tickets.close", "tickets.assign", "tickets.transfer",
           "kb.create", "kb.edit", "kb.delete", "kb.publish", "reports.view"]
        : ["tickets.create", "tickets.edit", "tickets.close"];
      setPermissions(fallbackPermissions);
      setPages([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('permissions, pages')
        .eq('id', profileData.role_id)
        .single();
      if (error) {
        console.error('[Auth] Erro ao buscar permissões:', error);
        const fallback = profileData.role === 'agent'
          ? ["tickets.create", "tickets.edit", "tickets.delete", "tickets.close", "tickets.assign", "tickets.transfer",
             "kb.create", "kb.edit", "kb.delete", "kb.publish", "reports.view"]
          : ["tickets.create", "tickets.edit", "tickets.close"];
        setPermissions(fallback);
        setPages([]);
        return;
      }
      let perms = data?.permissions || [];
      if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch { perms = []; } }
      if (!Array.isArray(perms)) perms = [];
      setPermissions(perms);

      let pageList = data?.pages;
      if (pageList === undefined || pageList === null) {
        setPages(null);
      } else {
        if (typeof pageList === 'string') { try { pageList = JSON.parse(pageList); } catch { pageList = []; } }
        if (!Array.isArray(pageList)) pageList = [];
        setPages(pageList);
      }
    } catch (err) {
      console.error('[Auth] Exceção ao buscar permissões:', err);
      setPermissions([]);
      setPages([]);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          const p = await fetchProfile(session.user.id);
          setProfile(p);
          await fetchPermissions(p);
        }
      } catch (err) {
        console.error('[Auth] Erro na inicialização:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          setLoading(false);
          const p = await fetchProfile(session.user.id);
          setProfile(p);
          await fetchPermissions(p);
        } else {
          setUser(null);
          setProfile(null);
          setPermissions([]);
          setIsAuthenticated(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchPermissions]);

  const can = useCallback((permission) => {
    if (profile?.role === 'admin') return true;
    return permissions.includes(permission);
  }, [profile?.role, permissions]);

  const canAccessPage = useCallback((pageId) => {
    if (profile?.role === 'admin') return true;
    if (pages === null) return true;
    if (pages.length === 0) return false;
    return pages.includes(pageId);
  }, [profile?.role, pages]);

  const canAny = useCallback((...perms) => perms.some(p => can(p)), [can]);
  const canAll = useCallback((...perms) => perms.every(p => can(p)), [can]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    setIsAuthenticated(true);
    setLoading(false);
    const p = await fetchProfile(data.user.id);
    setProfile(p);
    await fetchPermissions(p);
    playSystemSound('login');
    return { user: data.user, profile: p };
  };

  const register = async (email, password, full_name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, role: 'user' } }
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        password_hash: 'supabase_auth',
        full_name,
        role: 'user',
        status: 'active'
      });
      setUser(data.user);
      setIsAuthenticated(true);
      const p = await fetchProfile(data.user.id);
      setProfile(p);
      await fetchPermissions(p);
      return { user: data.user, profile: p };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setPermissions([]);
    setPages([]);
    setIsAuthenticated(false);
  };

    return (
    <AuthContext.Provider value={{
      user,
      profile,
      permissions,
      pages,
      loading,
      isAuthenticated,
      can,
      canAccessPage,
      canAny,
      canAll,
      login,
      register,
      logout,
      isAdmin: profile?.role === 'admin',
      isAgent: profile?.role === 'agent' || profile?.role === 'admin',
      isUser: profile?.role === 'user',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
