import { Transaction } from '@/contexts/BudgetContext';
import { Checkbox } from '@/components/ui/checkbox';
import { SplitBadge } from '@/components/budget/SplitBadge';
import { cn } from '@/lib/utils';
import { ImageIcon, Wallet, ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, Coffee } from 'lucide-react';
import { ComponentType } from 'react';

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag,
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone,
  Coffee, Wallet,
};

const colorClasses: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-envelope-blue/15', text: 'text-envelope-blue' },
  green: { bg: 'bg-envelope-green/15', text: 'text-envelope-green' },
  orange: { bg: 'bg-envelope-orange/15', text: 'text-envelope-orange' },
  pink: { bg: 'bg-envelope-pink/15', text: 'text-envelope-pink' },
  purple: { bg: 'bg-envelope-purple/15', text: 'text-envelope-purple' },
  yellow: { bg: 'bg-envelope-yellow/15', text: 'text-envelope-yellow' },
  red: { bg: 'bg-envelope-red/15', text: 'text-envelope-red' },
  teal: { bg: 'bg-envelope-teal/15', text: 'text-envelope-teal' },
};

export interface TransactionWithEnvelope extends Transaction {
  envelope?: { id: string; name: string; icon: string; color: string };
  isWithdrawal?: boolean;
}

interface Props {
  transaction: TransactionWithEnvelope;
  hasReceipts: boolean;
  bulkMode: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onEdit: (t: TransactionWithEnvelope) => void;
  onOpenReceipt: (t: TransactionWithEnvelope) => void;
}

export function TransactionRow({ transaction: t, hasReceipts, bulkMode, selected, onSelect, onEdit, onOpenReceipt }: Props) {
  const colorStyle = t.envelope ? colorClasses[t.envelope.color] || colorClasses.blue : colorClasses.blue;
  const Icon = iconMap[t.envelope?.icon || 'Wallet'] || Wallet;

  return (
    <button
      onClick={() => bulkMode ? onSelect(t.id) : onEdit(t)}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-muted/50 text-left",
        t.isWithdrawal ? "bg-primary/5 border-primary/20" : "bg-card",
        selected && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      {bulkMode && (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(t.id)}
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0"
        />
      )}

      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colorStyle.bg)}>
        <Icon className={cn("w-5 h-5", colorStyle.text)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{t.merchant || t.description}</p>
          {t.isSplit && <SplitBadge transactionId={t.id} totalAmount={t.amount} compact />}
          {t.isWithdrawal && !t.isSplit && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/15 text-primary flex-shrink-0">Retrait</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t.envelope?.name || 'Sans catégorie'}</span>
          {t.merchant && t.description && t.merchant !== t.description && (
            <><span>•</span><span className="truncate">{t.description}</span></>
          )}
        </div>
        {t.notes && <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{t.notes}</p>}
      </div>

      {hasReceipts && (
        <div onClick={e => { e.stopPropagation(); onOpenReceipt(t); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      <p className="font-semibold flex-shrink-0 text-destructive">
        {t.isWithdrawal ? '' : '-'}{t.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
      </p>
    </button>
  );
}
