import { useState, useRef, useCallback, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable pull-to-refresh when scrolled to top
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      // Apply resistance as pull increases
      const resistance = 1 - Math.min(diff / (MAX_PULL * 2), 0.5);
      const adjustedDiff = Math.min(diff * resistance, MAX_PULL);
      setPullDistance(adjustedDiff);
      
      // Prevent default scroll when pulling
      if (adjustedDiff > 10) {
        e.preventDefault();
      }
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep indicator visible during refresh
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const shouldTrigger = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto overflow-x-hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center transition-opacity duration-200 z-50 pointer-events-none",
          pullDistance > 10 || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: Math.max(pullDistance - 50, 8),
          height: 40,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-lg transition-all duration-200",
            shouldTrigger || isRefreshing ? "border-primary" : "border-muted"
          )}
        >
          <RefreshCw
            className={cn(
              "w-5 h-5 transition-all duration-200",
              isRefreshing ? "animate-spin text-primary" : "text-muted-foreground",
              shouldTrigger && !isRefreshing && "text-primary"
            )}
            style={{
              transform: isRefreshing
                ? undefined
                : `rotate(${progress * 180}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transitionDuration: isPulling.current ? '0ms' : '200ms',
        }}
      >
        {children}
      </div>
    </div>
  );
}
