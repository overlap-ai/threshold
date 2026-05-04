import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function StarRow({
  label,
  hint,
  value,
  onChange,
  min = 1,
  max = 5,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="text-xs tabular text-muted-foreground">
          {value}/{max}
        </span>
      </div>
      <div
        className={cn(
          'grid gap-2',
          max - min + 1 === 5 ? 'grid-cols-5' : `grid-cols-${max - min + 1}`,
        )}
      >
        {options.map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label} ${n}`}
            onClick={() => onChange(n)}
            className={cn(
              'h-10 rounded-lg border text-sm font-semibold transition-colors',
              n <= value
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-foreground/30',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
