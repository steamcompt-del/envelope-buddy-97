import { Plus, Receipt, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FabButtonProps {
  onAddExpense: () => void;
  onScanReceipt: () => void;
}

export function FabButton({ onAddExpense, onScanReceipt }: FabButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full gradient-primary shadow-fab hover:scale-105 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl">
          <DropdownMenuItem
            onClick={onAddExpense}
            className="gap-3 py-3 cursor-pointer"
          >
            <Receipt className="w-5 h-5" />
            <span>Ajouter Dépense</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onScanReceipt}
            className="gap-3 py-3 cursor-pointer"
          >
            <Camera className="w-5 h-5" />
            <span>Scanner Ticket</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
