'use client';

import { useCallback, useEffect, useState } from 'react';

export function useAuth() {
  const [user, setUser] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('wg_user');
    if (stored) setUser(stored);
    setChecked(true);
  }, []);

  const login = useCallback((username: string) => {
    setUser(username);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wg_user');
    setUser(null);
  }, []);

  return { user, checked, login, logout };
}
