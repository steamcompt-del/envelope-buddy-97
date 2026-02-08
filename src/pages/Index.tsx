import { useState, useRef, useEffect, useCallback } from 'react';
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
import { SettingsSheet } from '@/components/budget/SettingsSheet';
import { IncomeListDialog } from '@/components/budget/IncomeListDialog';
import { BudgetSuggestionsDialog } from '@/components/budget/BudgetSuggestionsDialog';
import { FabButton } from '@/components/budget/FabButton';
import { HouseholdSetupDialog } from '@/components/budget/HouseholdSetupDialog';
import { RecurringListSheet } from '@/components/budget/RecurringListSheet';
import { ActivityLogSheet } from '@/components/budget/ActivityLogSheet';
import { ShoppingListSheet } from '@/components/budget/ShoppingListSheet';
import { PullToRefresh } from '@/components/budget/PullToRefresh';
import { useReceiptScanner } from '@/hooks/useReceiptScanner';
import { useRecurring } from '@/hooks/useRecurring';
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
  const [incomeListOpen, setIncomeListOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string>('');
  const [scannedExpenseData, setScannedExpenseData] = useState<ScannedExpenseData | null>(null);
  
  // File input for FAB scan
  const scanInputRef = useRef<HTMLInputElement>(null);
  const { scanReceipt, isScanning } = useReceiptScanner();
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
    setSelectedEnvelopeId(envelopeId);
    setDetailsOpen(true);
  };
  
  const handleFabScan = () => {
    scanInputRef.current?.click();
  };
  
  const handleFabScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Use the real receipt scanner (Gemini AI)
    const scannedData = await scanReceipt(file);
    
    if (scannedData) {
      // Find matching envelope
      const matchingEnvelope = envelopes.find(
        env => env.name.toLowerCase() === scannedData.category.toLowerCase()
      );
      
      // Set the scanned data and open drawer
      setScannedExpenseData({
        amount: scannedData.amount,
        description: scannedData.description,
        merchant: scannedData.merchant,
        envelopeId: matchingEnvelope?.id,
        receiptFile: file,
      });
      setExpenseOpen(true);
    }
    
    if (scanInputRef.current) {
      scanInputRef.current.value = '';
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
      />
      
      <main className="container py-6 pb-24">
        <EnvelopeGrid
          onEnvelopeClick={handleEnvelopeClick}
          onCreateEnvelope={() => setCreateEnvelopeOpen(true)}
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
      
      {/* FAB */}
      <FabButton
        onAddExpense={() => setExpenseOpen(true)}
        onScanReceipt={handleFabScan}
        onOpenShoppingList={() => setShoppingListOpen(true)}
      />
      
      {/* Hidden file input for FAB scan */}
      <input
        ref={scanInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFabScanFile}
        className="hidden"
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
        onOpenSuggestions={() => setSuggestionsOpen(true)}
        onOpenRecurring={() => setRecurringOpen(true)}
        onOpenActivity={() => setActivityOpen(true)}
        onOpenShoppingList={() => setShoppingListOpen(true)}
      />
      <IncomeListDialog open={incomeListOpen} onOpenChange={setIncomeListOpen} />
      <BudgetSuggestionsDialog open={suggestionsOpen} onOpenChange={setSuggestionsOpen} />
      <RecurringListSheet open={recurringOpen} onOpenChange={setRecurringOpen} />
      <ActivityLogSheet open={activityOpen} onOpenChange={setActivityOpen} />
      <ShoppingListSheet open={shoppingListOpen} onOpenChange={setShoppingListOpen} />
      
      {/* Household setup dialog */}
      <HouseholdSetupDialog
        open={needsHouseholdSetup}
        onCreateHousehold={createHousehold}
        onJoinHousehold={joinHousehold}
      />
      
      {selectedEnvelopeId && (
        <EnvelopeDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          envelopeId={selectedEnvelopeId}
          onTransfer={handleTransferFromDetails}
          onAddExpense={handleAddExpenseFromDetails}
        />
      )}
    </div>
  );
}
