import { memo } from 'react';
import { Envelope } from '@/contexts/BudgetContext';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle } from 'lucide-react';
import { 
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet
} from 'lucide-react';
import { ComponentType } from 'react';
import { SavingsGoal, SavingsPriority } from '@/lib/savingsGoalsDb';

import { EnvelopeQuickActions, EnvelopeQuickActionHandlers } from './EnvelopeQuickActions';

interface EnvelopeCardProps extends EnvelopeQuickActionHandlers {
  envelope: Envelope;
  onClick: () => void;
  savingsGoal?: SavingsGoal;
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

// Dynamic icon component
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Wallet;
  return <Icon className={className} />;
}

// Color mapping for envelope backgrounds
const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-envelope-blue/15', text: 'text-envelope-blue', border: 'border-envelope-blue/30' },
  green: { bg: 'bg-envelope-green/15', text: 'text-envelope-green', border: 'border-envelope-green/30' },
  orange: { bg: 'bg-envelope-orange/15', text: 'text-envelope-orange', border: 'border-envelope-orange/30' },
  pink: { bg: 'bg-envelope-pink/15', text: 'text-envelope-pink', border: 'border-envelope-pink/30' },
  purple: { bg: 'bg-envelope-purple/15', text: 'text-envelope-purple', border: 'border-envelope-purple/30' },
  yellow: { bg: 'bg-envelope-yellow/15', text: 'text-envelope-yellow', border: 'border-envelope-yellow/30' },
  red: { bg: 'bg-envelope-red/15', text: 'text-envelope-red', border: 'border-envelope-red/30' },
  teal: { bg: 'bg-envelope-teal/15', text: 'text-envelope-teal', border: 'border-envelope-teal/30' },
};

// Get progress bar color based on percentage used (HSL values for semantic colors)
function getProgressColorHsl(percentUsed: number, isOverspent: boolean): string {
  if (isOverspent) return "hsl(0 84% 60%)"; // destructive red
  if (percentUsed >= 80) return "hsl(25 95% 53%)"; // orange
  if (percentUsed >= 50) return "hsl(45 93% 47%)"; // yellow
  return "hsl(160 84% 45%)"; // green (success)
}

function getSavingsProgressColorHsl(percent: number): string {
  if (percent >= 100) return "hsl(160 84% 45%)"; // green (complete)
  if (percent >= 75) return "hsl(160 84% 45%)"; // green
  if (percent >= 50) return "hsl(45 93% 47%)"; // yellow
  return "hsl(25 95% 53%)"; // orange
}

