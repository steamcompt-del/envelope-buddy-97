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

export function HouseholdSwitcher() {
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
            className="gap-1.5 h-8 px-2 text-sm font-medium max-w-[180px]"
          >
            <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{household.name}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
