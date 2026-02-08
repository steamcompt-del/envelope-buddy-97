import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  PieChart,
  Calendar,
  Sparkles,
  LogOut,
  Users,
  FileDown,
  History,
  Repeat,
  Moon,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';
import { HouseholdSettingsDialog } from '@/components/budget/HouseholdSettingsDialog';
import { exportMonthlyReportPDF } from '@/lib/exportPdf';
import { useRecurring } from '@/hooks/useRecurring';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenIncomeList?: () => void;
  onOpenSuggestions?: () => void;
  onOpenRecurring?: () => void;
  onOpenActivity?: () => void;
}

export function SettingsSheet({ open, onOpenChange, onOpenIncomeList, onOpenSuggestions, onOpenRecurring, onOpenActivity }: SettingsSheetProps) {
  const { 
    envelopes, 
    transactions, 
    incomes, 
    toBeBudgeted, 
    resetMonth, 
    startNewMonth, 
    currentMonthKey, 
    deleteAllUserData,
    household,
    updateHouseholdName,
    regenerateInviteCode,
  } = useBudget();
  const { user, signOut } = useAuth();
  const { dueCount } = useRecurring();
  const { theme, setTheme } = useTheme();
  const [showNewMonthDialog, setShowNewMonthDialog] = useState(false);
  const [showHouseholdSettings, setShowHouseholdSettings] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  
  const handleStartNewMonth = () => {
    startNewMonth();
    setShowNewMonthDialog(false);
    onOpenChange(false);
    toast.success(`Nouveau mois démarré : ${nextMonthDisplay}`, {
      description: 'Les allocations ont été conservées, les dépenses remises à zéro.'
    });
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
          <SheetTitle>Paramètres & Statistiques</SheetTitle>
          <SheetDescription>
            {monthDisplay}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Theme Toggle */}
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
          
          {/* Monthly Stats */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Résumé du mois
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onOpenIncomeList?.()}
                className="p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Revenus</span>
                </div>
                <p className="text-xl font-bold text-primary">
                  {totalIncome.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Cliquer pour modifier</p>
              </button>
              
              <div className="p-4 rounded-xl bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">Dépenses</span>
                </div>
                <p className="text-xl font-bold text-destructive">
                  {totalSpent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart className="w-4 h-4 text-foreground" />
                  <span className="text-sm text-muted-foreground">Alloué</span>
                </div>
                <p className="text-xl font-bold">
                  {totalAllocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-foreground" />
                  <span className="text-sm text-muted-foreground">Non alloué</span>
                </div>
                <p className="text-xl font-bold">
                  {toBeBudgeted.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Recurring Transactions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Automatisation
            </h3>
            
            <p className="text-sm text-muted-foreground">
              Gérez vos dépenses récurrentes (loyer, abonnements...).
            </p>
            
            <Button
              onClick={() => {
                onOpenChange(false);
                setTimeout(() => onOpenRecurring?.(), 100);
              }}
              variant="outline"
              className="w-full rounded-xl gap-2"
            >
              <Repeat className="w-4 h-4" />
              Dépenses récurrentes
              {dueCount > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {dueCount} à payer
                </Badge>
              )}
            </Button>
          </div>
          
          <Separator />
          
          {/* Activity Log (only for households) */}
          {household && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Collaboration
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  Voyez qui a fait quoi dans votre ménage partagé.
                </p>
                
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(() => onOpenActivity?.(), 100);
                  }}
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
          
          {/* Start New Month */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Gestion mensuelle
            </h3>
            
            <p className="text-sm text-muted-foreground">
              Démarrez un nouveau mois en conservant vos enveloppes. Les dépenses seront remises à zéro.
            </p>
            
            <Button
              onClick={() => setShowNewMonthDialog(true)}
              variant="outline"
              className="w-full rounded-xl gap-2"
            >
              <Calendar className="w-4 h-4" />
              Démarrer {nextMonthDisplay}
            </Button>
          </div>
          
          <Separator />
          
          {/* Export PDF */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Exporter
            </h3>
            
            <p className="text-sm text-muted-foreground">
              Téléchargez un récapitulatif complet du mois en PDF.
            </p>
            
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
                toast.success('PDF généré avec succès !');
              }}
              variant="outline"
              className="w-full rounded-xl gap-2"
            >
              <FileDown className="w-4 h-4" />
              Exporter en PDF
            </Button>
          </div>
          
          <Separator />
          
          {/* AI Suggestions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Conseils IA
            </h3>
            
            <p className="text-sm text-muted-foreground">
              Obtenez des suggestions personnalisées pour optimiser votre budget.
            </p>
            
            <Button
              onClick={() => {
                onOpenChange(false);
                setTimeout(() => onOpenSuggestions?.(), 100);
              }}
              variant="outline"
              className="w-full rounded-xl gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Suggestions IA
            </Button>
          </div>
          
          {/* Household Settings */}
          {household && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Ménage partagé
                </h3>
                
                <div className="p-4 rounded-xl bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-medium">{household.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Code d'invitation : <span className="font-mono font-bold">{household.invite_code}</span>
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
              </div>
            </>
          )}
          
          <Separator />
          
          {/* Envelope breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Par enveloppe
            </h3>
            
            {envelopes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune enveloppe créée
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {envelopes.map((env) => {
                  const percent = env.allocated > 0 ? (env.spent / env.allocated) * 100 : 0;
                  const isOver = env.spent > env.allocated;
                  
                  return (
                    <div key={env.id} className="flex items-center justify-between py-2">
                      <span className="font-medium">{env.name}</span>
                      <div className="text-right">
                        <span className={isOver ? "text-destructive" : "text-foreground"}>
                          {env.spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                        <span className="text-muted-foreground">
                          {' / '}{env.allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({Math.round(percent)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Monthly Reset */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Réinitialiser ce mois
            </h3>
            
            <p className="text-sm text-muted-foreground">
              Remet les dépenses et allocations à zéro pour ce mois.
            </p>
            
            <Button
              onClick={handleResetMonth}
              variant="outline"
              className="w-full rounded-xl gap-2 text-destructive hover:text-destructive"
            >
              <RefreshCw className="w-4 h-4" />
              Réinitialiser {monthDisplay}
            </Button>
          </div>
          
          <Separator />
          
          {/* Full Reset (danger zone) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider">
              Zone danger
            </h3>
            
            <p className="text-sm text-muted-foreground">
              Supprime toutes les données de l'application (tous les mois).
            </p>
            
            <Button
              onClick={handleFullReset}
              variant="destructive"
              className="w-full rounded-xl gap-2"
              disabled={isDeleting}
            >
              <RefreshCw className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
              {isDeleting ? 'Suppression...' : 'Tout effacer'}
            </Button>
          </div>
          
          <Separator />
          
          {/* Info */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>{envelopes.length} enveloppe{envelopes.length !== 1 ? 's' : ''}</p>
            <p>{transactions.length} transaction{transactions.length !== 1 ? 's' : ''} ce mois</p>
            {user && <p className="pt-2">Connecté : {user.email}</p>}
          </div>
          
          <Separator />
          
          {/* Logout */}
          <Button
            onClick={signOut}
            variant="outline"
            className="w-full rounded-xl gap-2"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </Button>
        </div>
      </SheetContent>
      
      {/* New Month Confirmation Dialog */}
      <AlertDialog open={showNewMonthDialog} onOpenChange={setShowNewMonthDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Démarrer un nouveau mois ?</AlertDialogTitle>
            <AlertDialogDescription>
              Attention, cela va créer le mois de <strong>{nextMonthDisplay}</strong> et remettre toutes les dépenses à zéro. 
              Vos enveloppes seront conservées mais leurs soldes seront réinitialisés. 
              Le mois actuel ({monthDisplay}) restera accessible dans l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartNewMonth}>
              Démarrer {nextMonthDisplay}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Household Settings Dialog */}
      <HouseholdSettingsDialog
        open={showHouseholdSettings}
        onOpenChange={setShowHouseholdSettings}
        household={household}
        onUpdateName={updateHouseholdName}
        onRegenerateCode={regenerateInviteCode}
      />
    </Sheet>
  );
}
