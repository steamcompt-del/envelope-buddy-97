import { useState } from 'react';
import { ActivityLogSheet } from '@/components/budget/ActivityLogSheet';
import { AutoAllocationHistoryDialog } from '@/components/budget/AutoAllocationHistoryDialog';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useBudget } from '@/contexts/BudgetContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  PieChart,
  Calendar,
  LogOut,
  Users,
  FileDown,
  History,
  Moon,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { HouseholdSettingsDialog } from '@/components/budget/HouseholdSettingsDialog';
import { MonthlyManagementDialog } from '@/components/budget/MonthlyManagementDialog';
import { exportMonthlyReportPDF } from '@/lib/exportPdf';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenIncomeList?: () => void;
  onOpenActivity?: () => void;
}

export function SettingsSheet({ open, onOpenChange, onOpenIncomeList, onOpenActivity }: SettingsSheetProps) {
  const { 
    envelopes, 
    transactions, 
    incomes, 
    toBeBudgeted, 
    resetMonth, 
    startNewMonth, 
    currentMonthKey, 
    deleteAllUserData,
    deleteMonthData,
    household,
    updateHouseholdName,
    regenerateInviteCode,
    leaveHousehold,
    deleteHousehold,
  } = useBudget();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showDeleteMonthDialog, setShowDeleteMonthDialog] = useState(false);
  const [showHouseholdSettings, setShowHouseholdSettings] = useState(false);
  const [showMonthlyManagement, setShowMonthlyManagement] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingMonth, setIsDeletingMonth] = useState(false);
  const [showAutoAllocHistory, setShowAutoAllocHistory] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const isDarkMode = theme === 'dark';
  
  // Calculate totals
  const totalAllocated = envelopes.reduce((sum, env) => sum + env.allocated, 0);
  const totalSpent = envelopes.reduce((sum, env) => sum + env.spent, 0);
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  
  // Format month display
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const [year, month] = currentMonthKey.split('-').map(Number);
  const monthDisplay = `${monthNames[month - 1]} ${year}`;
  
  // Calculate next month display
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthDisplay = `${monthNames[nextMonth - 1]} ${nextYear}`;
  
  const handleResetMonth = () => {
    if (confirm('Êtes-vous sûr de vouloir remettre à zéro les dépenses et allocations de toutes les enveloppes ? Cette action est irréversible.')) {
      resetMonth();
      onOpenChange(false);
    }
  };
  
  const handleDeleteMonthData = async () => {
    setIsDeletingMonth(true);
    try {
      await deleteMonthData(currentMonthKey);
      toast.success(`Données de ${monthDisplay} supprimées`, {
        description: 'Toutes les dépenses, revenus et allocations du mois ont été effacés.'
      });
      setShowDeleteMonthDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting month data:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeletingMonth(false);
    }
  };
  
  
  const handleFullReset = async () => {
    if (confirm('⚠️ ATTENTION: Cela supprimera TOUTES les données (tous les mois, revenus, enveloppes, transactions). Êtes-vous sûr ?')) {
      setIsDeleting(true);
      try {
        await deleteAllUserData();
        toast.success('Toutes les données ont été supprimées');
        onOpenChange(false);
      } catch (error) {
        console.error('Error deleting data:', error);
        toast.error('Erreur lors de la suppression');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Paramètres</SheetTitle>
          <SheetDescription>
            {monthDisplay}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-8">
          {/* ===== SECTION 1: APPARENCE ===== */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Apparence
            </h3>
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted">
              <div className="flex items-center gap-3">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-primary" />
                ) : (
                  <Sun className="w-5 h-5 text-warning" />
                )}
                <Label htmlFor="theme-toggle" className="font-medium cursor-pointer">
                  Mode sombre
                </Label>
              </div>
              <Switch
                id="theme-toggle"
                checked={isDarkMode}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </div>
          
          <Separator />
          
          {/* ===== SECTION 2: MON MÉNAGE ===== */}
          {household && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Mon ménage
                </h3>
                
                <div className="p-4 rounded-xl bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-medium">{household.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Code : <span className="font-mono font-bold">{household.invite_code}</span>
                  </p>
                </div>
                
                <Button
                  onClick={() => setShowHouseholdSettings(true)}
                  variant="outline"
                  className="w-full rounded-xl gap-2"
                >
                  <Users className="w-4 h-4" />
                  Gérer le ménage
                </Button>
                
                <Button
                  onClick={() => setShowActivityLog(true)}
                  variant="outline"
                  className="w-full rounded-xl gap-2"
                >
                  <History className="w-4 h-4" />
                  Historique d'activité
                </Button>
              </div>
              
              <Separator />
            </>
          )}
          
          {/* ===== SECTION 3: DONNÉES ===== */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Données
            </h3>
            
            {/* Monthly Stats */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => onOpenIncomeList?.()}
                className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left text-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <p className="font-bold text-primary">
                  {totalIncome.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
                <p className="text-xs text-muted-foreground">Revenus</p>
              </button>
              
              <Link to="/expenses" onClick={() => onOpenChange(false)}>
                <div className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors cursor-pointer text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  </div>
                  <p className="font-bold text-destructive">
                    {totalSpent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                  <p className="text-xs text-muted-foreground">Dépenses</p>
                </div>
              </Link>
              
              <div className="p-3 rounded-lg bg-muted text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <PieChart className="w-4 h-4 text-foreground" />
                </div>
                <p className="font-bold">
                  {totalAllocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
                <p className="text-xs text-muted-foreground">Alloué</p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-foreground" />
                </div>
                <p className="font-bold">
                  {toBeBudgeted.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
                <p className="text-xs text-muted-foreground">À budgéter</p>
              </div>
            </div>
            
            {/* Envelope breakdown */}
            {envelopes.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3 font-medium">Par enveloppe :</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {envelopes.map((env) => {
                    const percent = env.allocated > 0 ? (env.spent / env.allocated) * 100 : 0;
                    const isOver = env.spent > env.allocated;
                    
                    return (
                      <div key={env.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate">{env.name}</span>
                        <div className="text-right whitespace-nowrap">
                          <span className={isOver ? "text-destructive" : "text-foreground"}>
                            {env.spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {' / '}{env.allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            <Button
              onClick={() => setShowMonthlyManagement(true)}
              variant="outline"
              className="w-full rounded-xl gap-2 text-sm"
            >
              <Calendar className="w-4 h-4" />
              Mois suivant
            </Button>
            
            <Button
              onClick={() => {
                exportMonthlyReportPDF({
                  monthKey: currentMonthKey,
                  householdName: household?.name,
                  toBeBudgeted,
                  envelopes,
                  transactions,
                  incomes,
                });
                toast.success('PDF généré !');
              }}
              variant="outline"
              className="w-full rounded-xl gap-2 text-sm"
            >
              <FileDown className="w-4 h-4" />
              Exporter PDF
            </Button>
            
            <Button
              onClick={() => setShowAutoAllocHistory(true)}
              variant="outline"
              className="w-full rounded-xl gap-2 text-sm"
            >
              <Zap className="w-4 h-4" />
              Historique auto-allocations
            </Button>
            
            <Button
              onClick={() => setShowDeleteMonthDialog(true)}
              variant="outline"
              className="w-full rounded-xl gap-2 text-sm text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer {monthDisplay}
            </Button>
          </div>
          
          <Separator />
          
          {/* ===== SECTION 4: À PROPOS ===== */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              À propos
            </h3>
            
            <div className="text-center text-xs text-muted-foreground space-y-2 p-4 rounded-xl bg-muted">
              <p>{envelopes.length} enveloppe{envelopes.length !== 1 ? 's' : ''}</p>
              <p>{transactions.length} transaction{transactions.length !== 1 ? 's' : ''} ce mois</p>
              {user && <p className="pt-2 border-t">Connecté : {user.email}</p>}
            </div>
            
            <Button
              onClick={signOut}
              variant="outline"
              className="w-full rounded-xl gap-2"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </Button>
            
            <Button
              onClick={handleFullReset}
              variant="destructive"
              className="w-full rounded-xl gap-2"
              disabled={isDeleting}
            >
              <RefreshCw className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
              {isDeleting ? 'Suppression...' : 'Effacer tout'}
            </Button>
          </div>
        </div>
      </SheetContent>
      
      {/* Monthly Management Dialog */}
      <MonthlyManagementDialog
        open={showMonthlyManagement}
        onOpenChange={setShowMonthlyManagement}
      />
      
      {/* Delete Month Data Confirmation Dialog */}
      <AlertDialog open={showDeleteMonthDialog} onOpenChange={setShowDeleteMonthDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer toutes les données de {monthDisplay} ?</AlertDialogTitle>
            <AlertDialogDescription>
            ⚠️ Cette action est irréversible. Cela supprimera :
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Toutes les enveloppes ({envelopes.length} enveloppe{envelopes.length !== 1 ? 's' : ''})</li>
                <li>Toutes les dépenses du mois ({transactions.length} transaction{transactions.length !== 1 ? 's' : ''})</li>
                <li>Tous les revenus du mois ({incomes.length} revenu{incomes.length !== 1 ? 's' : ''})</li>
                <li>Toutes les allocations aux enveloppes</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMonth}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMonthData}
              disabled={isDeletingMonth}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingMonth ? 'Suppression...' : `Supprimer ${monthDisplay}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Household Settings Dialog */}
      <HouseholdSettingsDialog
        open={showHouseholdSettings}
        onOpenChange={setShowHouseholdSettings}
        household={household}
        currentUserId={user?.id}
        onUpdateName={updateHouseholdName}
        onRegenerateCode={regenerateInviteCode}
        onLeaveHousehold={leaveHousehold}
        onDeleteHousehold={deleteHousehold}
      />
      
      {/* Auto Allocation History Dialog */}
      <AutoAllocationHistoryDialog
        open={showAutoAllocHistory}
        onOpenChange={setShowAutoAllocHistory}
      />
      
      {/* Activity Log Sheet */}
      <ActivityLogSheet
        open={showActivityLog}
        onOpenChange={setShowActivityLog}
      />
    </Sheet>
  );
}
