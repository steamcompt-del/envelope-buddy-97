import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useBudget } from '@/contexts/BudgetContext';
import { SortableEnvelopeCard } from './SortableEnvelopeCard';
import { Button } from '@/components/ui/button';
import { Plus, Wallet } from 'lucide-react';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';

interface EnvelopeGridProps {
  onEnvelopeClick: (envelopeId: string) => void;
  onCreateEnvelope: () => void;
}

export function EnvelopeGrid({ onEnvelopeClick, onCreateEnvelope }: EnvelopeGridProps) {
  const { envelopes, reorderEnvelopes } = useBudget();
  const { getGoalForEnvelope } = useSavingsGoals();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = envelopes.findIndex((e) => e.id === active.id);
      const newIndex = envelopes.findIndex((e) => e.id === over.id);
      
      const newOrder = arrayMove(envelopes, oldIndex, newIndex);
      reorderEnvelopes(newOrder.map(e => e.id));
    }
  }, [envelopes, reorderEnvelopes]);
  
  if (envelopes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
          <Wallet className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Aucune enveloppe</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Créez votre première enveloppe pour commencer à organiser votre budget.
        </p>
        <Button onClick={onCreateEnvelope} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          Créer une enveloppe
        </Button>
      </div>
    );
  }
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={envelopes.map(e => e.id)} strategy={rectSortingStrategy}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {envelopes.map((envelope, index) => (
            <div 
              key={envelope.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <SortableEnvelopeCard
                envelope={envelope}
                onClick={() => onEnvelopeClick(envelope.id)}
                savingsGoal={getGoalForEnvelope(envelope.id)}
              />
            </div>
          ))}
          
          <button
            onClick={onCreateEnvelope}
            className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 min-h-[120px]"
          >
            <Plus className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Nouvelle enveloppe</span>
          </button>
        </div>
      </SortableContext>
    </DndContext>
  );
}
