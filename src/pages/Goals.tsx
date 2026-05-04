import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Clock, GripVertical, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { GoalSheet } from '@/components/forms/GoalSheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useGoals, useUpsertGoal, useDeleteGoal, useReorderGoals } from '@/features/goals/hooks';
import { useAccounts } from '@/features/accounts/hooks';
import { useIncome } from '@/features/income/hooks';
import { useFxRates, convertTo } from '@/features/fx/hooks';
import { useSettings } from '@/stores/settingsStore';
import { projectAll, timeToGoal, weightedScore } from '@/lib/analysis';
import { formatCurrency } from '@/lib/utils';
import type { Goal } from '@/lib/types/database';

type SortMode = 'manual' | 'score' | 'timeToGoal' | 'priceAsc' | 'priceDesc';

export function GoalsPage() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const { user } = useAuth();
  const { baseCurrency, weights } = useSettings();
  const { data: rates } = useFxRates(baseCurrency);
  const { data: goals = [] } = useGoals(user?.id);
  const { data: accounts = [] } = useAccounts(user?.id);
  const { data: income = [] } = useIncome(user?.id);
  const upsert = useUpsertGoal(user?.id);
  const remove = useDeleteGoal(user?.id);
  const reorder = useReorderGoals(user?.id);
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('manual');

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const achievedGoals = useMemo(
    () =>
      goals
        .filter((g) => g.status === 'achieved')
        .sort((a, b) => {
          const ad = a.achieved_at ? new Date(a.achieved_at).getTime() : 0;
          const bd = b.achieved_at ? new Date(b.achieved_at).getTime() : 0;
          return bd - ad;
        }),
    [goals],
  );

  const availableCapital = useMemo(() => {
    return accounts.reduce((acc, a) => {
      const value = convertTo(Number(a.balance), a.currency, baseCurrency, rates);
      return acc + (a.is_debt ? -value : value);
    }, 0);
  }, [accounts, rates, baseCurrency]);

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

  const enriched = useMemo(() => {
    return activeGoals.map((g) => {
      const priceBase = convertTo(Number(g.price), g.currency, baseCurrency, rates);
      const score = weightedScore(g, weights);
      const ttg = timeToGoal({ goalPrice: priceBase, availableCapital, cashflow });
      return { goal: g, priceBase, score, ttg };
    });
  }, [activeGoals, baseCurrency, rates, weights, availableCapital, cashflow]);

  const visible = useMemo(() => {
    const list = [...enriched];
    if (sortMode === 'score') list.sort((a, b) => b.score - a.score);
    else if (sortMode === 'timeToGoal')
      list.sort((a, b) => (a.ttg.daysToGoal ?? Infinity) - (b.ttg.daysToGoal ?? Infinity));
    else if (sortMode === 'priceAsc') list.sort((a, b) => a.priceBase - b.priceBase);
    else if (sortMode === 'priceDesc') list.sort((a, b) => b.priceBase - a.priceBase);
    return list;
  }, [enriched, sortMode]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    if (sortMode !== 'manual') return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = activeGoals.findIndex((g) => g.id === active.id);
    const newIndex = activeGoals.findIndex((g) => g.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(activeGoals, oldIndex, newIndex);
    reorder.mutate(reordered.map((g) => g.id));
  };

  return (
    <div>
      <PageHeader
        title={t('goals.title')}
        right={
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus className="h-4 w-4" /> {t('goals.addGoal')}
          </Button>
        }
      />

      {activeGoals.length > 0 ? (
        <div className="mb-3">
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{t('goals.sortOptions.manual')}</SelectItem>
              <SelectItem value="score">{t('goals.sortOptions.score')}</SelectItem>
              <SelectItem value="timeToGoal">{t('goals.sortOptions.timeToGoal')}</SelectItem>
              <SelectItem value="priceAsc">{t('goals.sortOptions.priceAsc')}</SelectItem>
              <SelectItem value="priceDesc">{t('goals.sortOptions.priceDesc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-3 text-sm text-muted-foreground">{t('goals.noGoals')}</p>
            <Button onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> {t('goals.addGoal')}
            </Button>
          </CardContent>
        </Card>
      ) : activeGoals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('goals.allAchieved')}</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={visible.map((v) => v.goal.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {visible.map(({ goal, score, ttg, priceBase }) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  score={score}
                  ttg={ttg}
                  priceBase={priceBase}
                  baseCurrency={baseCurrency}
                  locale={i18n.language}
                  onClick={() => nav(`/goals/${goal.id}`)}
                  draggable={sortMode === 'manual'}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {achievedGoals.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('goals.achievedSection')}
            <span className="text-muted-foreground/60 tracking-normal">· {achievedGoals.length}</span>
          </h2>
          <div className="space-y-2">
            {achievedGoals.map((g) => (
              <AchievedRow
                key={g.id}
                goal={g}
                baseCurrency={baseCurrency}
                locale={i18n.language}
                rates={rates}
                onClick={() => nav(`/goals/${g.id}`)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <GoalSheet
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

function GoalRow({
  goal,
  score,
  ttg,
  priceBase,
  baseCurrency,
  locale,
  onClick,
  draggable,
}: {
  goal: Goal;
  score: number;
  ttg: { achievableNow: boolean; daysToGoal: number | null };
  priceBase: number;
  baseCurrency: string;
  locale: string;
  onClick: () => void;
  draggable: boolean;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: goal.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const scoreCls =
    score >= 4
      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
      : score >= 3
        ? 'bg-primary/15 text-primary'
        : 'bg-secondary text-muted-foreground';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-stretch overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      {draggable ? (
        <div
          {...attributes}
          {...listeners}
          aria-label="drag"
          role="button"
          tabIndex={0}
          style={{
            touchAction: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserDrag: 'none',
          } as React.CSSProperties}
          className="flex w-12 shrink-0 cursor-grab items-center justify-center text-muted-foreground/70 hover:bg-accent hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 pointer-events-none" />
        </div>
      ) : null}
      <button onClick={onClick} className="flex flex-1 items-center gap-3 px-3 py-3 text-left">
        <div
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-bold tabular leading-none transition-colors',
            scoreCls,
          )}
        >
          {score.toFixed(1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{goal.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {ttg.achievableNow ? (
              <span className="inline-flex items-center gap-1 text-success">
                <Sparkles className="h-3 w-3" />
                {t('goals.achievableNow')}
              </span>
            ) : ttg.daysToGoal !== null ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t('goals.daysToGoal', { days: ttg.daysToGoal })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <div className="tabular font-semibold">
            {formatCurrency(Number(goal.price), goal.currency, locale)}
          </div>
          {goal.currency !== baseCurrency ? (
            <div className="text-xs text-muted-foreground tabular">
              ≈ {formatCurrency(priceBase, baseCurrency, locale)}
            </div>
          ) : null}
        </div>
      </button>
    </div>
  );
}

function AchievedRow({
  goal,
  baseCurrency,
  locale,
  rates,
  onClick,
}: {
  goal: Goal;
  baseCurrency: string;
  locale: string;
  rates: Record<string, number> | undefined;
  onClick: () => void;
}) {
  const priceBase = convertTo(Number(goal.price), goal.currency, baseCurrency, rates);
  const when = goal.achieved_at
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(goal.achieved_at))
    : null;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-card/40 px-4 py-3 text-left transition-colors hover:border-border"
    >
      <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" strokeWidth={2.5} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-muted-foreground line-through decoration-muted-foreground/40">
          {goal.name}
        </div>
        {when ? <div className="text-xs text-muted-foreground/70">{when}</div> : null}
      </div>
      <div className="text-right">
        <div className="tabular text-sm text-muted-foreground/80">
          {formatCurrency(Number(goal.price), goal.currency, locale)}
        </div>
        {goal.currency !== baseCurrency ? (
          <div className="text-xs text-muted-foreground/60 tabular">
            ≈ {formatCurrency(priceBase, baseCurrency, locale)}
          </div>
        ) : null}
      </div>
    </button>
  );
}
