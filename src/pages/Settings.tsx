import { useTranslation } from 'react-i18next';
import { Download, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StarRow } from '@/components/ui/star-row';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSettings, type Theme } from '@/stores/settingsStore';
import { useAuth, signOut } from '@/hooks/useAuth';
import { useAccounts } from '@/features/accounts/hooks';
import { useGoals } from '@/features/goals/hooks';
import { useIncome } from '@/features/income/hooks';

const CURRENCIES = ['MXN', 'USD', 'EUR'];

export function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const settings = useSettings();
  const { data: accounts = [] } = useAccounts(user?.id);
  const { data: goals = [] } = useGoals(user?.id);
  const { data: income = [] } = useIncome(user?.id);

  const onExport = () => {
    const blob = new Blob(
      [JSON.stringify({ accounts, goals, income, exportedAt: new Date().toISOString() }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threshold-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={user?.email ?? ''} />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('settings.profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label={t('settings.baseCurrency')}>
              <Select
                value={settings.baseCurrency}
                onValueChange={(v) => settings.setBaseCurrency(v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('settings.language')}>
              <Select
                value={settings.language}
                onValueChange={(v) => settings.setLanguage(v as 'es' | 'en')}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('settings.theme')}>
              <Select value={settings.theme} onValueChange={(v) => settings.setTheme(v as Theme)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t('settings.themes.system')}</SelectItem>
                  <SelectItem value="light">{t('settings.themes.light')}</SelectItem>
                  <SelectItem value="dark">{t('settings.themes.dark')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('settings.weights')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('settings.weightsHint')}
            </p>
            <StarRow
              label={t('settings.weightUrgency')}
              value={settings.weights.urgency}
              onChange={(v) => settings.setWeights({ urgency: v })}
            />
            <StarRow
              label={t('settings.weightImportance')}
              value={settings.weights.importance}
              onChange={(v) => settings.setWeights({ importance: v })}
            />
            <StarRow
              label={t('settings.weightRoi')}
              value={settings.weights.roi}
              onChange={(v) => settings.setWeights({ roi: v })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 pt-5">
            <Button variant="outline" onClick={onExport}>
              <Download /> {t('settings.export')}
            </Button>
            <Button variant="ghost" onClick={() => signOut()}>
              <LogOut /> {t('settings.signOut')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
