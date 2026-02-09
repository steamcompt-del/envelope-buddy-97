import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Repeat, Plus, Calendar, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useRecurring } from '@/hooks/useRecurring';
import { useBudget } from '@/contexts/BudgetContext';
import { formatCurrency } from '@/lib/utils';
import { RecurringFormDialog } from '@/components/budget/RecurringFormDialog';
import { RecurringTransaction } from '@/lib/recurringDb';
import { SwipeableRow } from '@/components/budget/SwipeableRow';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function RecurringPage() {
  const { recurring, dueCount, loading, applyNow, remove, applyAllDue } = useRecurring();
  const { envelopes } = useBudget();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);

  const handleApply = async (id: string) => {
    setApplyingId(id);
    await applyNow(id);
    setApplyingId(null);
  };

  const handleApplyAll = async () => {
    setApplyingAll(true);
    await applyAllDue();
    setApplyingAll(false);
  };

  const handleEdit = (item: RecurringTransaction) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingItem(null);
    }
  };

  const getEnvelopeName = (envelopeId: string) => {
    return envelopes.find(e => e.id === envelopeId)?.name || 'Inconnue';
  };

  const isDue = (nextDueDate: string) => {
    return new Date(nextDueDate) <= new Date();
  };

  // Separate due and upcoming
  const dueRecurring = recurring.filter(r => isDue(r.nextDueDate) && r.isActive);
  const upcomingRecurring = recurring.filter(r => !isDue(r.nextDueDate) && r.isActive);
  const inactiveRecurring = recurring.filter(r => !r.isActive);

  // Calculate monthly total
  const monthlyTotal = recurring
    .filter(r => r.isActive)
    .reduce((sum, r) => {
      const multiplier = r.frequency === 'weekly' ? 4 : r.frequency === 'biweekly' ? 2 : 1;
      return sum + r.amount * multiplier;
    }, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b">
        <div className="container flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              Dépenses récurrentes
            </h1>
            <p className="text-sm text-muted-foreground">
              ~{formatCurrency(monthlyTotal)}/mois
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} size="sm" className="rounded-xl gap-1">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Due section */}
        {dueRecurring.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  À payer ({dueCount})
                </CardTitle>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleApplyAll}
                  disabled={applyingAll}
                  className="rounded-xl"
                >
                  {applyingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Tout payer'
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {dueRecurring.map(item => (
                <SwipeableRow
                  key={item.id}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                >
                  <div 
                    className="flex items-center justify-between p-3 bg-card rounded-xl border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleEdit(item)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {getEnvelopeName(item.envelopeId)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-destructive">
                        {formatCurrency(item.amount)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApply(item.id);
                        }}
                        disabled={applyingId === item.id}
                        className="rounded-xl h-8"
                      >
                        {applyingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </SwipeableRow>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Upcoming section */}
        {upcomingRecurring.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                À venir
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingRecurring.map(item => (
                <SwipeableRow
                  key={item.id}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                >
                  <div 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleEdit(item)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getEnvelopeName(item.envelopeId)}</span>
                        <span>•</span>
                        <span>{format(new Date(item.nextDueDate), 'd MMM', { locale: fr })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatCurrency(item.amount)}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.frequency === 'weekly' && 'Hebdo'}
                        {item.frequency === 'biweekly' && 'Bi-hebdo'}
                        {item.frequency === 'monthly' && 'Mensuel'}
                        {item.frequency === 'quarterly' && 'Trim.'}
                        {item.frequency === 'yearly' && 'Annuel'}
                      </Badge>
                    </div>
                  </div>
                </SwipeableRow>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Inactive section */}
        {inactiveRecurring.length > 0 && (
          <Card className="opacity-60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-muted-foreground">
                Inactifs ({inactiveRecurring.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {inactiveRecurring.map(item => (
                <SwipeableRow
                  key={item.id}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                >
                  <div 
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-xl cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleEdit(item)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-muted-foreground line-through">
                        {item.description}
                      </p>
                    </div>
                    <span className="font-bold text-muted-foreground">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </SwipeableRow>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {recurring.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Repeat className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Aucune dépense récurrente</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Ajoutez vos abonnements et factures régulières pour mieux anticiper vos dépenses.
            </p>
            <Button onClick={() => setFormOpen(true)} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une dépense récurrente
            </Button>
          </div>
        )}
      </main>

      <RecurringFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        editingItem={editingItem}
      />
    </div>
  );
}
