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
      {...attributes}
      {...listeners}
      className={cn(
        "relative group cursor-grab active:cursor-grabbing touch-none",
        isDragging && "z-50 opacity-90"
      )}
    >
      {/* Visual grip indicator */}
      <div className={cn(
        "absolute -left-2 top-1/2 -translate-y-1/2 z-10",
        "w-8 h-10 flex items-center justify-center",
        "text-muted-foreground/50 group-hover:text-muted-foreground",
        "opacity-0 group-hover:opacity-100 transition-opacity",
        "pointer-events-none"
      )}>
        <GripVertical className="w-5 h-5" />
      </div>
      
      <EnvelopeCard envelope={envelope} onClick={onClick} />
    </div>
  );
}
