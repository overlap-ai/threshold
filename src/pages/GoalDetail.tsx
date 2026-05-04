import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Sparkles, Clock, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GoalSheet } from '@/components/forms/GoalSheet';
import { useAuth } from '@/hooks/useAuth';
import { useGoal, useGoals, useUpsertGoal, useDeleteGoal } from '@/features/goals/hooks';
import { useAccounts } from '@/features/accounts/hooks';
import { useIncome } from '@/features/income/hooks';
import { useFxRates, convertTo } from '@/features/fx/hooks';
import { useSettings } from '@/stores/settingsStore';
import { formatCurrency } from '@/lib/utils';
import { opportunityCost, projectAll, timeToGoal, weightedScore } from '@/lib/analysis';

export function GoalDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const { baseCurrency, weights } = useSettings();
  const { data: goal } = useGoal(id);
  const { data: goals = [] } = useGoals(user?.id);
  const { data: accounts = [] } = useAccounts(user?.id);
  const { data: income = [] } = useIncome(user?.id);
  const { data: rates } = useFxRates(baseCurrency);
  const upsert = useUpsertGoal(user?.id);
  const remove = useDeleteGoal(user?.id);
  const [editing, setEditing] = useState(false);

  const availableCapital = useMemo(
    () =>
      accounts.reduce((acc, a) => {
        const value = convertTo(Number(a.balance), a.currency, baseCurrency, rates);
        return acc + (a.is_debt ? -value : value);
      }, 0),
    [accounts, rates, baseCurrency],
  );

  const cashflow = useMemo(() => {
    const fx = (cur: string) => (rates ? 1 / (rates[cur] ?? 1) : 1);
    return projectAll(
      income
        .filter((s) => s.active)
        .map((s) => ({
          amount: Number(s.amount),
          currency: s.currency,
          frequency: s.frequency,
          nextDate: new Date(s.next_date),
        })),
      365,
      fx,
    );
  }, [income, rates]);

  if (!goal) {
    return (
      <div className="py-12 text-center text-muted-foreground">{t('common.loading')}</div>
    );
  }

  const priceBase = convertTo(Number(goal.price), goal.currency, baseCurrency, rates);
  const score = weightedScore(goal, weights);
  const ttg = timeToGoal({ goalPrice: priceBase, availableCapital, cashflow });
  const progress =
    priceBase > 0 ? Math.min(100, (Math.max(0, availableCapital) / priceBase) * 100) : 0;

  const opp = opportunityCost({
    target: { id: goal.id, name: goal.name, price: priceBase },
    others: goals
      .filter((g) => g.id !== goal.id && g.status === 'active')
      .map((g) => ({
        id: g.id,
        name: g.name,
        price: convertTo(Number(g.price), g.currency, baseCurrency, rates),
      })),
    availableCapital,
    cashflow,
  })
    .filter((d) => d.delayDays !== null && d.delayDays > 0)
    .sort((a, b) => (b.delayDays ?? 0) - (a.delayDays ?? 0))
    .slice(0, 5);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}>
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-semibold">{goal.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between">
            <CardTitle className="text-sm text-muted-foreground">{t('goalDetail.summary')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-3xl font-semibold tabular tracking-tight">
              {formatCurrency(Number(goal.price), goal.currency, i18n.language)}
            </div>
            {goal.currency !== baseCurrency ? (
              <div className="text-sm text-muted-foreground tabular">
                ≈ {formatCurrency(priceBase, baseCurrency, i18n.language)}
              </div>
            ) : null}
          </div>

          <div>
            <Progress value={progress} />
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(Math.max(0, availableCapital), baseCurrency, i18n.language)}</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">U{goal.urgency}</Badge>
            <Badge variant="outline">I{goal.importance}</Badge>
            <Badge variant="outline">R{goal.roi}</Badge>
            <Badge>{t('goals.weights')}: {score.toFixed(1)}</Badge>
          </div>

          {goal.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {goal.description}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {t('goalDetail.howToAchieve')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ttg.achievableNow ? (
            <div className="flex items-start gap-3 rounded-xl bg-success/10 p-3 text-success">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="text-sm font-medium">{t('goalDetail.cashNow')}</div>
            </div>
          ) : ttg.daysToGoal !== null ? (
            <div className="flex items-start gap-3 rounded-xl bg-primary/10 p-3 text-primary">
              <Clock className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="text-sm">
                <div className="font-medium">
                  {t('goalDetail.needsIncome', { count: ttg.entriesNeeded })}
                </div>
                <div className="text-foreground/70">
                  {t('goalDetail.withCurrentRate', { days: ttg.daysToGoal })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl bg-warning/10 p-3 text-warning">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="text-sm font-medium">
                {t('goalDetail.totalNeeded')}:{' '}
                {formatCurrency(ttg.totalNeeded, baseCurrency, i18n.language)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {opp.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('goalDetail.opportunityCost')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opp.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-sm"
              >
                <span className="truncate">{d.name}</span>
                <span className="flex items-center gap-1 tabular text-warning">
                  <Zap className="h-3.5 w-3.5" /> +{d.delayDays}d
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        {goal.status !== 'achieved' ? (
          <Button
            onClick={() =>
              upsert.mutate({
                id: goal.id,
                status: 'achieved',
                achieved_at: new Date().toISOString(),
              })
            }
          >
            <CheckCircle2 /> {t('goalDetail.markAchieved')}
          </Button>
        ) : null}
      </div>

      <GoalSheet
        open={editing}
        initial={goal}
        baseCurrency={baseCurrency}
        onClose={() => setEditing(false)}
        onSave={async (row) => {
          await upsert.mutateAsync(row);
          setEditing(false);
        }}
        onDelete={async (gid) => {
          await remove.mutateAsync(gid);
          setEditing(false);
          nav('/goals');
        }}
      />
    </div>
  );
}
