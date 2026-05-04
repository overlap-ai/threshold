import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { applyTheme, useSettings } from '@/stores/settingsStore';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthPage } from '@/pages/Auth';
import { DashboardPage } from '@/pages/Dashboard';
import { GoalsPage } from '@/pages/Goals';
import { GoalDetailPage } from '@/pages/GoalDetail';
import { IncomePage } from '@/pages/Income';
import { SettingsPage } from '@/pages/Settings';

export default function App() {
  const { i18n } = useTranslation();
  const { theme, language } = useSettings();
  const auth = useAuth();
  const location = useLocation();

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    if (i18n.language !== language) i18n.changeLanguage(language);
  }, [language, i18n]);

  // Track the on-screen keyboard via the VisualViewport API and expose it to
  // CSS as --kbd-h / --vv-h. Lets dialogs anchor above the keyboard on iOS.
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const vv = window.visualViewport;
      if (!vv) {
        root.style.setProperty('--kbd-h', '0px');
        root.style.setProperty('--vv-h', `${window.innerHeight}px`);
        return;
      }
      const kbd = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--kbd-h', `${kbd}px`);
      root.style.setProperty('--vv-h', `${vv.height}px`);
    };
    update();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  if (auth.loading) {
    return (
      <div className="grid min-h-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!auth.session) {
    if (location.pathname !== '/auth') {
      return <Navigate to="/auth" replace />;
    }
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/:id" element={<GoalDetailPage />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
