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
import { useActivity } from '@/hooks/useActivity';
import { actionLabels, actionIcons } from '@/lib/activityDb';
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
} from 'lucide-react';

// Icon component map
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
  const { activities, loading } = useActivity(100);

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
      parts.push(`de "${details.from_envelope}" vers "${details.to_envelope}"`);
    }
    if (details.envelope_name) {
      parts.push(`dans "${details.envelope_name}"`);
    }

    return parts.length > 0 ? parts.join(' ') : null;
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="w-4 h-4" />;
  };

  // Group activities by day
  const groupedActivities = activities.reduce((acc, activity) => {
    const date = new Date(activity.createdAt).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique d'activité
          </SheetTitle>
          <SheetDescription>
            {household ? `Activité du ménage "${household.name}"` : 'Votre activité récente'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
          {!household ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>L'historique d'activité n'est disponible</p>
              <p className="text-sm mt-2">que pour les ménages partagés.</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune activité récente</p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {Object.entries(groupedActivities).map(([date, dayActivities]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 capitalize">
                    {date}
                  </h3>
                  <div className="space-y-2">
                    {dayActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                          {renderIcon(actionIcons[activity.action])}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">
                              {activity.userDisplayName || 'Utilisateur'}
                            </span>{' '}
                            {actionLabels[activity.action]}
                          </p>
                          {getActivityDetails(activity) && (
                            <p className="text-sm text-muted-foreground mt-0.5 truncate">
                              {getActivityDetails(activity)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
