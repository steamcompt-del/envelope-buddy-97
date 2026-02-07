import { useState, useRef } from 'react';
import { BudgetProvider, useBudget } from '@/contexts/BudgetContext';
import { BudgetHeader } from '@/components/budget/BudgetHeader';
import { EnvelopeGrid } from '@/components/budget/EnvelopeGrid';
import { AddIncomeDialog } from '@/components/budget/AddIncomeDialog';
import { CreateEnvelopeDialog } from '@/components/budget/CreateEnvelopeDialog';
import { AllocateFundsDialog } from '@/components/budget/AllocateFundsDialog';
import { TransferFundsDialog } from '@/components/budget/TransferFundsDialog';
import { AddExpenseDrawer } from '@/components/budget/AddExpenseDrawer';
import { EnvelopeDetailsDialog } from '@/components/budget/EnvelopeDetailsDialog';
import { SettingsSheet } from '@/components/budget/SettingsSheet';
import { FabButton } from '@/components/budget/FabButton';
import { mockScanReceipt } from '@/lib/mockReceiptScanner';
import { toast } from 'sonner';

function BudgetApp() {
  const { envelopes } = useBudget();
  
  // Dialog states
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [createEnvelopeOpen, setCreateEnvelopeOpen] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      
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

const Index = () => {
  return (
    <BudgetProvider>
      <BudgetApp />
    </BudgetProvider>
  );
};

export default Index;
