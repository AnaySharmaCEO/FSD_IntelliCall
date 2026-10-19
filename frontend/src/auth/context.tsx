import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { AuthAdapter, AuthState, AuthUser, AuthOrganization } from './adapter';
import { SupabaseAuthAdapter } from './supabase';
import { MockAuthAdapter } from './mock';
import { hasPermission, type Permission } from '../lib/permissions';
import type { Role } from '../contracts/enums';

interface AuthContextValue extends AuthState {
  signIn: AuthAdapter['signIn'];
  signUp: AuthAdapter['signUp'];
  signOut: AuthAdapter['signOut'];
  refresh: AuthAdapter['refresh'];
  isAuthenticated: boolean;
  role: Role | null;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Decide adapter singleton
const useMock = import.meta.env.VITE_USE_MOCK_AUTH === 'true';
export const authAdapter: AuthAdapter = useMock
  ? new MockAuthAdapter()
  : new SupabaseAuthAdapter();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => authAdapter.getState());

  useEffect(() => {
    return authAdapter.subscribe(setState);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = state.organization?.role ?? null;
    return {
      ...state,
      signIn: (email, pass) => authAdapter.signIn(email, pass),
      signUp: (email, pass, name) => authAdapter.signUp(email, pass, name),
      signOut: () => authAdapter.signOut(),
      refresh: () => authAdapter.refresh(),
      isAuthenticated: Boolean(state.user && state.token),
      role,
      can: (permission: Permission) => hasPermission(role, permission),
    };
  }, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { AuthUser, AuthOrganization, AuthState, AuthAdapter };
