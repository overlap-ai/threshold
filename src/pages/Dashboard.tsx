import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Plus,
  Wallet,
  CreditCard,
  Coins,
  Building2,
  MoreHorizontal,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts, useUpsertAccount, useDeleteAccount } from '@/features/accounts/hooks';
import { useFxRates, convertTo } from '@/features/fx/hooks';
import { useSettings } from '@/stores/settingsStore';
import { formatCurrency } from '@/lib/utils';
import { AccountSheet } from '@/components/forms/AccountSheet';
import type { Account, AccountType } from '@/lib/types/database';

const TYPE_ICON: Record<AccountType, typeof Wallet> = {
  cash: Wallet,
  bank: Building2,
  credit_card: CreditCard,
  crypto: Coins,
  other: MoreHorizontal,
};

const SLICE_COLORS = ['#7c7cff', '#a85cff', '#22c486', '#f59e0b', '#ef4444', '#94a3b8'];

function greetingKey(date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 19) return 'afternoon';
  return 'evening';
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { baseCurrency } = useSettings();
  const { data: accounts = [], isLoading } = useAccounts(user?.id);
  const { data: rates } = useFxRates(baseCurrency);
  const upsertAccount = useUpsertAccount(user?.id);
  const deleteAccount = useDeleteAccount(user?.id);
  const [editing, setEditing] = useState<Partial<Account> | null>(null);

  const totals = useMemo(() => {
    let available = 0;
    let debt = 0;
    let cryptoValue = 0;
    let cashValue = 0;
    const slices: Record<string, number> = {};
    accounts.forEach((acc) => {
      const value = convertTo(Number(acc.balance), acc.currency, baseCurrency, rates);
      if (acc.is_debt) {
        debt += value;
        slices['debt'] = (slices['debt'] ?? 0) + value;
      } else {
        available += value;
        slices[acc.type] = (slices[acc.type] ?? 0) + value;
        if (acc.type === 'crypto') cryptoValue += value;
        if (acc.type === 'cash' || acc.type === 'bank') cashValue += value;
      }
    });
    const net = available - debt;
    const pieData = Object.entries(slices)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: k, value: v }));
    return { available, debt, net, cryptoValue, cashValue, pieData };
  }, [accounts, rates, baseCurrency]);

  const userLabel = user?.email?.split('@')[0] ?? '';

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <p className="text-sm text-muted-foreground">{t(`dashboard.greetings.${greetingKey()}`)}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{userLabel || t('app.name')}</h1>
      </header>

      <Card className="relative overflow-hidden border-0 text-white shadow-lg shadow-primary/20">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">
                {t('dashboard.totalCapital')}
              </span>
              <Badge className="bg-white/15 text-white">{baseCurrency}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-[42px] font-semibold tabular leading-none tracking-tight">
              {formatCurrency(totals.net, baseCurrency, i18n.language)}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <MiniStat
                label={t('dashboard.available')}
                value={formatCurrency(totals.available, baseCurrency, i18n.language)}
                icon={<ArrowUpRight className="h-3.5 w-3.5" />}
              />
              <MiniStat
                label={t('dashboard.debt')}
                value={formatCurrency(totals.debt, baseCurrency, i18n.language)}
                icon={<TrendingDown className="h-3.5 w-3.5" />}
              />
            </div>
          </CardContent>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label={t('accounts.types.cash')}
          value={formatCurrency(totals.cashValue, baseCurrency, i18n.language)}
          icon={<Wallet />}
          tint="primary"
        />
        <StatTile
          label={t('accounts.types.crypto')}
          value={formatCurrency(totals.cryptoValue, baseCurrency, i18n.language)}
          icon={<Coins />}
          tint="warning"
        />
      </div>

      {totals.pieData.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-44">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={totals.pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={75}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {totals.pieData.map((_entry, i) => (
                      <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v, baseCurrency, i18n.language)}
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {totals.pieData.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">
                    {p.name === 'debt' ? t('dashboard.debt') : t(`accounts.types.${p.name}`)}
                  </span>
                  <span className="ml-auto tabular font-medium">
                    {formatCurrency(p.value, baseCurrency, i18n.language)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('dashboard.accounts')}
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing({ type: 'cash', currency: baseCurrency })}
          >
            <Plus className="h-4 w-4" /> {t('dashboard.addAccount')}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="mb-3 text-sm text-muted-foreground">{t('dashboard.noAccounts')}</p>
              <Button onClick={() => setEditing({ type: 'cash', currency: baseCurrency })}>
                <Plus className="h-4 w-4" /> {t('dashboard.createFirst')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => {
              const Icon = TYPE_ICON[acc.type];
              const valueBase = convertTo(Number(acc.balance), acc.currency, baseCurrency, rates);
              return (
                <button
                  key={acc.id}
                  onClick={() => setEditing(acc)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left transition-colors hover:border-border"
                >
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-xl ${
                      acc.is_debt ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{acc.name}</span>
                      {acc.is_debt ? (
                        <Badge variant="destructive">{t('dashboard.debt')}</Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(`accounts.types.${acc.type}`)} · {acc.currency}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`tabular font-semibold ${acc.is_debt ? 'text-destructive' : ''}`}>
                      {acc.is_debt ? '-' : ''}
                      {formatCurrency(Number(acc.balance), acc.currency, i18n.language)}
                    </div>
                    {acc.currency !== baseCurrency ? (
                      <div className="text-xs text-muted-foreground tabular">
                        ≈ {formatCurrency(valueBase, baseCurrency, i18n.language)}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <AccountSheet
        open={!!editing}
        initial={editing}
        baseCurrency={baseCurrency}
        onClose={() => setEditing(null)}
        onSave={async (row) => {
          await upsertAccount.mutateAsync(row);
          setEditing(null);
        }}
        onDelete={async (id) => {
          await deleteAccount.mutateAsync(id);
          setEditing(null);
        }}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-base font-semibold tabular">{value}</div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tint: 'primary' | 'warning' | 'destructive' | 'success';
}) {
  const tintCls: Record<typeof tint, string> = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/15 text-warning',
    destructive: 'bg-destructive/15 text-destructive',
    success: 'bg-success/15 text-success',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3">
      <span className={`grid h-10 w-10 place-items-center rounded-xl [&_svg]:h-5 [&_svg]:w-5 ${tintCls[tint]}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-base font-semibold tabular">{value}</div>
      </div>
    </div>
  );
}
