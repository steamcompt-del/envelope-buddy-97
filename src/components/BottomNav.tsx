import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, ShoppingCart, Receipt, Repeat, Sparkles, Settings, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  exact?: boolean;
}

const mainNavItems: NavItem[] = [
  { label: 'Budget', icon: <Home className="w-5 h-5" />, path: '/', exact: true },
  { label: 'Dépenses', icon: <Receipt className="w-5 h-5" />, path: '/expenses' },
  { label: 'Courses', icon: <ShoppingCart className="w-5 h-5" />, path: '/shopping' },
];

const moreNavItems: NavItem[] = [
  { label: 'Assistant IA', icon: <Sparkles className="w-5 h-5" />, path: '/planning' },
  { label: 'Récurrents', icon: <Repeat className="w-5 h-5" />, path: '/recurring' },
  { label: 'Réglages', icon: <Settings className="w-5 h-5" />, path: '/settings' },
];

export function BottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const isMoreActive = moreNavItems.some(item => isActive(item.path));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        {mainNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-16 gap-1 text-xs font-medium transition-colors',
              isActive(item.path, item.exact)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className={cn(
              'transition-colors',
              isActive(item.path, item.exact) && 'text-primary'
            )}>
              {item.icon}
            </div>
            <span className="leading-tight">{item.label}</span>
          </Link>
        ))}

        {/* More menu */}
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-16 gap-1 text-xs font-medium transition-colors',
                isMoreActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="leading-tight">Plus</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-48 p-1.5"
          >
            {moreNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.path)
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}
