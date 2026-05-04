import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex items-end justify-between gap-3 pt-2', className)}>
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
