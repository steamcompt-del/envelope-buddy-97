import { useState, useEffect, useCallback } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import { useAuth } from '@/contexts/AuthContext';
import { BudgetHeader } from '@/components/budget/BudgetHeader';
import { EnvelopeGrid } from '@/components/budget/EnvelopeGrid';
import { AddIncomeDialog } from '@/components/budget/AddIncomeDialog';
import { CreateEnvelopeDialog } from '@/components/budget/CreateEnvelopeDialog';
import { AllocateFundsDialog } from '@/components/budget/AllocateFundsDialog';
import { TransferFundsDialog } from '@/components/budget/TransferFundsDialog';
import { AddExpenseDrawer, ScannedExpenseData } from '@/components/budget/AddExpenseDrawer';
import { EnvelopeDetailsDialog } from '@/components/budget/EnvelopeDetailsDialog';
import { SavingsDetailsDialog } from '@/components/budget/SavingsDetailsDialog';
import { SettingsSheet } from '@/components/budget/SettingsSheet';
import { IncomeListDialog } from '@/components/budget/IncomeListDialog';
import { BudgetSuggestionsDialog } from '@/components/budget/BudgetSuggestionsDialog';
import { FabButton } from '@/components/budget/FabButton';
import { ScanDrawer } from '@/components/budget/ScanDrawer';
import { HouseholdSetupDialog } from '@/components/budget/HouseholdSetupDialog';
import { RecurringListSheet } from '@/components/budget/RecurringListSheet';
import { ActivityLogSheet } from '@/components/budget/ActivityLogSheet';

