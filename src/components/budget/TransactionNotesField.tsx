import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MessageSquare, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionNotesFieldProps {
  notes?: string;
  onSave: (notes: string) => void;
  isEditing?: boolean;
  compact?: boolean;
}

export function TransactionNotesField({ 
  notes, 
  onSave, 
  isEditing = false,
  compact = false 
}: TransactionNotesFieldProps) {
  const [localNotes, setLocalNotes] = useState(notes || '');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setLocalNotes(notes || '');
  }, [notes]);

  if (isEditing) {
    return (
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          Notes
        </Label>
        <Textarea
          value={localNotes}
          onChange={(e) => {
            setLocalNotes(e.target.value);
            onSave(e.target.value);
          }}
          placeholder="Ajouter un commentaire..."
          className="min-h-[60px] text-sm rounded-lg resize-none"
        />
      </div>
    );
  }

  // Display mode (non-editing)
  if (!notes) return null;

  return (
    <div className={cn(
      "mt-1",
      compact && "max-w-full"
    )}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-start gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span className={cn(
          "text-left",
          !isExpanded && "line-clamp-1"
        )}>
          {notes}
        </span>
      </button>
    </div>
  );
}
