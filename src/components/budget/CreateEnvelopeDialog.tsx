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
  Coffee, Wallet, Check, Euro, AlertTriangle, Ban, Landmark,
  Target, TrendingUp, Shield, Umbrella, GraduationCap, ArrowLeft
} from 'lucide-react';
import { ComponentType } from 'react';
import { RolloverConfigSection } from './RolloverConfigSection';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_ENVELOPES = 50;

interface CreateEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Icon mapping for type safety
const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag,
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone,
  Coffee, Wallet, Target, TrendingUp, Shield, Umbrella, GraduationCap,
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

// Savings-specific templates
const savingsTemplates = [
  { name: 'Fonds d\'urgence', icon: 'Shield', color: 'blue', description: '3-6 mois de dépenses' },
  { name: 'Vacances', icon: 'Plane', color: 'orange', description: 'Votre prochain voyage' },
  { name: 'Achat immobilier', icon: 'Home', color: 'teal', description: 'Apport ou travaux' },
  { name: 'Véhicule', icon: 'Car', color: 'purple', description: 'Achat ou entretien' },
  { name: 'Études', icon: 'GraduationCap', color: 'blue', description: 'Formation ou scolarité' },
  { name: 'Cadeaux', icon: 'Gift', color: 'pink', description: 'Noël, anniversaires...' },
  { name: 'Investissement', icon: 'TrendingUp', color: 'green', description: 'Placements financiers' },
  { name: 'Épargne libre', icon: 'PiggyBank', color: 'green', description: 'Objectif personnalisé' },
];

type EnvelopeType = 'classique' | 'epargne';
type Step = 'choose-type' | 'template' | 'custom';

