import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { RolloverStrategy } from '@/contexts/BudgetContext';

interface RolloverConfigSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  strategy: RolloverStrategy;
  onStrategyChange: (strategy: RolloverStrategy) => void;
  percentage: number;
  onPercentageChange: (value: number) => void;
  maxAmount: string;
  onMaxAmountChange: (value: string) => void;
}

export function RolloverConfigSection({
  enabled,
  onEnabledChange,
  strategy,
  onStrategyChange,
  percentage,
  onPercentageChange,
  maxAmount,
  onMaxAmountChange,
}: RolloverConfigSectionProps) {
  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center justify-between">
        <Label htmlFor="rollover-toggle" className="flex items-center gap-2 cursor-pointer">
          📅 Reporter automatiquement le solde
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                <p className="text-xs">Le solde restant sera automatiquement reporté au mois suivant selon la stratégie choisie.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Switch
          id="rollover-toggle"
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {enabled && (
        <div className="space-y-3 pl-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Stratégie de report</Label>
            <Select value={strategy} onValueChange={(v) => onStrategyChange(v as RolloverStrategy)}>
              <SelectTrigger className="rounded-xl h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Total — 100% du solde</SelectItem>
                <SelectItem value="percentage">Pourcentage — X% du solde</SelectItem>
                <SelectItem value="capped">Plafonné — jusqu'à X€</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {strategy === 'percentage' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Pourcentage à reporter</Label>
                <span className="text-sm font-medium">{percentage}%</span>
              </div>
              <Slider
                value={[percentage]}
                onValueChange={([v]) => onPercentageChange(v)}
                min={0}
                max={100}
                step={5}
              />
            </div>
          )}

          {strategy === 'capped' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Montant maximum (€)</Label>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 200"
                  value={maxAmount}
                  onChange={(e) => onMaxAmountChange(e.target.value)}
                  className="rounded-xl pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
