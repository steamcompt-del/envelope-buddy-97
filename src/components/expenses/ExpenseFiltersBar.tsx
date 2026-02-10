import { useBudget, Envelope } from '@/contexts/BudgetContext';
import { ExpenseFilters } from '@/hooks/useExpenseFilters';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronDown, Filter, CalendarIcon, RotateCcw, ImageIcon,
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag,
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone,
  Coffee, Wallet,
} from 'lucide-react';
import { ComponentType, useState } from 'react';

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag,
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone,
  Coffee, Wallet,
};

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-envelope-blue/15', text: 'text-envelope-blue', border: 'border-envelope-blue' },
  green: { bg: 'bg-envelope-green/15', text: 'text-envelope-green', border: 'border-envelope-green' },
  orange: { bg: 'bg-envelope-orange/15', text: 'text-envelope-orange', border: 'border-envelope-orange' },
  pink: { bg: 'bg-envelope-pink/15', text: 'text-envelope-pink', border: 'border-envelope-pink' },
  purple: { bg: 'bg-envelope-purple/15', text: 'text-envelope-purple', border: 'border-envelope-purple' },
  yellow: { bg: 'bg-envelope-yellow/15', text: 'text-envelope-yellow', border: 'border-envelope-yellow' },
  red: { bg: 'bg-envelope-red/15', text: 'text-envelope-red', border: 'border-envelope-red' },
  teal: { bg: 'bg-envelope-teal/15', text: 'text-envelope-teal', border: 'border-envelope-teal' },
};

interface Props {
  filters: ExpenseFilters;
  activeFilterCount: number;
  onToggleEnvelope: (id: string) => void;
  onUpdateFilter: <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) => void;
  onReset: () => void;
  members?: { id: string; name: string }[];
  onToggleMember: (id: string) => void;
}

export function ExpenseFiltersBar({
  filters, activeFilterCount, onToggleEnvelope, onUpdateFilter, onReset, members, onToggleMember,
}: Props) {
  const { envelopes } = useBudget();
  const [open, setOpen] = useState(activeFilterCount > 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between rounded-xl gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtres</span>
            {activeFilterCount > 0 && (
              <Badge variant="default" className="h-5 min-w-5 px-1.5 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-4 animate-fade-in">
        {/* Envelope chips */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Enveloppes</Label>
          <div className="flex flex-wrap gap-1.5">
            {envelopes.map(env => {
              const selected = filters.envelopeIds.includes(env.id);
              const color = colorClasses[env.color] || colorClasses.blue;
              const Icon = iconMap[env.icon] || Wallet;
              return (
                <button
                  key={env.id}
                  onClick={() => onToggleEnvelope(env.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                    selected
                      ? `${color.bg} ${color.text} ${color.border}`
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {env.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount range */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Montant (€)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.amountMin}
              onChange={e => onUpdateFilter('amountMin', e.target.value)}
              className="rounded-xl h-9 text-sm"
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.amountMax}
              onChange={e => onUpdateFilter('amountMax', e.target.value)}
              className="rounded-xl h-9 text-sm"
            />
          </div>
        </div>

        {/* Date range */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Période</Label>
          <div className="flex gap-2">
            <DatePickerButton
              label="Du"
              value={filters.dateFrom}
              onChange={d => onUpdateFilter('dateFrom', d)}
            />
            <DatePickerButton
              label="Au"
              value={filters.dateTo}
              onChange={d => onUpdateFilter('dateTo', d)}
            />
          </div>
        </div>

        {/* Receipt toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm">Avec ticket uniquement</Label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateFilter('hasReceipt', filters.hasReceipt === 'yes' ? 'all' : 'yes')}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                filters.hasReceipt === 'yes'
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-muted/50 text-muted-foreground border-transparent"
              )}
            >
              Oui
            </button>
            <button
              onClick={() => onUpdateFilter('hasReceipt', filters.hasReceipt === 'no' ? 'all' : 'no')}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                filters.hasReceipt === 'no'
                  ? "bg-destructive/15 text-destructive border-destructive/30"
                  : "bg-muted/50 text-muted-foreground border-transparent"
              )}
            >
              Non
            </button>
          </div>
        </div>

        {/* Members filter */}
        {members && members.length > 1 && (
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Membre</Label>
            <div className="flex flex-wrap gap-1.5">
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => onToggleMember(m.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                    filters.memberIds.includes(m.id)
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reset */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="w-full text-muted-foreground gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser les filtres
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function DatePickerButton({ label, value, onChange }: { label: string; value?: Date; onChange: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn(
          "flex-1 justify-start text-left font-normal rounded-xl h-9 text-xs",
          !value && "text-muted-foreground"
        )}>
          <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
          {value ? format(value, 'd MMM yyyy', { locale: fr }) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={fr}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
