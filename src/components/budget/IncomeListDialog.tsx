import { useState } from 'react';
import { useBudget, Income } from '@/contexts/BudgetContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Banknote, Pencil, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface IncomeListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncomeListDialog({ open, onOpenChange }: IncomeListDialogProps) {
  const { incomes, updateIncome, deleteIncome } = useBudget();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  const sortedIncomes = [...incomes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const startEdit = (income: Income) => {
    setEditingId(income.id);
    setEditAmount(income.amount.toString().replace('.', ','));
    setEditDescription(income.description);
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditDescription('');
  };
  
  const saveEdit = async (id: string) => {
    const parsedAmount = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    
    await updateIncome(id, parsedAmount, editDescription || 'Revenu');
    cancelEdit();
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce revenu ? Le montant sera déduit de "À budgétiser".')) {
      await deleteIncome(id);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Historique des revenus</DialogTitle>
              <DialogDescription>
                Modifier ou supprimer vos revenus
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {sortedIncomes.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Banknote className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun revenu enregistré</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {sortedIncomes.map((income) => (
                <div
                  key={income.id}
                  className="p-3 rounded-xl bg-muted/50 border border-border/50"
                >
                  {editingId === income.id ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`edit-amount-${income.id}`}>Montant</Label>
                        <div className="relative">
                          <Input
                            id={`edit-amount-${income.id}`}
                            type="text"
                            inputMode="decimal"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="pr-8 rounded-xl"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            €
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`edit-desc-${income.id}`}>Description</Label>
                        <Input
                          id={`edit-desc-${income.id}`}
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                          className="flex-1 rounded-xl"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveEdit(income.id)}
                          className="flex-1 rounded-xl gradient-primary"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{income.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(income.date), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">
                          +{income.amount.toLocaleString('fr-FR', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          })}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(income)}
                          className="h-8 w-8 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(income.id)}
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