function normalize(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isSimilarName(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.length > 2 && nb.length > 2 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

export function CreateEnvelopeDialog({ open, onOpenChange }: CreateEnvelopeDialogProps) {
  const { createEnvelope, updateEnvelope, allocateToEnvelope, allocateInitialBalance, toBeBudgeted, envelopes } = useBudget();
  const [step, setStep] = useState<Step>('choose-type');
  const [envelopeType, setEnvelopeType] = useState<EnvelopeType>('classique');
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Wallet');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedCategory, setSelectedCategory] = useState<EnvelopeCategory>('essentiels');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rolloverEnabled, setRolloverEnabled] = useState(false);
  const [rolloverStrategy, setRolloverStrategy] = useState<RolloverStrategy>('full');
  const [rolloverPercentage, setRolloverPercentage] = useState(100);
  const [rolloverMaxAmount, setRolloverMaxAmount] = useState('');
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [initialBalance, setInitialBalance] = useState('');
  const [useInitialBalance, setUseInitialBalance] = useState(false);
  
  const parsedBudget = parseFloat(budgetAmount) || 0;
  const parsedInitialBalance = parseFloat(initialBalance) || 0;
  const exceedsBudget = !useInitialBalance && Math.round(parsedBudget * 100) > Math.round(toBeBudgeted * 100);
  const atLimit = envelopes.length >= MAX_ENVELOPES;

  const similarEnvelope = useMemo(() => {
    if (!name.trim()) return null;
    return envelopes.find(e => isSimilarName(e.name, name.trim()));
  }, [name, envelopes]);

  const hasDuplicateWarning = similarEnvelope && !duplicateAcknowledged;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || isSubmitting || atLimit) return;
    if (hasDuplicateWarning) return;
    
    setIsSubmitting(true);
    try {
      const isSavings = envelopeType === 'epargne';
      const category = isSavings ? 'epargne' as EnvelopeCategory : selectedCategory;
      const shouldRollover = rolloverEnabled || isSavings;
      
      const envelopeId = await createEnvelope(name.trim(), selectedIcon, selectedColor, category);
      
      if (envelopeId && shouldRollover) {
        await updateEnvelope(envelopeId, {
          rollover: true,
          rolloverStrategy: rolloverEnabled ? rolloverStrategy : 'full',
          rolloverPercentage: rolloverStrategy === 'percentage' ? rolloverPercentage : undefined,
          maxRolloverAmount: rolloverStrategy === 'capped' ? (parseFloat(rolloverMaxAmount) || undefined) : undefined,
        } as any);
      }
      
      if (envelopeId) {
        if (useInitialBalance && parsedInitialBalance > 0) {
          await allocateInitialBalance(envelopeId, parsedInitialBalance);
        } else if (parsedBudget > 0 && !exceedsBudget) {
          await allocateToEnvelope(envelopeId, parsedBudget);
        }
      }
      
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('choose-type');
    setEnvelopeType('classique');
    setName('');
    setSelectedIcon('Wallet');
    setSelectedColor('blue');
    setSelectedCategory('essentiels');
    setBudgetAmount('');
    setRolloverEnabled(false);
    setRolloverStrategy('full');
    setRolloverPercentage(100);
    setRolloverMaxAmount('');
    setDuplicateAcknowledged(false);
    setInitialBalance('');
    setUseInitialBalance(false);
  };

  const handleTypeSelect = (type: EnvelopeType) => {
    setEnvelopeType(type);
    if (type === 'epargne') {
      setSelectedCategory('epargne');
      setSelectedIcon('PiggyBank');
      setSelectedColor('green');
      setUseInitialBalance(false);
    } else {
      setSelectedCategory('essentiels');
      setSelectedIcon('Wallet');
      setSelectedColor('blue');
    }
    setStep('template');
  };
  
  const handleTemplateSelect = (template: { name: string; icon: string; color: string }) => {
    setName(template.name);
    setSelectedIcon(template.icon);
    setSelectedColor(template.color);
    setDuplicateAcknowledged(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    onOpenChange(newOpen);
  };

  // Limit reached view
  if (atLimit) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="rounded-xl">
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

  // Budget/initial balance section (shared)
  const budgetSection = (
    <div className="space-y-3 pt-2 border-t">
      {envelopeType === 'epargne' && (
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            Solde initial existant (hors budget)
          </Label>
          <Switch
            checked={useInitialBalance}
            onCheckedChange={(checked) => {
              setUseInitialBalance(checked);
              if (checked) setBudgetAmount('');
              else setInitialBalance('');
            }}
          />
        </div>
      )}
      {envelopeType === 'classique' && (
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            Solde initial existant (hors budget)
          </Label>
          <Switch
            checked={useInitialBalance}
            onCheckedChange={(checked) => {
              setUseInitialBalance(checked);
              if (checked) setBudgetAmount('');
              else setInitialBalance('');
            }}
          />
        </div>
      )}
      {useInitialBalance && (
        <p className="text-xs text-muted-foreground">
          Ce montant représente une épargne déjà existante. Il ne sera pas déduit de votre budget.
        </p>
      )}
      
      {useInitialBalance ? (
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="Ex: 5000.00"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            className="rounded-xl pr-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
        </div>
      ) : (
        <>
          <Label className="flex items-center gap-2">
            <Euro className="h-4 w-4 text-muted-foreground" />
            {envelopeType === 'epargne' ? 'Montant initial à épargner' : 'Budget initial'} (optionnel)
          </Label>
          <div className="relative">
            <Input
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
        </>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ============ STEP 1: Choose Type ============ */}
          {step === 'choose-type' && (
            <motion.div
              key="choose-type"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle>Nouvelle enveloppe</DialogTitle>
                <DialogDescription>
                  Quel type d'enveloppe souhaitez-vous créer ?
                  <span className="ml-1 text-xs">({envelopes.length}/{MAX_ENVELOPES})</span>
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 mt-4">
                {/* Classique */}
                <button
                  onClick={() => handleTypeSelect('classique')}
                  className={cn(
                    "relative flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                    "border-border hover:border-blue-500/50 hover:bg-blue-500/5"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">Enveloppe classique</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Pour vos dépenses courantes : courses, factures, loisirs, transport...
                    </p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">Essentiels</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">Lifestyle</span>
                    </div>
                  </div>
                </button>

                {/* Épargne */}
                <button
                  onClick={() => handleTypeSelect('epargne')}
                  className={cn(
                    "relative flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                    "border-border hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <PiggyBank className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">Enveloppe épargne</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Pour vos objectifs : fonds d'urgence, vacances, projet immobilier...
                    </p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">Report automatique</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">Objectif cible</span>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* ============ STEP 2: Template Selection ============ */}
          {step === 'template' && (
            <motion.div
              key="template"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <button 
                    onClick={() => { setStep('choose-type'); setName(''); }}
                    className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  {envelopeType === 'epargne' ? (
                    <span className="flex items-center gap-2">
                      <PiggyBank className="w-5 h-5 text-emerald-500" />
                      Objectif d'épargne
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-blue-500" />
                      Enveloppe classique
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Choisissez un modèle ou personnalisez
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Templates grid */}
                <div className="grid grid-cols-2 gap-2">
                  {(envelopeType === 'epargne' ? savingsTemplates : defaultEnvelopeTemplates.filter(t => t.icon !== 'PiggyBank')).map((template) => (
                    <button
                      key={template.name}
                      onClick={() => handleTemplateSelect(template)}
                      className={cn(
                        "flex flex-col gap-1 p-3 rounded-xl border transition-all text-left",
                        name === template.name 
                          ? envelopeType === 'epargne'
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <DynamicIcon name={template.icon} className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                      {'description' in template && (
                        <span className="text-[11px] text-muted-foreground leading-tight">{(template as any).description}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Duplicate warning */}
                {duplicateWarningEl}
                
                {/* Budget section */}
                {budgetSection}

                {/* Category selector - only for classique */}
                {envelopeType === 'classique' && (
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <div className="flex gap-2">
                      {([
                        { value: 'essentiels' as EnvelopeCategory, label: '🏠 Essentiels', style: 'border-blue-500/30 bg-blue-500/10' },
                        { value: 'lifestyle' as EnvelopeCategory, label: '✨ Lifestyle', style: 'border-purple-500/30 bg-purple-500/10' },
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
                )}

                {/* Rollover config - only for classique */}
                {envelopeType === 'classique' && (
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
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep('custom'); if (!name) setName(''); }}
                  className="w-full rounded-xl"
                >
                  Personnaliser
                </Button>
                
                {name && (
                  <Button
                    onClick={() => handleSubmit()}
                    disabled={isSubmitting || exceedsBudget || !!hasDuplicateWarning}
                    className="w-full rounded-xl gradient-primary shadow-button"
                  >
                    {isSubmitting ? 'Création...' : `Créer "${name}"${useInitialBalance && parsedInitialBalance > 0 ? ` avec ${formatCurrency(parsedInitialBalance)}` : parsedBudget > 0 ? ` avec ${formatCurrency(parsedBudget)}` : ''}`}
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* ============ STEP 3: Custom ============ */}
          {step === 'custom' && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <button 
                    onClick={() => setStep('template')}
                    className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  {envelopeType === 'epargne' ? 'Épargne personnalisée' : 'Enveloppe personnalisée'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="envelope-name">Nom</Label>
                  <Input
                    id="envelope-name"
                    type="text"
                    placeholder={envelopeType === 'epargne' ? 'Ex: Projet maison' : 'Ex: Abonnements'}
                    value={name}
                    onChange={(e) => { setName(e.target.value); setDuplicateAcknowledged(false); }}
                    className="rounded-xl"
                    autoFocus
                  />
                </div>

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
                
                {/* Budget section */}
                {budgetSection}

                {/* Category selector - only for classique */}
                {envelopeType === 'classique' && (
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <div className="flex gap-2">
                      {([
                        { value: 'essentiels' as EnvelopeCategory, label: '🏠 Essentiels', style: 'border-blue-500/30 bg-blue-500/10' },
                        { value: 'lifestyle' as EnvelopeCategory, label: '✨ Lifestyle', style: 'border-purple-500/30 bg-purple-500/10' },
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
                )}

                {/* Rollover config - only for classique */}
                {envelopeType === 'classique' && (
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
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('template')}
                    className="flex-1 rounded-xl"
                  >
                    Retour
                  </Button>
                  <Button
                    type="submit"
                    disabled={!name.trim() || isSubmitting || exceedsBudget || !!hasDuplicateWarning}
                    className="flex-1 rounded-xl gradient-primary shadow-button"
                  >
                    {isSubmitting ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
