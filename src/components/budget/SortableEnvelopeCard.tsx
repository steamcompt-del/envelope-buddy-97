import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Envelope } from '@/contexts/BudgetContext';
import { EnvelopeCard } from './EnvelopeCard';
import { EnvelopeQuickActionHandlers } from './EnvelopeQuickActions';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SavingsGoal } from '@/lib/savingsGoalsDb';

interface SortableEnvelopeCardProps extends EnvelopeQuickActionHandlers {
  envelope: Envelope;
  onClick: () => void;
  savingsGoal?: SavingsGoal;
}

export function SortableEnvelopeCard({ envelope, onClick, savingsGoal, onQuickAddExpense, onQuickAllocate, onQuickTransfer, onQuickDelete }: SortableEnvelopeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: envelope.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-0",
        isOver && "before:content-[''] before:absolute before:-top-1.5 before:left-2 before:right-2 before:h-[3px] before:rounded-full before:bg-primary before:z-20 before:animate-pulse"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -left-2 top-1/2 -translate-y-1/2 z-10",
          "w-8 h-10 flex items-center justify-center",
          "text-muted-foreground/50 hover:text-muted-foreground",
          "cursor-grab active:cursor-grabbing",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "touch-none"
        )}
        aria-label="Réorganiser"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      
      <EnvelopeCard 
        envelope={envelope} 
        onClick={onClick} 
        savingsGoal={savingsGoal}
        onQuickAddExpense={onQuickAddExpense}
        onQuickAllocate={onQuickAllocate}
        onQuickTransfer={onQuickTransfer}
        onQuickDelete={onQuickDelete}
      />
    </div>
  );
}