import { PullToRefresh } from '@/components/budget/PullToRefresh';
import { useReceiptScanner, type ScanResult } from '@/hooks/useReceiptScanner';
import { useRecurring } from '@/hooks/useRecurring';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useSavingsNotifications } from '@/hooks/useSavingsNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { 
    envelopes, 
    loading, 
    needsHouseholdSetup,
    createHousehold,
    joinHousehold,
    refreshData,
  } = useBudget();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Dialog states
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [createEnvelopeOpen, setCreateEnvelopeOpen] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [savingsDetailsOpen, setSavingsDetailsOpen] = useState(false);
  const [incomeListOpen, setIncomeListOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [scanDrawerOpen, setScanDrawerOpen] = useState(false);
  
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string>('');
  const [scannedExpenseData, setScannedExpenseData] = useState<ScannedExpenseData | null>(null);
  
  const { isScanning } = useReceiptScanner();
  const savingsGoals = useSavingsGoals();
  useSavingsNotifications();
  const { dueCount, applyAllDue } = useRecurring();

  // Check for due recurring transactions on mount
  useEffect(() => {
    if (dueCount > 0 && !loading) {
      toast.info(`${dueCount} dépense${dueCount > 1 ? 's' : ''} récurrente${dueCount > 1 ? 's' : ''} à payer`, {
        action: {
          label: 'Voir',
          onClick: () => setRecurringOpen(true),
        },
      });
    }
  }, [dueCount, loading]);
  
  const handleEnvelopeClick = (envelopeId: string) => {
    const envelope = envelopes.find(e => e.id === envelopeId);
    setSelectedEnvelopeId(envelopeId);
    
    // Open different dialog based on envelope type
    if (envelope?.icon === 'PiggyBank') {
      setSavingsDetailsOpen(true);
    } else {
      setDetailsOpen(true);
    }
  };
  
  
  const handleExpenseDrawerClose = (open: boolean) => {
    setExpenseOpen(open);
    if (!open) {
      // Clear scanned data when drawer closes
      setScannedExpenseData(null);
    }
  };
  
  const handleTransferFromDetails = () => {
    setTransferOpen(true);
  };
  
  const handleAddExpenseFromDetails = () => {
    setExpenseOpen(true);
  };
  
  const handleRefresh = useCallback(async () => {
    await refreshData();
    toast.success('Données actualisées');
  }, [refreshData]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de votre budget...</p>
        </div>
      </div>
    );
  }

  const mainContent = (
    <>
      <BudgetHeader
        onAllocate={() => setAllocateOpen(true)}
        onAddIncome={() => setIncomeOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenIncomeHistory={() => setIncomeListOpen(true)}
      />
      
      <main className="container py-6 pb-24">
        <EnvelopeGrid
          onEnvelopeClick={handleEnvelopeClick}
          onCreateEnvelope={() => setCreateEnvelopeOpen(true)}
          getGoalForEnvelope={savingsGoals.getGoalForEnvelope}
          onQuickAddExpense={(id) => {
            setSelectedEnvelopeId(id);
            setExpenseOpen(true);
          }}
          onQuickAllocate={(id) => {
            setSelectedEnvelopeId(id);
            setAllocateOpen(true);
          }}
          onQuickTransfer={(id) => {
            setSelectedEnvelopeId(id);
            setTransferOpen(true);
          }}
          onQuickDelete={(id) => {
            const env = envelopes.find(e => e.id === id);
            if (env) {
              setSelectedEnvelopeId(id);
              setDetailsOpen(true);
            }
          }}
        />
      </main>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
          {mainContent}
        </PullToRefresh>
      ) : (
        mainContent
      )}
      
      {/* FAB Speed Dial */}
      <FabButton
        onAddExpense={() => setExpenseOpen(true)}
        onScanReceipt={() => setScanDrawerOpen(true)}
        onAddIncome={() => setIncomeOpen(true)}
      />
      
      {/* Scan Drawer (direct access from FAB) */}
      <ScanDrawer
        open={scanDrawerOpen}
        onOpenChange={setScanDrawerOpen}
        onScanComplete={(data) => {
          setScannedExpenseData(data);
          setExpenseOpen(true);
        }}
      />
      
      {/* Dialogs */}
      <AddIncomeDialog open={incomeOpen} onOpenChange={setIncomeOpen} />
      <CreateEnvelopeDialog open={createEnvelopeOpen} onOpenChange={setCreateEnvelopeOpen} />
      <AllocateFundsDialog 
        open={allocateOpen} 
        onOpenChange={setAllocateOpen}
        preselectedEnvelopeId={envelopes.length === 1 ? envelopes[0].id : undefined}
      />
      <TransferFundsDialog 
        open={transferOpen} 
        onOpenChange={setTransferOpen}
        fromEnvelopeId={selectedEnvelopeId}
      />
      <AddExpenseDrawer 
        open={expenseOpen} 
        onOpenChange={handleExpenseDrawerClose}
        preselectedEnvelopeId={selectedEnvelopeId}
        scannedData={scannedExpenseData}
      />
      <SettingsSheet 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen}
        onOpenIncomeList={() => setIncomeListOpen(true)}
        onOpenActivity={() => setActivityOpen(true)}
      />
      <IncomeListDialog open={incomeListOpen} onOpenChange={setIncomeListOpen} />
      <BudgetSuggestionsDialog open={suggestionsOpen} onOpenChange={setSuggestionsOpen} />
      <RecurringListSheet open={recurringOpen} onOpenChange={setRecurringOpen} />
      <ActivityLogSheet open={activityOpen} onOpenChange={setActivityOpen} />
      
      {/* Household setup dialog */}
      <HouseholdSetupDialog
        open={needsHouseholdSetup}
        onCreateHousehold={createHousehold}
        onJoinHousehold={joinHousehold}
      />
      
      {selectedEnvelopeId && (
        <>
          <EnvelopeDetailsDialog
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            envelopeId={selectedEnvelopeId}
            onTransfer={handleTransferFromDetails}
            onAddExpense={handleAddExpenseFromDetails}
          />
          <SavingsDetailsDialog
            open={savingsDetailsOpen}
            onOpenChange={setSavingsDetailsOpen}
            envelopeId={selectedEnvelopeId}
            onTransfer={handleTransferFromDetails}
            savingsGoalsHook={savingsGoals}
          />
        </>
      )}
    </div>
  );
}