const PRIORITY_BADGE: Record<SavingsPriority, { emoji: string; label: string; className: string }> = {
  essential: { emoji: '🔴', label: 'Essentiel', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  high: { emoji: '🟠', label: 'Haute', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  medium: { emoji: '🟡', label: 'Moyenne', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  low: { emoji: '🟢', label: 'Basse', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
};

export const EnvelopeCard = memo(function EnvelopeCard({ envelope, onClick, savingsGoal, onQuickAddExpense, onQuickAllocate, onQuickTransfer, onQuickDelete }: EnvelopeCardProps) {
  const { name, allocated, spent, icon, color } = envelope;
  
  const isSavings = icon === 'PiggyBank';
  const colorStyle = colorClasses[color] || colorClasses.blue;
  
  // For savings envelopes: allocated is the total saved, spent represents withdrawals
  // Net savings = what's actually available (allocated - spent), clamped to 0 minimum
  const netSavings = Math.max(0, allocated - spent);
  
  // For regular envelopes: standard spent/allocated behavior
  const remaining = allocated - spent;
  const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0;
  const isOverspent = spent > allocated;
  
  // Savings goal calculations
  const targetAmount = savingsGoal?.target_amount || 0;
  const savingsPercent = targetAmount > 0
    ? Math.min((netSavings / targetAmount) * 100, 100)
    : 0;
  const isSavingsComplete = targetAmount > 0 && netSavings >= targetAmount;
  
  // Progress color logic
  const progressColor = isSavings
    ? getSavingsProgressColorHsl(savingsPercent)
    : getProgressColorHsl(percentUsed, isOverspent);
  
  // Render savings envelope
  if (isSavings) {
    return (
      <EnvelopeQuickActions
        envelope={envelope}
        onViewDetails={() => onClick()}
        onQuickAddExpense={onQuickAddExpense}
        onQuickAllocate={onQuickAllocate}
        onQuickTransfer={onQuickTransfer}
        onQuickDelete={onQuickDelete}
      >
      <div
        className={cn(
          "w-full p-4 rounded-xl border text-left transition-all duration-200",
          "hover:scale-[1.02] hover:shadow-card active:scale-[0.98]",
          "bg-card",
          colorStyle.border
        )}
      >
        <div className="flex items-start gap-3 overflow-hidden">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg",
            colorStyle.bg
          )}>
            <DynamicIcon name={icon} className={cn("w-5 h-5", colorStyle.text)} />
          </div>
          
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground break-all">{name}</h3>
              {envelope.rollover && envelope.rolloverStrategy !== 'none' && (
                <Badge variant="secondary" className="flex items-center gap-1 text-[10px] px-1.5 py-0">
                  📅
                  {envelope.rolloverStrategy === 'percentage' && `${envelope.rolloverPercentage ?? 100}%`}
                  {envelope.rolloverStrategy === 'capped' && envelope.maxRolloverAmount != null && `max ${envelope.maxRolloverAmount}€`}
                  {envelope.rolloverStrategy === 'full' && 'Report'}
                </Badge>
              )}
              {savingsGoal && savingsGoal.priority && savingsGoal.priority !== 'medium' && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", PRIORITY_BADGE[savingsGoal.priority].className)}>
                  {PRIORITY_BADGE[savingsGoal.priority].emoji} {PRIORITY_BADGE[savingsGoal.priority].label}
                </Badge>
              )}
              {savingsGoal?.auto_contribute && !savingsGoal?.is_paused && (
                <span className="text-[10px] text-primary" title="Contribution automatique">🔄</span>
              )}
              {savingsGoal?.is_paused && (
                <span className="text-[10px] text-muted-foreground" title="En pause">⏸️</span>
              )}
            </div>
            {savingsGoal ? (
              <p className="text-sm text-muted-foreground truncate">
                {savingsGoal.name || 'Objectif'} : {targetAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground truncate">
                Aucun objectif défini
              </p>
            )}
          </div>
          
          <div className="text-right shrink-0">
            <p className={cn(
              "font-semibold text-lg",
              isSavingsComplete ? "text-envelope-green" : "text-foreground"
            )}>
              {netSavings.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
            <p className="text-xs text-muted-foreground">épargné</p>
          </div>
        </div>
        
        {/* Progress toward goal */}
        {savingsGoal && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">
                {isSavingsComplete ? '✓ Objectif atteint' : 'Progression'}
              </span>
              <span className={cn(
                "text-xs font-semibold",
                isSavingsComplete ? "text-envelope-green" : "text-foreground"
              )}>
                {Math.round(savingsPercent)}%
              </span>
            </div>
            <Progress 
              value={Math.min(savingsPercent, 100)} 
              className="h-2 [&>div]:transition-colors"
              style={{ '--progress-color': progressColor } as React.CSSProperties}
            />
            {!isSavingsComplete && targetAmount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Reste {(targetAmount - netSavings).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} à épargner
              </p>
            )}
          </div>
        )}
        
        {/* Show withdrawals if any */}
        {spent > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Retraits : {spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
        )}
      </div>
      </EnvelopeQuickActions>
    );
  }
  
  // Render regular envelope
  return (
    <EnvelopeQuickActions
      envelope={envelope}
      onViewDetails={() => onClick()}
      onQuickAddExpense={onQuickAddExpense}
      onQuickAllocate={onQuickAllocate}
      onQuickTransfer={onQuickTransfer}
      onQuickDelete={onQuickDelete}
    >
    <div
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-card active:scale-[0.98]",
        "bg-card",
        colorStyle.border
      )}
    >
      <div className="flex items-start gap-3 overflow-hidden">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg",
          colorStyle.bg
        )}>
          <DynamicIcon name={icon} className={cn("w-5 h-5", colorStyle.text)} />
        </div>
        
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground break-all">{name}</h3>
            {envelope.rollover && envelope.rolloverStrategy !== 'none' && (
              <Badge variant="secondary" className="flex items-center gap-1 text-[10px] px-1.5 py-0">
                📅
                {envelope.rolloverStrategy === 'percentage' && `${envelope.rolloverPercentage ?? 100}%`}
                {envelope.rolloverStrategy === 'capped' && envelope.maxRolloverAmount != null && `max ${envelope.maxRolloverAmount}€`}
                {envelope.rolloverStrategy === 'full' && 'Report'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / {allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
        
        <div className="text-right shrink-0">
          <p className={cn(
            "font-semibold text-lg",
            isOverspent ? "text-destructive" : "text-foreground"
          )}>
            {remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-xs text-muted-foreground">restant</p>
        </div>
      </div>
      
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Dépensé</span>
          <span className="text-xs font-semibold text-foreground">{Math.round(percentUsed)}%</span>
        </div>
        <Progress 
          value={Math.min(percentUsed, 100)} 
          className="h-2 [&>div]:transition-colors"
          style={{ '--progress-color': progressColor } as React.CSSProperties}
        />
        {isOverspent && (
          <p className="text-xs text-destructive mt-1 font-medium">
            Dépassement de {Math.abs(remaining).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        )}
      </div>
    </div>
    </EnvelopeQuickActions>
  );
});
