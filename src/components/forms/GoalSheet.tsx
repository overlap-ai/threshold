import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { StarRow } from '@/components/ui/star-row';
import type { Goal } from '@/lib/types/database';

const CURRENCIES = ['MXN', 'USD', 'EUR', 'BTC', 'ETH', 'USDT', 'USDC'];

export function GoalSheet({
  open,
  initial,
  baseCurrency,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial: Partial<Goal> | null;
  baseCurrency: string;
  onClose: () => void;
  onSave: (row: Partial<Goal>) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Partial<Goal>>({});

  useEffect(() => {
    if (open) {
      setForm({
        currency: baseCurrency,
        urgency: 3,
        importance: 3,
        roi: 3,
        status: 'active',
        ...(initial ?? {}),
      });
    }
  }, [open, initial, baseCurrency]);

  const editing = !!initial?.id;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? t('common.edit') : t('goals.addGoal')}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSave(form);
          }}
        >
          <div className="space-y-1.5">
            <Label>{t('goals.name')}</Label>
            <Input
              required
              autoFocus
              value={form.name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>{t('goals.price')}</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                required
                placeholder="0.00"
                value={form.price === undefined || form.price === null ? '' : form.price}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, price: v === '' ? undefined : Number(v) }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('goals.currency')}</Label>
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

          <StarRow
            label={t('goals.urgency')}
            value={form.urgency ?? 3}
            onChange={(v) => setForm((f) => ({ ...f, urgency: v }))}
          />
          <StarRow
            label={t('goals.importance')}
            value={form.importance ?? 3}
            onChange={(v) => setForm((f) => ({ ...f, importance: v }))}
          />
          <StarRow
            label={t('goals.roi')}
            value={form.roi ?? 3}
            onChange={(v) => setForm((f) => ({ ...f, roi: v }))}
          />

          <div className="space-y-1.5">
            <Label>{t('goals.description')}</Label>
            <Textarea
              rows={3}
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
