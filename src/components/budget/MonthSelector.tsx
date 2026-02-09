import { useState } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar, Copy } from 'lucide-react';
import { CopyEnvelopesDialog } from './CopyEnvelopesDialog';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatMonthDisplay(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function formatShortMonth(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return `${MONTH_NAMES[month - 1].slice(0, 3)} ${year}`;
}

export function MonthSelector() {
  const { currentMonthKey, setCurrentMonth, getAvailableMonths, createNewMonth, months, envelopes } = useBudget();
  const [open, setOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  
  const availableMonths = getAvailableMonths();
  const { year, month } = parseMonthKey(currentMonthKey);
  
  const goToPreviousMonth = () => {
    const newMonth = month === 1 ? 12 : month - 1;
    const newYear = month === 1 ? year - 1 : year;
    const newKey = formatMonthKey(newYear, newMonth);
    setCurrentMonth(newKey);
  };
  
  const goToNextMonth = () => {
    const newMonth = month === 12 ? 1 : month + 1;
    const newYear = month === 12 ? year + 1 : year;
    const newKey = formatMonthKey(newYear, newMonth);
    setCurrentMonth(newKey);
  };
  
  const isCurrentMonth = () => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  };
  
  const goToToday = () => {
    const now = new Date();
    const todayKey = formatMonthKey(now.getFullYear(), now.getMonth() + 1);
    setCurrentMonth(todayKey);
    setOpen(false);
  };
  
  const handleMonthSelect = (monthKey: string) => {
    setCurrentMonth(monthKey);
    setOpen(false);
  };

  const handleOpenCopyDialog = () => {
    setOpen(false);
    setCopyDialogOpen(true);
  };
  
  // Check if month has data
  const monthHasData = (monthKey: string) => {
    const monthData = months[monthKey];
    if (!monthData) return false;
    return monthData.incomes.length > 0 || monthData.transactions.length > 0 || monthData.envelopes.some(e => e.allocated > 0);
  };
  
  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousMonth}
          className="h-8 w-8 rounded-lg"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="rounded-xl px-3 h-9 gap-2 min-w-[140px] font-medium"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{formatMonthDisplay(currentMonthKey)}</span>
              <span className="sm:hidden">{formatShortMonth(currentMonthKey)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="center">
            <div className="space-y-2">
              {/* Go to today button */}
              {!isCurrentMonth() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="w-full rounded-lg text-sm"
                >
                  Aller au mois actuel
                </Button>
              )}

              {/* Copy envelopes button */}
              {envelopes.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenCopyDialog}
                  className="w-full rounded-lg text-sm gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copier les enveloppes vers...
                </Button>
              )}
              
              {/* Available months */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Historique</p>
                {availableMonths.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2 py-2">Aucun mois disponible</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {availableMonths.map((monthKey) => (
                      <button
                        key={monthKey}
                        onClick={() => handleMonthSelect(monthKey)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                          "hover:bg-muted",
                          monthKey === currentMonthKey && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{formatMonthDisplay(monthKey)}</span>
                          {monthHasData(monthKey) && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
          className="h-8 w-8 rounded-lg"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <CopyEnvelopesDialog 
        open={copyDialogOpen} 
        onOpenChange={setCopyDialogOpen} 
      />
    </>
  );
}
