import { useState, useMemo } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useActivity } from '@/hooks/useActivity';
import {
  actionLabels,
  actionIcons,
  actionCategory,
  categoryLabels,
  categoryColors,
  type ActivityAction,
  type ActivityCategory,
} from '@/lib/activityDb';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  ArrowLeftRight,
  RefreshCw,
  UserPlus,
  UserMinus,
  Search,
  X,
  Filter,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  ArrowLeftRight,
  RefreshCw,
  UserPlus,
  UserMinus,
};

interface ActivityLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityLogSheet({ open, onOpenChange }: ActivityLogSheetProps) {
  const { household } = useBudget();
  const { activities, loading } = useActivity(200);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActivityCategory | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  const getActivityDetails = (activity: typeof activities[0]) => {
    const details = activity.details as Record<string, unknown> | undefined;
    if (!details) return null;

    const parts: string[] = [];
    
    if (details.description) {
      parts.push(`"${details.description}"`);
    }
    if (details.name) {
      parts.push(`"${details.name}"`);
    }
    if (details.amount !== undefined) {
      parts.push(formatAmount(details.amount as number));
    }
    if (details.from_envelope && details.to_envelope) {
      parts.push(`${details.from_envelope} → ${details.to_envelope}`);
    }
    if (details.envelope_name) {
      parts.push(`→ ${details.envelope_name}`);
    }

    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const renderIcon = (action: ActivityAction) => {
    const iconName = actionIcons[action];
    const IconComponent = iconMap[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="w-4 h-4" />;
  };

  // Filter & search
  const filteredActivities = useMemo(() => {
    let result = activities;

    if (activeFilter) {
      result = result.filter(a => actionCategory[a.action] === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a => {
        const label = actionLabels[a.action].toLowerCase();
        const name = (a.userDisplayName || '').toLowerCase();
        const details = JSON.stringify(a.details || {}).toLowerCase();
        return label.includes(q) || name.includes(q) || details.includes(q);
      });
    }

    return result;
  }, [activities, activeFilter, search]);

  // Group by day
  const groupedActivities = useMemo(() => {
    return filteredActivities.reduce((acc, activity) => {
      const date = new Date(activity.createdAt).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(activity);
      return acc;
    }, {} as Record<string, typeof filteredActivities>);
  }, [filteredActivities]);

  // Category stats
  const categoryStats = useMemo(() => {
    const stats: Partial<Record<ActivityCategory, number>> = {};
    for (const a of activities) {
      const cat = actionCategory[a.action];
      stats[cat] = (stats[cat] || 0) + 1;
    }
    return stats;
  }, [activities]);

  const allCategories: ActivityCategory[] = ['income', 'expense', 'envelope', 'allocation', 'recurring', 'member'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <div className="p-6 pb-0 space-y-4">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <History className="w-4 h-4 text-primary" />
              </div>
              Historique d'activité
            </SheetTitle>
            <SheetDescription>
              {household ? `Ménage "${household.name}"` : 'Votre activité récente'}
              {activities.length > 0 && (
                <span className="ml-1">· {activities.length} actions</span>
              )}
            </SheetDescription>
          </SheetHeader>

          {/* Search */}
          {household && activities.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 pr-9 h-10 rounded-xl"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Category Filters */}
          {household && activities.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              <Button
                variant={activeFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(null)}
                className="rounded-xl h-8 text-xs shrink-0"
              >
                Tout
              </Button>
              {allCategories.map(cat => {
                const count = categoryStats[cat] || 0;
                if (count === 0) return null;
                return (
                  <Button
                    key={cat}
                    variant={activeFilter === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                    className="rounded-xl h-8 text-xs shrink-0 gap-1"
                  >
                    {categoryLabels[cat]}
                    <span className="opacity-60">{count}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-6 mt-2">
          {!household ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                <History className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium">Historique non disponible</p>
              <p className="text-sm mt-1">Rejoignez un ménage pour voir l'activité partagée</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                {search || activeFilter ? (
                  <Filter className="w-8 h-8 text-muted-foreground/50" />
                ) : (
                  <History className="w-8 h-8 text-muted-foreground/50" />
                )}
              </div>
              <p className="font-medium">
                {search || activeFilter ? 'Aucun résultat' : 'Aucune activité'}
              </p>
              {(search || activeFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearch(''); setActiveFilter(null); }}
                  className="mt-2 text-primary"
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              <AnimatePresence initial={false}>
                {Object.entries(groupedActivities).map(([date, dayActivities]) => (
                  <motion.div
                    key={date}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 capitalize">
                      {date}
                    </h3>
                    <div className="space-y-2">
                      {dayActivities.map((activity, idx) => {
                        const cat = actionCategory[activity.action];
                        const colorClass = categoryColors[cat];
                        const details = getActivityDetails(activity);
                        const isDelete = activity.action.endsWith('_deleted');
                        const isAdd = activity.action.endsWith('_added') || activity.action.endsWith('_created') || activity.action === 'member_joined';

                        return (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-xl border transition-colors',
                              'bg-card hover:bg-muted/30'
                            )}
                          >
                            {/* Icon */}
                            <div className={cn(
                              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                              colorClass
                            )}>
                              {renderIcon(activity.action)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm leading-snug">
                                  <span className="font-semibold">
                                    {activity.userDisplayName || 'Utilisateur'}
                                  </span>{' '}
                                  <span className="text-muted-foreground">
                                    {actionLabels[activity.action]}
                                  </span>
                                </p>
                              </div>

                              {/* Details */}
                              {details && (
                                <p className="text-sm mt-1 text-foreground/80 truncate">
                                  {details}
                                </p>
                              )}

                              {/* Amount badge */}
                              {activity.details?.amount !== undefined && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'mt-1.5 text-xs font-semibold',
                                    isDelete && 'border-red-500/30 text-red-500',
                                    isAdd && 'border-emerald-500/30 text-emerald-500',
                                    !isDelete && !isAdd && 'border-amber-500/30 text-amber-500'
                                  )}
                                >
                                  {isDelete ? '-' : isAdd ? '+' : ''}
                                  {formatAmount(activity.details.amount as number)}
                                </Badge>
                              )}

                              {/* Timestamp */}
                              <p className="text-xs text-muted-foreground/70 mt-1.5">
                                {formatDate(activity.createdAt)}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
