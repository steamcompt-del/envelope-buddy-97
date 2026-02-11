import { useRef, useState, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Trash2, Pencil } from 'lucide-react';

interface SwipeableRowProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  editIcon?: ReactNode;
  editClassName?: string;
  className?: string;
}

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 70;

export function SwipeableRow({ children, onEdit, onDelete, editLabel, editIcon, editClassName, className }: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const isDragging = useRef(false);
  
  const hasLeftAction = !!onEdit;
  const hasRightAction = !!onDelete;
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
    isDragging.current = false;
  }, [offset]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Require some movement before starting swipe
    if (Math.abs(diff) > 10) {
      isDragging.current = true;
    }
    
    if (!isDragging.current) return;
    
    let newOffset = startOffset.current + diff;
    
    // Limit swipe based on available actions
    if (!hasLeftAction && newOffset > 0) newOffset = 0;
    if (!hasRightAction && newOffset < 0) newOffset = 0;
    
    // Apply resistance at edges
    const maxOffset = hasLeftAction ? ACTION_WIDTH : 0;
    const minOffset = hasRightAction ? -ACTION_WIDTH : 0;
    
    if (newOffset > maxOffset) {
      newOffset = maxOffset + (newOffset - maxOffset) * 0.2;
    } else if (newOffset < minOffset) {
      newOffset = minOffset + (newOffset - minOffset) * 0.2;
    }
    
    setOffset(newOffset);
  }, [hasLeftAction, hasRightAction]);
  
  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) {
      // If not dragging, close if open and let click through
      if (isOpen) {
        setOffset(0);
        setIsOpen(null);
      }
      return;
    }
    
    // Determine final position based on swipe distance
    if (offset > SWIPE_THRESHOLD && hasLeftAction) {
      setOffset(ACTION_WIDTH);
      setIsOpen('left');
    } else if (offset < -SWIPE_THRESHOLD && hasRightAction) {
      setOffset(-ACTION_WIDTH);
      setIsOpen('right');
    } else {
      setOffset(0);
      setIsOpen(null);
    }
    
    isDragging.current = false;
  }, [offset, hasLeftAction, hasRightAction, isOpen]);
  
  const handleActionClick = useCallback((action: 'edit' | 'delete') => {
    // Reset position
    setOffset(0);
    setIsOpen(null);
    
    // Execute action after a small delay
    setTimeout(() => {
      if (action === 'edit' && onEdit) onEdit();
      if (action === 'delete' && onDelete) onDelete();
    }, 150);
  }, [onEdit, onDelete]);
  
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    // If row is open, close it and prevent click through
    if (isOpen) {
      e.preventDefault();
      e.stopPropagation();
      setOffset(0);
      setIsOpen(null);
    }
  }, [isOpen]);
  
  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden rounded-lg", className)}
    >
      {/* Left action (Edit) */}
      {hasLeftAction && (
        <button
          onClick={() => handleActionClick('edit')}
          className={cn(
            "absolute left-0 top-0 bottom-0 flex items-center justify-center",
            "transition-all touch-manipulation",
            editClassName || "bg-primary text-primary-foreground"
          )}
          style={{ 
            width: ACTION_WIDTH,
            opacity: offset > 0 ? 1 : 0,
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {editIcon || <Pencil className="w-5 h-5" />}
            <span className="text-xs font-medium">{editLabel || 'Modifier'}</span>
          </div>
        </button>
      )}
      
      {/* Right action (Delete) */}
      {hasRightAction && (
        <button
          onClick={() => handleActionClick('delete')}
          className={cn(
            "absolute right-0 top-0 bottom-0 flex items-center justify-center",
            "bg-destructive text-destructive-foreground transition-all",
            "touch-manipulation"
          )}
          style={{ 
            width: ACTION_WIDTH,
            opacity: offset < 0 ? 1 : 0,
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <Trash2 className="w-5 h-5" />
            <span className="text-xs font-medium">Supprimer</span>
          </div>
        </button>
      )}
      
      {/* Content */}
      <div
        className={cn(
          "relative bg-muted/50 transition-transform",
          isDragging.current ? "transition-none" : "transition-transform duration-200 ease-out"
        )}
        style={{ 
          transform: `translateX(${offset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
