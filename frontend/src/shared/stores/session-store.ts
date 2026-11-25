import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SessionUser } from '@/shared/types/domain';

interface SessionState {
  user: SessionUser | null;
  token: string | null;
  setUser: (user: SessionUser | null) => void;
  setSession: (user: SessionUser, token: string, rememberOnDevice?: boolean) => void;
  clearSession: () => void;
}

type PersistedSession = Pick<SessionState, 'user' | 'token'>;

let persistOnThisDevice = true;

const sessionStorageAdapter = {
  getItem(name: string) {
    const localValue = localStorage.getItem(name);
    if (localValue !== null) {
      persistOnThisDevice = true;
      return localValue;
    }
    const sessionValue = sessionStorage.getItem(name);
    if (sessionValue !== null) persistOnThisDevice = false;
    return sessionValue;
  },
  setItem(name: string, value: string) {
    if (persistOnThisDevice) {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    } else {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    }
  },
  removeItem(name: string) {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

export const useSessionStore = create<SessionState>()(
  persist<SessionState, [], [], PersistedSession>(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setSession: (user, token, rememberOnDevice = true) => {
        persistOnThisDevice = rememberOnDevice;
        set({ user, token });
      },
      clearSession: () => set({ user: null, token: null }),
    }),
    { name: 'barbearia-session', storage: createJSONStorage(() => sessionStorageAdapter), partialize: (state) => ({ user: state.user, token: state.token }), version: 1 },
  ),
);
