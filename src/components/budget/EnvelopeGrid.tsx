import { useCallback, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useBudget, EnvelopeCategory } from '@/contexts/BudgetContext';
import { SortableEnvelopeCard } from './SortableEnvelopeCard';
import { EnvelopeCard } from './EnvelopeCard';
import { Button } from '@/components/ui/button';
import { Plus, Wallet, Sparkles, Undo2 } from 'lucide-react';
import { SavingsGoal } from '@/lib/savingsGoalsDb';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { EnvelopeQuickActionHandlers } from './EnvelopeQuickActions';

interface EnvelopeGridProps extends EnvelopeQuickActionHandlers {
  onEnvelopeClick: (envelopeId: string) => void;
  onCreateEnvelope: () => void;
  getGoalForEnvelope: (envelopeId: string) => SavingsGoal | undefined;
}

const CATEGORY_CONFIG: Record<EnvelopeCategory, { label: string; bg: string; border: string; icon: string }> = {
  essentiels: {
    label: 'Essentiels',
    bg: 'bg-blue-500/5 dark:bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: '🏠',
  },
  lifestyle: {
    label: 'Lifestyle',
    bg: 'bg-purple-500/5 dark:bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: '✨',
  },
  epargne: {
    label: 'Épargne',
    bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: '🐷',
  },
};

const CATEGORY_ORDER: EnvelopeCategory[] = ['essentiels', 'lifestyle', 'epargne'];

// Haptic feedback helper
function triggerHaptic(style: 'light' | 'medium' = 'light') {
  if ('vibrate' in navigator) {
    navigator.vibrate(style === 'light' ? 10 : 25);
  }
}

export function EnvelopeGrid({ onEnvelopeClick, onCreateEnvelope, getGoalForEnvelope, onQuickAddExpense, onQuickAllocate, onQuickTransfer, onQuickDelete }: EnvelopeGridProps) {
  const { envelopes, reorderEnvelopes, updateEnvelope } = useBudget();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previousOrder, setPreviousOrder] = useState<string[] | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group envelopes by category
  const groupedEnvelopes = useMemo(() => {
    const groups: Record<EnvelopeCategory, typeof envelopes> = {
      essentiels: [],
      lifestyle: [],
      epargne: [],
    };
    for (const env of envelopes) {
      const cat = env.category || 'essentiels';
      groups[cat].push(env);
    }
    return groups;
  }, [envelopes]);

  // Check if we have multiple categories with envelopes
  const activeCategories = CATEGORY_ORDER.filter(cat => groupedEnvelopes[cat].length > 0);
  const showCategories = activeCategories.length > 1 || envelopes.some(e => e.category !== 'essentiels');

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    triggerHaptic('light');
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      const oldIndex = envelopes.findIndex((e) => e.id === active.id);
      const newIndex = envelopes.findIndex((e) => e.id === over.id);
      
      // Save previous order for undo
      const prevIds = envelopes.map(e => e.id);
      setPreviousOrder(prevIds);
      
      // Clear any existing undo timer
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setPreviousOrder(null), 5000);

      // If dragged into a different category section, update the envelope's category
      const draggedEnvelope = envelopes.find(e => e.id === active.id);
      const targetEnvelope = envelopes.find(e => e.id === over.id);
      if (draggedEnvelope && targetEnvelope && draggedEnvelope.category !== targetEnvelope.category) {
        updateEnvelope(draggedEnvelope.id, { category: targetEnvelope.category } as any);
      }
      
      const newOrder = arrayMove(envelopes, oldIndex, newIndex);
      reorderEnvelopes(newOrder.map(e => e.id));
      triggerHaptic('medium');
    }
  }, [envelopes, reorderEnvelopes, updateEnvelope]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (previousOrder) {
      reorderEnvelopes(previousOrder);
      setPreviousOrder(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      toast.success('Ordre restauré');
    }
  }, [previousOrder, reorderEnvelopes]);

  const activeEnvelope = activeId ? envelopes.find(e => e.id === activeId) : null;
  
  if (envelopes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
          <Wallet className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Aucune enveloppe</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Créez votre première enveloppe ou laissez l'IA vous aider.
        </p>
        <div className="flex gap-3">
          <Button onClick={onCreateEnvelope} variant="outline" className="rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Créer manuellement
          </Button>
          <Link to="/planning">
            <Button className="rounded-xl gap-2">
              <Sparkles className="w-4 h-4" />
              Assistant IA
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {/* Undo toast */}
      {previousOrder && (
        <div className="sticky top-0 z-30 mb-3 animate-fade-in">
          <button
            onClick={handleUndo}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-button hover:opacity-90 transition-opacity"
          >
            <Undo2 className="w-4 h-4" />
            Annuler la réorganisation
          </button>
        </div>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      >
        <SortableContext items={envelopes.map(e => e.id)} strategy={rectSortingStrategy}>
          {showCategories ? (
            <div className="space-y-4">
              {CATEGORY_ORDER.map(category => {
                const config = CATEGORY_CONFIG[category];
                const categoryEnvelopes = groupedEnvelopes[category];
                
                if (categoryEnvelopes.length === 0 && category !== 'essentiels') return null;
                
                return (
                  <div
                    key={category}
                    className={cn(
                      "rounded-2xl border p-3 transition-colors",
                      config.bg,
                      config.border,
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="text-base">{config.icon}</span>
                      <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
                      <span className="text-xs text-muted-foreground">({categoryEnvelopes.length})</span>
                    </div>
                    
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryEnvelopes.map((envelope, index) => (
                        <div 
                          key={envelope.id} 
                          className="animate-fade-in"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <SortableEnvelopeCard
                            envelope={envelope}
                            onClick={() => onEnvelopeClick(envelope.id)}
                            savingsGoal={getGoalForEnvelope(envelope.id)}
                            onQuickAddExpense={onQuickAddExpense}
                            onQuickAllocate={onQuickAllocate}
                            onQuickTransfer={onQuickTransfer}
                            onQuickDelete={onQuickDelete}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              <button
                onClick={onCreateEnvelope}
                className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 min-h-[120px] w-full"
              >
                <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Nouvelle enveloppe</span>
              </button>
            </div>
          ) : (
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
                    onQuickAddExpense={onQuickAddExpense}
                    onQuickAllocate={onQuickAllocate}
                    onQuickTransfer={onQuickTransfer}
                    onQuickDelete={onQuickDelete}
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
          )}
        </SortableContext>
        
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeEnvelope ? (
            <div className="opacity-80 scale-105 shadow-2xl rounded-xl rotate-[2deg] transition-transform">
              <EnvelopeCard 
                envelope={activeEnvelope} 
                onClick={() => {}} 
                savingsGoal={getGoalForEnvelope(activeEnvelope.id)} 
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
