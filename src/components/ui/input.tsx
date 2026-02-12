import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onFocus, onBlur, ...props }, ref) => {
    // Handle focus to prevent scroll jump on mobile
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      // Small delay to let the keyboard appear before any scroll adjustment
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      onFocus?.(e);
    }, [onFocus]);

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        onFocus={handleFocus}
        onBlur={onBlur}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
