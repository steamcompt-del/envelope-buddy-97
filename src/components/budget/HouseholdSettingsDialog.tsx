import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, RefreshCw, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Simple household type for the dialog (doesn't need full Household)
interface HouseholdInfo {
  id: string;
  name: string;
  invite_code: string;
}

interface HouseholdSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household: HouseholdInfo | null;
  onUpdateName: (name: string) => Promise<void>;
  onRegenerateCode: () => Promise<string>;
}

export function HouseholdSettingsDialog({
  open,
  onOpenChange,
  household,
  onUpdateName,
  onRegenerateCode,
}: HouseholdSettingsDialogProps) {
  const [name, setName] = useState(household?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleUpdateName = async () => {
    if (!name.trim()) return;
    setIsUpdating(true);
    try {
      await onUpdateName(name.trim());
      toast.success('Nom mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyCode = () => {
    if (household?.invite_code) {
      navigator.clipboard.writeText(household.invite_code);
      toast.success('Code copié !');
    }
  };

  const handleRegenerateCode = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerateCode();
      toast.success('Nouveau code généré');
    } catch (error) {
      toast.error('Erreur lors de la régénération');
      console.error(error);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!household) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Paramètres du ménage
          </DialogTitle>
          <DialogDescription>
            Gérez les paramètres de votre ménage partagé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Household name */}
          <div className="space-y-2">
            <Label htmlFor="household-name">Nom du ménage</Label>
            <div className="flex gap-2">
              <Input
                id="household-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isUpdating}
              />
              <Button
                onClick={handleUpdateName}
                disabled={isUpdating || name === household.name}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </div>
          </div>

          {/* Invite code */}
          <div className="space-y-2">
            <Label>Code d'invitation</Label>
            <p className="text-sm text-muted-foreground">
              Partagez ce code avec votre partenaire pour qu'il rejoigne votre ménage.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg p-3 text-center">
                <span className="text-2xl font-mono font-bold tracking-widest">
                  {household.invite_code}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                title="Copier le code"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRegenerateCode}
                disabled={isRegenerating}
                title="Générer un nouveau code"
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ Régénérer le code invalidera l'ancien code.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
