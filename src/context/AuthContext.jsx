/**
 * AuthContext.jsx — Global state untuk autentikasi.
 *
 * Menyediakan:
 *   user     : { id, username, role, ... } | null
 *   token    : string | null
 *   isAdmin  : boolean
 *   login()  : simpan token & user ke state dan localStorage
 *   logout() : hapus semua data auth dan redirect ke /login
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // true saat sedang cek localStorage
  const navigate = useNavigate();

  // Pulihkan sesi dari localStorage saat pertama kali mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('authToken');
      const savedUser  = localStorage.getItem('authUser');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser',  JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam <AuthProvider>');
  return ctx;
}
