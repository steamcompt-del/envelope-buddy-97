import { useState, useCallback } from 'react';
import { Camera, X, Zap, Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SpeedDialAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}

interface FabButtonProps {
  onAddExpense: () => void;
  onScanReceipt: () => void;
  onAddIncome?: () => void;
}

export function FabButton({ onAddExpense, onScanReceipt, onAddIncome }: FabButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  const handleAction = useCallback((action: () => void) => {
    setIsOpen(false);
    action();
  }, []);

  const actions: SpeedDialAction[] = [
    {
      icon: <Camera className="w-5 h-5" />,
      label: 'Scan Ticket',
      onClick: () => handleAction(onScanReceipt),
      color: 'bg-primary text-primary-foreground',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      label: 'Dépense Rapide',
      onClick: () => handleAction(onAddExpense),
      color: 'bg-destructive text-destructive-foreground',
    },
    ...(onAddIncome
      ? [{
          icon: <Wallet className="w-5 h-5" />,
          label: 'Nouveau Revenu',
          onClick: () => handleAction(onAddIncome),
          color: 'bg-envelope-green text-white',
        }]
      : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-24 right-6 z-50 flex flex-col-reverse items-center gap-3">
        {/* Main FAB */}
        <motion.div
          animate={{ rotate: isOpen ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Button
            size="lg"
            onClick={toggle}
            className="h-14 w-14 rounded-full gradient-primary shadow-fab hover:scale-105 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </motion.div>

        {/* Speed dial actions */}
        <AnimatePresence>
          {isOpen &&
            actions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.3, y: 20 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 22,
                  delay: index * 0.06,
                }}
                className="flex items-center gap-3"
              >
                {/* Label */}
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.06 + 0.05 }}
                  className="text-sm font-medium text-foreground bg-card px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap"
                >
                  {action.label}
                </motion.span>
                {/* Action button */}
                <Button
                  size="icon"
                  onClick={action.onClick}
                  className={cn('h-12 w-12 rounded-full shadow-lg', action.color)}
                >
                  {action.icon}
                </Button>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </>
  );
}
