import { create } from 'zustand';
import type { OrgUser } from '@/types/workflow';

export type ThemeMode = 'light' | 'dark';

interface WflowState {
  loginUser: OrgUser;
  token: string;
  lang: string;
  theme: ThemeMode;
  formFields: any[];
  setLoginUser: (user: OrgUser, token?: string) => void;
  setToken: (token: string) => void;
  setFormFields: (fields: any[]) => void;
  setLang: (lang: string) => void;
  setTheme: (theme: ThemeMode) => void;
}

const defaultUser: OrgUser = {
  id: 'u-admin',
  name: '流程管理员',
  avatar: '',
  deptId: 'dept-hr',
  deptName: '人事部',
  admin: true,
  type: 'user',
};

const storage = {
  get(key: string): string | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch (e) {}
  },
};

function getInitialUser(): OrgUser {
  try {
    const cached = storage.get('loginUser');
    if (cached) return JSON.parse(cached);
  } catch (e) {}
  return defaultUser;
}

function getInitialTheme(): ThemeMode {
  const stored = storage.get('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  try {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  } catch (e) {
    return 'light';
  }
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useWflowStore = create<WflowState>((set) => ({
  loginUser: getInitialUser(),
  token: storage.get('token') || '',
  lang: storage.get('lang') || 'zhCn',
  theme: initialTheme,
  formFields: [],
  setLoginUser: (user: OrgUser, token?: string) => {
    storage.set('loginUser', JSON.stringify(user));
    if (token) storage.set('token', token);
    set((state) => ({
      loginUser: user,
      token: token ?? state.token,
    }));
  },
  setToken: (token: string) => {
    storage.set('token', token);
    set({ token });
  },
  setFormFields: (fields: any[]) => set({ formFields: fields }),
  setLang: (lang: string) => {
    storage.set('lang', lang);
    set({ lang });
  },
  setTheme: (theme: ThemeMode) => {
    storage.set('theme', theme);
    applyTheme(theme);
    set({ theme });
  },
}));
