import { create } from 'zustand';
import { PlatformAdminProfile } from '../types';

const STORAGE_KEY = 'taqa-super-admin-session';

type StoredSession = {
  token: string;
  admin: PlatformAdminProfile;
};

type AuthState = {
  token: string | null;
  admin: PlatformAdminProfile | null;
  isAuthenticated: boolean;
  setSession: (token: string, admin: PlatformAdminProfile) => void;
  clearSession: () => void;
};

const readStoredSession = (): StoredSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredSession;
  } catch (error) {
    console.error('Failed to read super admin session:', error);
    return null;
  }
};

const persistSession = (session: StoredSession | null) => {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

const storedSession = readStoredSession();

export const useAuthStore = create<AuthState>((set) => ({
  token: storedSession?.token ?? null,
  admin: storedSession?.admin ?? null,
  isAuthenticated: Boolean(storedSession?.token),
  setSession: (token, admin) => {
    persistSession({ token, admin });
    set({
      token,
      admin,
      isAuthenticated: true,
    });
  },
  clearSession: () => {
    persistSession(null);
    set({
      token: null,
      admin: null,
      isAuthenticated: false,
    });
  },
}));
