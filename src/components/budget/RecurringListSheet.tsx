import { useState, useEffect } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRecurring } from '@/hooks/useRecurring';
import { frequencyLabels, RecurringTransaction } from '@/lib/recurringDb';
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  Edit, 
  Play,
  Calendar,
  Pause,
  PlayCircle,
  Clock
} from 'lucide-react';
import { RecurringFormDialog } from './RecurringFormDialog';

interface RecurringListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecurringListSheet({ open, onOpenChange }: RecurringListSheetProps) {
  const { envelopes } = useBudget();
  const { recurring, dueCount, loading, remove, update, applyNow, applyAllDue } = useRecurring();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const getEnvelopeName = (envelopeId: string) => {
    return envelopes.find(e => e.id === envelopeId)?.name || 'Inconnu';
  };

  const handleApplyAllDue = async () => {
    setIsApplying(true);
    try {
      await applyAllDue();
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyNow = async (id: string) => {
    setIsApplying(true);
    try {
      await applyNow(id);
    } finally {
      setIsApplying(false);
    }
  };

  const handleToggleActive = async (item: RecurringTransaction) => {
    await update(item.id, { isActive: !item.isActive });
  };

  const handleEdit = (item: RecurringTransaction) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await remove(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingItem(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const isDue = (dateStr: string) => {
    return new Date(dateStr) <= new Date();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Dépenses récurrentes
            </SheetTitle>
            <SheetDescription>
              Gérez vos dépenses automatiques (loyer, abonnements...)
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 flex flex-col mt-4">
            {/* Action buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => setFormOpen(true)}
                className="flex-1 gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouvelle
              </Button>
              {dueCount > 0 && (
                <Button
                  onClick={handleApplyAllDue}
                  variant="secondary"
                  className="gap-2"
                  disabled={isApplying}
                >
                  <PlayCircle className="w-4 h-4" />
                  Appliquer ({dueCount})
                </Button>
              )}
            </div>

            <Separator className="mb-4" />

            {/* List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chargement...
                </div>
              ) : recurring.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune dépense récurrente</p>
                  <p className="text-sm mt-2">
                    Ajoutez votre loyer, abonnements, etc.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {recurring.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border ${
                        !item.isActive 
                          ? 'bg-muted/50 opacity-60' 
                          : isDue(item.nextDueDate) 
                            ? 'bg-primary/5 border-primary/30' 
                            : 'bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.description}</span>
                            {!item.isActive && (
                              <Badge variant="secondary" className="text-xs">
                                Pausé
                              </Badge>
                            )}
                            {item.isActive && isDue(item.nextDueDate) && (
                              <Badge variant="default" className="text-xs">
                                À payer
                              </Badge>
                            )}
                            {item.isActive && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Clock className="w-3 h-3" />
                                Auto
                              </Badge>
                            )}
                          </div>
                          {item.merchant && (
                            <p className="text-sm text-muted-foreground">
                              {item.merchant}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-lg">
                          {item.amount.toLocaleString('fr-FR', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Badge variant="outline" className="text-xs">
                          {getEnvelopeName(item.envelopeId)}
                        </Badge>
                        <span>•</span>
                        <span>{frequencyLabels[item.frequency]}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.nextDueDate)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {item.isActive && isDue(item.nextDueDate) && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApplyNow(item.id)}
                            disabled={isApplying}
                            className="gap-1"
                          >
                            <Play className="w-3 h-3" />
                            Appliquer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(item)}
                        >
                          {item.isActive ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Form Dialog */}
      <RecurringFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        editingItem={editingItem}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dépense récurrente ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La dépense ne sera plus appliquée automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
