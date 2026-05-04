import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { Account, AccountType } from '@/lib/types/database';

const TYPES: AccountType[] = ['cash', 'bank', 'credit_card', 'crypto', 'other'];
const CURRENCIES = ['MXN', 'USD', 'EUR'];

export function AccountSheet({
  open,
  initial,
  baseCurrency,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial: Partial<Account> | null;
  baseCurrency: string;
  onClose: () => void;
  onSave: (row: Partial<Account>) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Partial<Account>>({});

  useEffect(() => {
    if (open) {
      setForm({
        type: 'cash',
        currency: baseCurrency,
        is_debt: false,
        ...(initial ?? {}),
      });
    }
  }, [open, initial, baseCurrency]);

  const editing = !!initial?.id;
  const showDebtToggle = form.type === 'credit_card' || form.type === 'other';
  const currencyOptions =
    form.currency && !CURRENCIES.includes(form.currency)
      ? [...CURRENCIES, form.currency]
      : CURRENCIES;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? t('common.edit') : t('dashboard.addAccount')}
          </DialogTitle>
          <DialogDescription>
            {form.is_debt ? t('dashboard.debt') : t('dashboard.available')}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSave(form);
          }}
        >
          <div className="space-y-1.5">
            <Label>{t('accounts.name')}</Label>
            <Input
              required
              value={form.name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('accounts.type')}</Label>
              <Select
                value={form.type as AccountType | undefined}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    type: v as AccountType,
                    is_debt: v === 'credit_card' ? true : f.is_debt,
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {t(`accounts.types.${tp}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('accounts.currency')}</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('accounts.balance')}</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              required
              placeholder="0.00"
              value={form.balance === undefined || form.balance === null ? '' : form.balance}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, balance: v === '' ? undefined : Number(v) }));
              }}
            />
          </div>

          {showDebtToggle ? (
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
              <Label className="cursor-pointer">{t('accounts.isDebt')}</Label>
              <Switch
                checked={!!form.is_debt}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_debt: v }))}
              />
            </div>
          ) : null}

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
