import { cn } from '@/lib/utils';
import { useBudget } from '@/contexts/BudgetContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Home, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import { HouseholdSetupDialog } from './HouseholdSetupDialog';

interface HouseholdSwitcherProps {
  compact?: boolean;
}

export function HouseholdSwitcher({ compact = false }: HouseholdSwitcherProps) {
  const { household, households, switchHousehold, createHousehold, joinHousehold } = useBudget();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  if (!household) return null;
  
  const hasMultipleHouseholds = households.length > 1;
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "gap-1.5 font-medium",
              compact ? "h-7 px-1.5 text-xs max-w-[120px]" : "h-8 px-2 text-sm max-w-[180px]"
            )}
          >
            <Home className={cn("shrink-0 text-muted-foreground", compact ? "h-3 w-3" : "h-4 w-4")} />
            <span className="truncate">{household.name}</span>
            <ChevronDown className={cn("shrink-0 text-muted-foreground", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {households.map((h) => (
            <DropdownMenuItem
              key={h.id}
              onClick={() => switchHousehold(h.id)}
              className="gap-2"
            >
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{h.name}</span>
              {h.id === household.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setAddDialogOpen(true)}
            className="gap-2 text-primary"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter un ménage</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Dialog to create or join another household */}
      <HouseholdSetupDialog
        open={addDialogOpen}
        onCreateHousehold={async (name) => {
          await createHousehold(name);
          setAddDialogOpen(false);
        }}
        onJoinHousehold={async (code) => {
          await joinHousehold(code);
          setAddDialogOpen(false);
        }}
        onClose={() => setAddDialogOpen(false)}
        isAdditional
      />
    </>
  );
}
