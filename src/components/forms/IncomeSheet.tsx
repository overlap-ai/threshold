import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { IncomeFrequency, IncomeSource } from '@/lib/types/database';

const CURRENCIES = ['MXN', 'USD', 'EUR', 'USDT'];
const FREQS: IncomeFrequency[] = ['one_time', 'weekly', 'biweekly', 'monthly'];

export function IncomeSheet({
  open,
  initial,
  baseCurrency,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial: Partial<IncomeSource> | null;
  baseCurrency: string;
  onClose: () => void;
  onSave: (row: Partial<IncomeSource>) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Partial<IncomeSource>>({});

  useEffect(() => {
    if (open) {
      setForm({
        currency: baseCurrency,
        frequency: 'monthly',
        active: true,
        next_date: new Date().toISOString().slice(0, 10),
        ...(initial ?? {}),
      });
    }
  }, [open, initial, baseCurrency]);

  const editing = !!initial?.id;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t('common.edit') : t('income.addIncome')}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSave(form);
          }}
        >
          <div className="space-y-1.5">
            <Label>{t('income.name')}</Label>
            <Input
              required
              value={form.name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>{t('income.amount')}</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                required
                placeholder="0.00"
                value={form.amount === undefined || form.amount === null ? '' : form.amount}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, amount: v === '' ? undefined : Number(v) }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('income.currency')}</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('income.frequency')}</Label>
              <Select
                value={form.frequency as string | undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as IncomeFrequency }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQS.map((fr) => (
                    <SelectItem key={fr} value={fr}>
                      {t(`income.frequencies.${fr}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('income.nextDate')}</Label>
              <Input
                type="date"
                required
                value={(form.next_date ?? '').toString().slice(0, 10)}
                onChange={(e) => setForm((f) => ({ ...f, next_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <Label className="cursor-pointer">{t('goals.statuses.active')}</Label>
            <Switch
              checked={form.active !== false}
              onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Button type="submit" size="lg" className="w-full">
              {t('common.save')}
            </Button>
            <div className="flex items-center justify-between">
              {editing && onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(initial!.id!)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('common.delete')}
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" variant="ghost" onClick={onClose}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
