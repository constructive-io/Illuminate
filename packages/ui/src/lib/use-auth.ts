import { useCallback, useEffect, useState } from 'react';

function decodePayload(token: string): { sub: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    const payload = JSON.parse(json);
    if (!payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('wg_token');
    if (stored) {
      const payload = decodePayload(stored);
      if (payload) {
        setUser(payload.sub);
        setToken(stored);
      } else {
        localStorage.removeItem('wg_token');
        localStorage.removeItem('wg_user');
      }
    }
    setChecked(true);
  }, []);

  const login = useCallback((username: string, jwt: string) => {
    localStorage.setItem('wg_token', jwt);
    localStorage.removeItem('wg_user');
    setToken(jwt);
    setUser(username);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wg_token');
    localStorage.removeItem('wg_user');
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, checked, login, logout };
}
