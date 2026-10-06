import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  AuthUser,
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  changePassword as apiChangePassword,
} from "../api.js";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const current = await getCurrentUser();
    setUser(current);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const loggedInUser = await apiLogin(email, password);
    setUser(loggedInUser);
  }

  async function logout() {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await apiChangePassword(currentPassword, newPassword);
    await refresh();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}