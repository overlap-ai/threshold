import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  baseCurrency: string;
  language: 'es' | 'en';
  weights: { urgency: number; importance: number; roi: number };
  setTheme: (theme: Theme) => void;
  setBaseCurrency: (code: string) => void;
  setLanguage: (lng: 'es' | 'en') => void;
  setWeights: (w: Partial<SettingsState['weights']>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      baseCurrency: 'MXN',
      language: 'es',
      weights: { urgency: 3, importance: 3, roi: 3 },
      setTheme: (theme) => set({ theme }),
      setBaseCurrency: (code) => set({ baseCurrency: code.toUpperCase() }),
      setLanguage: (language) => set({ language }),
      setWeights: (w) => set((s) => ({ weights: { ...s.weights, ...w } })),
    }),
    { name: 'threshold:settings' },
  ),
);

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}
