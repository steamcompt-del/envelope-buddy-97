import { Envelope } from '@/contexts/BudgetContext';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet
} from 'lucide-react';
import { ComponentType } from 'react';

interface EnvelopeCardProps {
  envelope: Envelope;
  onClick: () => void;
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

// Get progress bar color based on percentage used
function getProgressColor(percent: number): string {
  if (percent >= 100) return '[&>div]:bg-red-500';
  if (percent >= 85) return '[&>div]:bg-orange-500';
  if (percent >= 70) return '[&>div]:bg-amber-500';
  if (percent >= 50) return '[&>div]:bg-yellow-500';
  if (percent >= 30) return '[&>div]:bg-lime-500';
  return '[&>div]:bg-green-500';
}

export function EnvelopeCard({ envelope, onClick }: EnvelopeCardProps) {
  const { name, allocated, spent, icon, color } = envelope;
  
  const remaining = allocated - spent;
  const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0;
  const isOverspent = spent > allocated;
  
  const colorStyle = colorClasses[color] || colorClasses.blue;
  const progressColor = getProgressColor(percentUsed);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-card active:scale-[0.98]",
        "bg-card",
        colorStyle.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg",
          colorStyle.bg
        )}>
          <DynamicIcon name={icon} className={cn("w-5 h-5", colorStyle.text)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{name}</h3>
          <p className="text-sm text-muted-foreground">
            {spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / {allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
        
        <div className="text-right">
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
        <Progress 
          value={Math.min(percentUsed, 100)} 
          className={cn("h-2", progressColor)}
        />
        {isOverspent && (
          <p className="text-xs text-destructive mt-1 font-medium">
            Dépassement de {Math.abs(remaining).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        )}
      </div>
    </button>
  );
}
