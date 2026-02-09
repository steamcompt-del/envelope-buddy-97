import { useLocation, Link } from 'react-router-dom';
import { Home, ShoppingCart, Receipt, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Budget', icon: <Home className="w-5 h-5" />, path: '/', exact: true },
  { label: 'Dépenses', icon: <Receipt className="w-5 h-5" />, path: '/expenses' },
  { label: 'Courses', icon: <ShoppingCart className="w-5 h-5" />, path: '/shopping' },
  { label: 'Récurrents', icon: <Repeat className="w-5 h-5" />, path: '/recurring' },
];

export function BottomNav() {
  const location = useLocation();
  
  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
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
      </div>
    </nav>
  );
}
