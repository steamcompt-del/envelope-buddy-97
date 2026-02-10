import { useState, useMemo } from 'react';
import { useBudget, defaultEnvelopeTemplates, RolloverStrategy, EnvelopeCategory } from '@/contexts/BudgetContext';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn, formatCurrency } from '@/lib/utils';
import { 
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet, Check, Euro, AlertTriangle, Ban
} from 'lucide-react';
import { ComponentType } from 'react';
import { RolloverConfigSection } from './RolloverConfigSection';

const MAX_ENVELOPES = 50;

interface CreateEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Icon mapping for type safety
const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  ShoppingCart,
  Utensils,
  Car,
  Gamepad2,
  Heart,
  ShoppingBag,
  Receipt,
  PiggyBank,
  Home,
  Plane,
  Gift,
  Music,
  Wifi,
  Smartphone,
  Coffee,
  Wallet,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Wallet;
  return <Icon className={className} />;
}

const colorOptions = [
  { name: 'blue', class: 'bg-envelope-blue' },
  { name: 'green', class: 'bg-envelope-green' },
  { name: 'orange', class: 'bg-envelope-orange' },
  { name: 'pink', class: 'bg-envelope-pink' },
  { name: 'purple', class: 'bg-envelope-purple' },
  { name: 'yellow', class: 'bg-envelope-yellow' },
  { name: 'teal', class: 'bg-envelope-teal' },
];

const iconOptions = [
  'ShoppingCart', 'Utensils', 'Car', 'Gamepad2', 'Heart', 
  'ShoppingBag', 'Receipt', 'PiggyBank', 'Home', 'Plane',
  'Gift', 'Music', 'Wifi', 'Smartphone', 'Coffee'
];

