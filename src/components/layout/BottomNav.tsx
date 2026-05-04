import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wallet, Flag, Banknote, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const items: ReadonlyArray<{
  to: string;
  key: 'dashboard' | 'goals' | 'income' | 'settings';
  Icon: typeof Wallet;
  end?: boolean;
}> = [
  { to: '/', key: 'dashboard', Icon: Wallet, end: true },
  { to: '/goals', key: 'goals', Icon: Flag },
  { to: '/income', key: 'income', Icon: Banknote },
  { to: '/settings', key: 'settings', Icon: User },
];

export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="safe-bottom shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-md">
      <div className="flex items-stretch justify-around px-2 py-1.5">
        {items.map(({ to, key, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                <span>{t(`nav.${key}`)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
