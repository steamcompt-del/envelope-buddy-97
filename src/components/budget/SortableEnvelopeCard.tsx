import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Envelope } from '@/contexts/BudgetContext';
import { EnvelopeCard } from './EnvelopeCard';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableEnvelopeCardProps {
  envelope: Envelope;
  onClick: () => void;
}

export function SortableEnvelopeCard({ envelope, onClick }: SortableEnvelopeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: envelope.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50 opacity-90"
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
      
      <EnvelopeCard envelope={envelope} onClick={onClick} />
    </div>
  );
}
