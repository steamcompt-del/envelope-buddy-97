import { useState, useEffect } from 'react';
import { useBudget, AllocationTemplate } from '@/contexts/BudgetContext';
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
import { Switch } from '@/components/ui/switch';
import { Save, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface AllocationTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllocationTemplateDialog({ open, onOpenChange }: AllocationTemplateDialogProps) {
  const { envelopes, allocationTemplates, saveAllocationTemplate, applyAllocationTemplate, toBeBudgeted } = useBudget();
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Initialize from existing templates
  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      envelopes.forEach(env => {
        const existing = allocationTemplates.find(t => t.envelopeId === env.id);
        initial[env.id] = existing ? existing.amount.toString().replace('.', ',') : '';
      });
      setTemplates(initial);
      setHasChanges(false);
    }
  }, [open, envelopes, allocationTemplates]);
  
  const handleAmountChange = (envelopeId: string, value: string) => {
    setTemplates(prev => ({ ...prev, [envelopeId]: value }));
    setHasChanges(true);
  };
  
  const handleSave = () => {
    const newTemplates: AllocationTemplate[] = [];
    
    Object.entries(templates).forEach(([envelopeId, amountStr]) => {
      const amount = parseFloat(amountStr.replace(',', '.'));
      if (!isNaN(amount) && amount > 0) {
        newTemplates.push({ envelopeId, amount });
      }
    });
    
    saveAllocationTemplate(newTemplates);
    toast.success('Modèle d\'allocations enregistré');
    setHasChanges(false);
  };
  
  const handleApply = () => {
    if (toBeBudgeted <= 0) {
      toast.error('Aucun fonds à budgétiser');
      return;
    }
    
    // Save first if there are changes
    if (hasChanges) {
      handleSave();
    }
    
    applyAllocationTemplate();
    toast.success('Allocations appliquées selon le modèle');
    onOpenChange(false);
  };
  
  const totalTemplate = Object.values(templates).reduce((sum, val) => {
    const num = parseFloat(val.replace(',', '.'));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Modèle d'allocations
          </DialogTitle>
          <DialogDescription>
            Définissez les montants par défaut pour chaque enveloppe. Appliquez-les en un clic chaque mois.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {envelopes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Créez d'abord des enveloppes pour définir un modèle.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {envelopes.map(env => (
                  <div key={env.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium truncate block">{env.name}</Label>
                    </div>
                    <div className="relative w-28">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={templates[env.id] || ''}
                        onChange={(e) => handleAmountChange(env.id, e.target.value)}
                        className="pr-6 text-right h-9 rounded-lg"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Total */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total du modèle</span>
                  <span className="font-semibold">
                    {totalTemplate.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                {toBeBudgeted > 0 && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Disponible ce mois</span>
                    <span className="font-semibold text-primary">
                      {toBeBudgeted.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="flex-1 rounded-xl gap-2"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={toBeBudgeted <= 0 || totalTemplate === 0}
                  className="flex-1 rounded-xl gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  Appliquer
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                L'application allouera les montants selon le modèle, limité aux fonds disponibles.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