function normalize(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isSimilarName(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // Check if one contains the other
  if (na.length > 2 && nb.length > 2 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

export function CreateEnvelopeDialog({ open, onOpenChange }: CreateEnvelopeDialogProps) {
  const { createEnvelope, updateEnvelope, allocateToEnvelope, toBeBudgeted, envelopes } = useBudget();
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Wallet');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedCategory, setSelectedCategory] = useState<EnvelopeCategory>('essentiels');
  const [showCustom, setShowCustom] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rolloverEnabled, setRolloverEnabled] = useState(false);
  const [rolloverStrategy, setRolloverStrategy] = useState<RolloverStrategy>('full');
  const [rolloverPercentage, setRolloverPercentage] = useState(100);
  const [rolloverMaxAmount, setRolloverMaxAmount] = useState('');
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  
  const parsedBudget = parseFloat(budgetAmount) || 0;
  const exceedsBudget = Math.round(parsedBudget * 100) > Math.round(toBeBudgeted * 100);
  const atLimit = envelopes.length >= MAX_ENVELOPES;

  // Duplicate name detection
  const similarEnvelope = useMemo(() => {
    if (!name.trim()) return null;
    return envelopes.find(e => isSimilarName(e.name, name.trim()));
  }, [name, envelopes]);

  const hasDuplicateWarning = similarEnvelope && !duplicateAcknowledged;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting || atLimit) return;
    if (hasDuplicateWarning) return;
    
    setIsSubmitting(true);
    try {
      const isSavings = selectedIcon === 'PiggyBank';
      const shouldRollover = rolloverEnabled || isSavings;
      const category = isSavings ? 'epargne' as EnvelopeCategory : selectedCategory;
      
      const envelopeId = await createEnvelope(name.trim(), selectedIcon, selectedColor, category);
      
      // Update rollover settings
      if (envelopeId && shouldRollover) {
        await updateEnvelope(envelopeId, {
          rollover: true,
          rolloverStrategy: rolloverEnabled ? rolloverStrategy : 'full',
          rolloverPercentage: rolloverStrategy === 'percentage' ? rolloverPercentage : undefined,
          maxRolloverAmount: rolloverStrategy === 'capped' ? (parseFloat(rolloverMaxAmount) || undefined) : undefined,
        } as any);
      }
      
      // Allocate budget if specified and valid
      if (parsedBudget > 0 && !exceedsBudget && envelopeId) {
        await allocateToEnvelope(envelopeId, parsedBudget);
      }
      
      // Reset form
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedIcon('Wallet');
    setSelectedColor('blue');
    setSelectedCategory('essentiels');
    setShowCustom(false);
    setBudgetAmount('');
    setRolloverEnabled(false);
    setRolloverStrategy('full');
    setRolloverPercentage(100);
    setRolloverMaxAmount('');
    setDuplicateAcknowledged(false);
  };
  
  const handleTemplateSelect = (template: typeof defaultEnvelopeTemplates[0]) => {
    setName(template.name);
    setSelectedIcon(template.icon);
    setSelectedColor(template.color);
    setDuplicateAcknowledged(false);
  };

  // Limit reached view
  if (atLimit) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle enveloppe</DialogTitle>
          </DialogHeader>
          <Alert className="rounded-xl border-orange-500/50 text-orange-600 dark:text-orange-400 [&>svg]:text-orange-500">
            <Ban className="h-4 w-4" />
            <AlertDescription>
              Limite atteinte ({envelopes.length}/{MAX_ENVELOPES}). Supprimez des enveloppes pour en créer de nouvelles.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Fermer
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Duplicate warning component
  const duplicateWarningEl = similarEnvelope && name.trim() && (
    <Alert className="rounded-xl border-orange-500/50 text-orange-600 dark:text-orange-400 [&>svg]:text-orange-500">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-2">
        <span>Une enveloppe nommée « {similarEnvelope.name} » existe déjà</span>
        {!duplicateAcknowledged && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDuplicateAcknowledged(true)}
            className="self-start rounded-lg text-xs h-7"
          >
            Continuer quand même
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle enveloppe</DialogTitle>
          <DialogDescription>
            Choisissez un modèle ou créez une enveloppe personnalisée
            <span className="ml-1 text-xs">({envelopes.length}/{MAX_ENVELOPES})</span>
          </DialogDescription>
        </DialogHeader>
        
        {!showCustom ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {defaultEnvelopeTemplates.map((template) => (
                <button
                  key={template.name}
                  onClick={() => handleTemplateSelect(template)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    name === template.name 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <DynamicIcon name={template.icon} className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{template.name}</span>
                </button>
              ))}
            </div>

            {/* Duplicate warning */}
            {duplicateWarningEl}
            
            {/* Budget allocation field */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="template-budget" className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                Budget initial (optionnel)
              </Label>
              <div className="relative">
                <Input
                  id="template-budget"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="rounded-xl pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              </div>
              {toBeBudgeted > 0 && (
                <p className={cn(
                  "text-xs",
                  exceedsBudget ? "text-destructive" : "text-muted-foreground"
                )}>
                  {exceedsBudget 
                    ? `Dépasse le disponible (${formatCurrency(toBeBudgeted)})`
                    : `Disponible: ${formatCurrency(toBeBudgeted)}`
                  }
                </p>
              )}
            </div>

            {/* Category selector */}
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <div className="flex gap-2">
                {([
                  { value: 'essentiels' as EnvelopeCategory, label: '🏠 Essentiels', style: 'border-blue-500/30 bg-blue-500/10' },
                  { value: 'lifestyle' as EnvelopeCategory, label: '✨ Lifestyle', style: 'border-purple-500/30 bg-purple-500/10' },
                  { value: 'epargne' as EnvelopeCategory, label: '🐷 Épargne', style: 'border-emerald-500/30 bg-emerald-500/10' },
                ]).map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all",
                      selectedCategory === cat.value
                        ? cn(cat.style, "ring-1 ring-primary")
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rollover config */}
            <RolloverConfigSection
              enabled={rolloverEnabled}
              onEnabledChange={setRolloverEnabled}
              strategy={rolloverStrategy}
              onStrategyChange={setRolloverStrategy}
              percentage={rolloverPercentage}
              onPercentageChange={setRolloverPercentage}
              maxAmount={rolloverMaxAmount}
              onMaxAmountChange={setRolloverMaxAmount}
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCustom(true)}
              className="w-full rounded-xl"
            >
              Personnaliser
            </Button>
            
            {name && (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || exceedsBudget || hasDuplicateWarning}
                className="w-full rounded-xl gradient-primary shadow-button"
              >
                {isSubmitting ? 'Création...' : `Créer "${name}"${parsedBudget > 0 ? ` avec ${formatCurrency(parsedBudget)}` : ''}`}
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="envelope-name">Nom</Label>
              <Input
                id="envelope-name"
                type="text"
                placeholder="Ex: Vacances"
                value={name}
                onChange={(e) => { setName(e.target.value); setDuplicateAcknowledged(false); }}
                className="rounded-xl"
                autoFocus
              />
            </div>

            {/* Duplicate warning */}
            {duplicateWarningEl}
            
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color.name)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all flex items-center justify-center",
                      color.class,
                      selectedColor === color.name && "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                    )}
                  >
                    {selectedColor === color.name && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Icône</Label>
              <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={cn(
                      "w-10 h-10 rounded-lg border flex items-center justify-center transition-all",
                      selectedIcon === icon 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <DynamicIcon name={icon} className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>
            
            {/* Budget allocation field */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="custom-budget" className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                Budget initial (optionnel)
              </Label>
              <div className="relative">
                <Input
                  id="custom-budget"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="rounded-xl pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              </div>
              {toBeBudgeted > 0 && (
                <p className={cn(
                  "text-xs",
                  exceedsBudget ? "text-destructive" : "text-muted-foreground"
                )}>
                  {exceedsBudget 
                    ? `Dépasse le disponible (${formatCurrency(toBeBudgeted)})`
                    : `Disponible: ${formatCurrency(toBeBudgeted)}`
                  }
                </p>
              )}
            </div>

            {/* Category selector */}
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <div className="flex gap-2">
                {([
                  { value: 'essentiels' as EnvelopeCategory, label: '🏠 Essentiels', style: 'border-blue-500/30 bg-blue-500/10' },
                  { value: 'lifestyle' as EnvelopeCategory, label: '✨ Lifestyle', style: 'border-purple-500/30 bg-purple-500/10' },
                  { value: 'epargne' as EnvelopeCategory, label: '🐷 Épargne', style: 'border-emerald-500/30 bg-emerald-500/10' },
                ]).map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all",
                      selectedCategory === cat.value
                        ? cn(cat.style, "ring-1 ring-primary")
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rollover config */}
            <RolloverConfigSection
              enabled={rolloverEnabled}
              onEnabledChange={setRolloverEnabled}
              strategy={rolloverStrategy}
              onStrategyChange={setRolloverStrategy}
              percentage={rolloverPercentage}
              onPercentageChange={setRolloverPercentage}
              maxAmount={rolloverMaxAmount}
              onMaxAmountChange={setRolloverMaxAmount}
            />
            
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCustom(false)}
                className="flex-1 rounded-xl"
              >
                Retour
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || isSubmitting || exceedsBudget || hasDuplicateWarning}
                className="flex-1 rounded-xl gradient-primary shadow-button"
              >
                {isSubmitting ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
