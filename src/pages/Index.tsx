import { useState, useRef } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import { useAuth } from '@/contexts/AuthContext';
import { BudgetHeader } from '@/components/budget/BudgetHeader';
import { EnvelopeGrid } from '@/components/budget/EnvelopeGrid';
import { AddIncomeDialog } from '@/components/budget/AddIncomeDialog';
import { CreateEnvelopeDialog } from '@/components/budget/CreateEnvelopeDialog';
import { AllocateFundsDialog } from '@/components/budget/AllocateFundsDialog';
import { TransferFundsDialog } from '@/components/budget/TransferFundsDialog';
import { AddExpenseDrawer } from '@/components/budget/AddExpenseDrawer';
import { EnvelopeDetailsDialog } from '@/components/budget/EnvelopeDetailsDialog';
import { SettingsSheet } from '@/components/budget/SettingsSheet';
import { IncomeListDialog } from '@/components/budget/IncomeListDialog';
import { BudgetSuggestionsDialog } from '@/components/budget/BudgetSuggestionsDialog';
import { FabButton } from '@/components/budget/FabButton';
import { HouseholdSetupDialog } from '@/components/budget/HouseholdSetupDialog';
import { mockScanReceipt } from '@/lib/mockReceiptScanner';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { 
    envelopes, 
    loading, 
    needsHouseholdSetup,
    createHousehold,
    joinHousehold,
  } = useBudget();
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
  
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string>('');
  
  // File input for FAB scan
  const scanInputRef = useRef<HTMLInputElement>(null);
  
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
    
    toast.loading('Analyse du ticket en cours...');
    
    try {
      const scannedData = await mockScanReceipt(file);
      toast.dismiss();
      toast.success(`Ticket analysé : ${scannedData.merchant} - ${scannedData.amount}€`);
      
      // Open expense drawer - it will be pre-filled via the component's own scan logic
      // For now, just open it - user can scan again or fill manually
      setExpenseOpen(true);
    } catch {
      toast.dismiss();
      toast.error('Erreur lors de l\'analyse');
    }
    
    if (scanInputRef.current) {
      scanInputRef.current.value = '';
    }
  };
  
  const handleTransferFromDetails = () => {
    setTransferOpen(true);
  };
  
  const handleAddExpenseFromDetails = () => {
    setExpenseOpen(true);
  };
  
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

  return (
    <div className="min-h-screen bg-background">
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
      
      {/* FAB */}
      <FabButton
        onAddExpense={() => setExpenseOpen(true)}
        onScanReceipt={handleFabScan}
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
        onOpenChange={setExpenseOpen}
        preselectedEnvelopeId={selectedEnvelopeId}
      />
      <SettingsSheet 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen}
        onOpenIncomeList={() => setIncomeListOpen(true)}
        onOpenSuggestions={() => setSuggestionsOpen(true)}
      />
      <IncomeListDialog open={incomeListOpen} onOpenChange={setIncomeListOpen} />
      <BudgetSuggestionsDialog open={suggestionsOpen} onOpenChange={setSuggestionsOpen} />
      
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
