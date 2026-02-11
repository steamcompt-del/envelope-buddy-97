import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Receipt, Plus, ArrowRightLeft, Trash2, Edit,
  PiggyBank, Eye,
} from 'lucide-react';
import { Envelope } from '@/contexts/BudgetContext';
import { cn } from '@/lib/utils';

export interface EnvelopeQuickActionHandlers {
  onQuickAddExpense?: (envelopeId: string) => void;
  onQuickAllocate?: (envelopeId: string) => void;
  onQuickTransfer?: (envelopeId: string) => void;
  onQuickDelete?: (envelopeId: string) => void;
}

interface EnvelopeQuickActionsProps extends EnvelopeQuickActionHandlers {
  envelope: Envelope;
  children: React.ReactNode;
  onViewDetails?: (envelopeId: string) => void;
}

export function EnvelopeQuickActions({
  envelope,
  children,
  onQuickAddExpense,
  onQuickAllocate,
  onQuickTransfer,
  onQuickDelete,
  onViewDetails,
}: EnvelopeQuickActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartTime = useRef(0);
  const touchMoved = useRef(false);

  const isSavings = envelope.icon === 'PiggyBank';

  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    touchStartTime.current = Date.now();
    touchMoved.current = false;

    longPressTimer.current = setTimeout(() => {
      vibrate();
      setShowMenu(true);
    }, 500);
  }, [vibrate]);

  const handleTouchMove = useCallback(() => {
    touchMoved.current = true;
    clearTimer();
  }, [clearTimer]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearTimer();
    const elapsed = Date.now() - touchStartTime.current;

    // Short tap → view details (only if menu not open and no drag)
    if (elapsed < 500 && !showMenu && !touchMoved.current) {
      onViewDetails?.(envelope.id);
    }
  }, [clearTimer, showMenu, onViewDetails, envelope.id]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    vibrate();
    setShowMenu(true);
  }, [vibrate]);

  // Cleanup
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const handleAction = useCallback((action: ((id: string) => void) | undefined) => {
    setShowMenu(false);
    action?.(envelope.id);
  }, [envelope.id]);

  return (
    <Popover open={showMenu} onOpenChange={setShowMenu}>
      <PopoverTrigger asChild>
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={handleContextMenu}
          className="relative select-none"
        >
          {children}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-52 p-1.5"
        align="center"
        side="top"
        sideOffset={4}
      >
        <div className="flex flex-col gap-0.5">
          {/* Primary action */}
          {isSavings ? (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 h-9 text-sm font-medium"
              onClick={() => handleAction(onQuickAllocate)}
            >
              <PiggyBank className="h-4 w-4 text-primary" />
              Épargner
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 h-9 text-sm font-medium"
              onClick={() => handleAction(onQuickAddExpense)}
            >
              <Receipt className="h-4 w-4 text-primary" />
              Ajouter dépense
            </Button>
          )}

          {/* Allocate (for non-savings) */}
          {!isSavings && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 h-9 text-sm"
              onClick={() => handleAction(onQuickAllocate)}
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              Allouer des fonds
            </Button>
          )}

          {/* Transfer */}
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 h-9 text-sm"
            onClick={() => handleAction(onQuickTransfer)}
          >
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            Transférer
          </Button>

          {/* View details */}
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 h-9 text-sm"
            onClick={() => handleAction(onViewDetails)}
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
            Voir détails
          </Button>

          <Separator className="my-1" />

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 h-9 text-sm text-destructive hover:text-destructive"
            onClick={() => handleAction(onQuickDelete)}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
