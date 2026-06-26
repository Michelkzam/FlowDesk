import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

const ALL_PERMISSIONS = [
  "tickets.create", "tickets.edit", "tickets.delete", "tickets.close", "tickets.assign", "tickets.transfer",
  "kb.create", "kb.edit", "kb.delete", "kb.publish",
  "users.manage", "reports.view", "admin.access",
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchProfile = useCallback(async (userId) => {
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

    return data;
  }, []);

  const fetchPermissions = useCallback(async (profileData) => {
    if (!profileData) { setPermissions([]); return; }
    if (profileData.role === 'admin') { setPermissions(ALL_PERMISSIONS); return; }
    if (!profileData.role_id) { setPermissions([]); return; }
    const { data } = await supabase
      .from('roles')
      .select('permissions')
      .eq('id', profileData.role_id)
      .single();
    setPermissions(data?.permissions || []);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        const p = await fetchProfile(session.user.id);
        setProfile(p);
        await fetchPermissions(p);
      }
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          const p = await fetchProfile(session.user.id);
          setProfile(p);
          await fetchPermissions(p);
        } else {
          setUser(null);
          setProfile(null);
          setPermissions([]);
          setIsAuthenticated(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchPermissions]);

  const can = useCallback((permission) => {
    if (profile?.role === 'admin') return true;
    return permissions.includes(permission);
  }, [profile?.role, permissions]);

  const canAny = useCallback((...perms) => perms.some(p => can(p)), [can]);
  const canAll = useCallback((...perms) => perms.every(p => can(p)), [can]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    setIsAuthenticated(true);
    const p = await fetchProfile(data.user.id);
    setProfile(p);
    await fetchPermissions(p);
    return { user: data.user, profile: p };
  };

  const register = async (email, password, full_name, role = 'user') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, role } }
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        password_hash: 'supabase_auth',
        full_name,
        role,
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
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      permissions,
      loading,
      isAuthenticated,
      can,
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
