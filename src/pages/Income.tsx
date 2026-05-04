import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { IncomeSheet } from '@/components/forms/IncomeSheet';
import { useAuth } from '@/hooks/useAuth';
import { useIncome, useUpsertIncome, useDeleteIncome } from '@/features/income/hooks';
import { useFxRates, convertTo } from '@/features/fx/hooks';
import { useSettings } from '@/stores/settingsStore';
import { formatCurrency } from '@/lib/utils';
import { projectAll } from '@/lib/analysis';
import type { IncomeSource } from '@/lib/types/database';

const HORIZON = 90;

export function IncomePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { baseCurrency } = useSettings();
  const { data: rates } = useFxRates(baseCurrency);
  const { data: income = [] } = useIncome(user?.id);
  const upsert = useUpsertIncome(user?.id);
  const remove = useDeleteIncome(user?.id);
  const [editing, setEditing] = useState<Partial<IncomeSource> | null>(null);

  const projection = useMemo(() => {
    const fx = (cur: string) => (rates ? 1 / (rates[cur] ?? 1) : 1);
    const flow = projectAll(
      income
        .filter((s) => s.active)
        .map((s) => ({
          amount: Number(s.amount),
          currency: s.currency,
          frequency: s.frequency,
          nextDate: new Date(s.next_date),
        })),
      HORIZON,
      fx,
    );
    let acc = 0;
    const points: { day: string; total: number }[] = [];
    const now = new Date();
    points.push({ day: format(now), total: 0 });
    for (const e of flow) {
      acc += e.amount;
      points.push({ day: format(e.date), total: Math.round(acc) });
    }
    return { points, total: acc };
  }, [income, rates]);

  return (
    <div>
      <PageHeader
        title={t('income.title')}
        right={
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus className="h-4 w-4" /> {t('income.addIncome')}
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            {t('income.projection90d')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          <div className="px-5 text-2xl font-semibold tabular tracking-tight">
            {formatCurrency(projection.total, baseCurrency, i18n.language)}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {t('income.totalNext90d')}
            </span>
          </div>
          <div className="h-40">
            <ResponsiveContainer>
              <AreaChart data={projection.points}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatCurrency(v, baseCurrency, i18n.language)}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#incomeGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('income.title')}
        </h2>
      </div>

      {income.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-3 text-sm text-muted-foreground">{t('income.noIncome')}</p>
            <Button onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> {t('income.addIncome')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {income.map((src) => {
            const inBase = convertTo(Number(src.amount), src.currency, baseCurrency, rates);
            return (
              <button
                key={src.id}
                onClick={() => setEditing(src)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:border-border"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{src.name}</span>
                    {!src.active ? <Badge variant="outline">off</Badge> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(`income.frequencies.${src.frequency}`)} · {formatNextDate(src.next_date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular font-semibold">
                    {formatCurrency(Number(src.amount), src.currency, i18n.language)}
                  </div>
                  {src.currency !== baseCurrency ? (
                    <div className="text-xs text-muted-foreground tabular">
                      ≈ {formatCurrency(inBase, baseCurrency, i18n.language)}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <IncomeSheet
        open={!!editing}
        initial={editing}
        baseCurrency={baseCurrency}
        onClose={() => setEditing(null)}
        onSave={async (row) => {
          await upsert.mutateAsync(row);
          setEditing(null);
        }}
        onDelete={async (id) => {
          await remove.mutateAsync(id);
          setEditing(null);
        }}
      />
    </div>
  );
}

function format(d: Date): string {
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

function formatNextDate(d: string): string {
  return format(new Date(d));
}
