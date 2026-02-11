import { Envelope } from '@/contexts/BudgetContext';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { 
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet
} from 'lucide-react';
import { ComponentType } from 'react';
import { SavingsGoal, SavingsPriority } from '@/lib/savingsGoalsDb';

interface EnvelopeCardProps {
  envelope: Envelope;
  onClick: () => void;
  savingsGoal?: SavingsGoal;
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Wallet;
  return <Icon className={className} />;
}

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

function getProgressColorHsl(percentUsed: number, isOverspent: boolean): string {
  if (isOverspent) return "hsl(0 84% 60%)";
  if (percentUsed >= 80) return "hsl(25 95% 53%)";
  if (percentUsed >= 50) return "hsl(45 93% 47%)";
  return "hsl(160 84% 45%)";
}

function getSavingsProgressColorHsl(percent: number): string {
  if (percent >= 100) return "hsl(160 84% 45%)";
  if (percent >= 75) return "hsl(160 84% 45%)";
  if (percent >= 50) return "hsl(45 93% 47%)";
  return "hsl(25 95% 53%)";
}

const PRIORITY_BADGE: Record<SavingsPriority, { emoji: string; label: string; className: string }> = {
  essential: { emoji: '🔴', label: 'Essentiel', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  high: { emoji: '🟠', label: 'Haute', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  medium: { emoji: '🟡', label: 'Moyenne', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  low: { emoji: '🟢', label: 'Basse', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
};

/* ─── Segmented Progress Bar ─────────────────────────────── */
function SegmentedProgress({ value, color, className }: { value: number; color: string; className?: string }) {
  const segments = 20;
  const filledCount = Math.round((Math.min(value, 100) / 100) * segments);

  return (
    <div className={cn("flex gap-[3px]", className)}>
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-2 rounded-[2px] transition-colors duration-300"
          style={{
            backgroundColor: i < filledCount ? color : 'hsl(var(--muted))',
          }}
        />
      ))}
    </div>
  );
}

export function EnvelopeCard({ envelope, onClick, savingsGoal }: EnvelopeCardProps) {
  const { name, allocated, spent, icon, color } = envelope;

  const isSavings = icon === 'PiggyBank';
  const colorStyle = colorClasses[color] || colorClasses.blue;

  const netSavings = allocated - spent;
  const remaining = allocated - spent;
  const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0;
  const isOverspent = !isSavings && spent > allocated;

  const targetAmount = savingsGoal?.target_amount || 0;
  const savingsPercent = targetAmount > 0
    ? Math.min((netSavings / targetAmount) * 100, 100)
    : 0;
  const isSavingsComplete = targetAmount > 0 && netSavings >= targetAmount;

  const progressColor = isSavings
    ? getSavingsProgressColorHsl(savingsPercent)
    : getProgressColorHsl(percentUsed, isOverspent);

  // Detect rollover from previous month (rollover enabled + has allocations)
  const hasRollover = envelope.rollover && envelope.rolloverStrategy !== 'none';

  /* ─── Savings card ─── */
  if (isSavings) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full p-4 rounded-xl border text-left transition-all duration-200",
          "hover:scale-[1.02] hover:shadow-card active:scale-95",
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
              {hasRollover && (
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
            <SegmentedProgress value={savingsPercent} color={progressColor} />
            {!isSavingsComplete && targetAmount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Reste {(targetAmount - netSavings).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} à épargner
              </p>
            )}
          </div>
        )}

        {spent > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Retraits : {spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
        )}
      </button>
    );
  }

  /* ─── Regular envelope card ─── */
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-card active:scale-95",
        "bg-card",
        isOverspent
          ? "border-destructive animate-pulse"
          : colorStyle.border
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
            {hasRollover && (
              <Badge variant="secondary" className="flex items-center gap-1 text-[10px] px-1.5 py-0">
                <ArrowRight className="w-3 h-3" />
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
        <SegmentedProgress value={percentUsed} color={progressColor} />
        {isOverspent && (
          <p className="text-xs text-destructive mt-1 font-medium">
            Dépassement de {Math.abs(remaining).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        )}
      </div>
    </button>
  );
}
