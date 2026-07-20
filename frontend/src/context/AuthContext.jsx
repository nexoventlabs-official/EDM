import { createContext, useContext, useState } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('edm_user') || 'null'); } catch { return null; }
  });

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (data.success) {
      localStorage.setItem('edm_token', data.token);
      localStorage.setItem('edm_user', JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('edm_token');
    localStorage.removeItem('edm_user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
