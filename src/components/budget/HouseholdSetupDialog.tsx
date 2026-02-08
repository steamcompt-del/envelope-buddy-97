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
import { Users, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface HouseholdSetupDialogProps {
  open: boolean;
  onCreateHousehold: (name: string) => Promise<void>;
  onJoinHousehold: (code: string) => Promise<void>;
  onClose?: () => void;
  isAdditional?: boolean;
}

type Mode = 'choose' | 'create' | 'join';

export function HouseholdSetupDialog({
  open,
  onCreateHousehold,
  onJoinHousehold,
  onClose,
  isAdditional = false,
}: HouseholdSetupDialogProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!householdName.trim()) {
      toast.error('Veuillez entrer un nom pour votre ménage');
      return;
    }

    setIsLoading(true);
    try {
      await onCreateHousehold(householdName.trim());
      toast.success('Ménage créé avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la création du ménage');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error('Veuillez entrer un code d\'invitation');
      return;
    }

    setIsLoading(true);
    try {
      await onJoinHousehold(inviteCode.trim());
      toast.success('Vous avez rejoint le ménage !');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Code invalide';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMode('choose');
    setHouseholdName('');
    setInviteCode('');
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => !isAdditional && e.preventDefault()}>
        {mode === 'choose' && (
          <>
            <DialogHeader>
              <DialogTitle>{isAdditional ? 'Ajouter un ménage' : 'Configuration du budget'}</DialogTitle>
              <DialogDescription>
                {isAdditional 
                  ? 'Créez un nouveau ménage ou rejoignez un ménage existant.'
                  : 'Pour utiliser l\'application, créez un nouveau ménage ou rejoignez un ménage existant avec un code d\'invitation.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={() => setMode('create')}
              >
                <Users className="h-6 w-6" />
                <span>Créer un ménage</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={() => setMode('join')}
              >
                <UserPlus className="h-6 w-6" />
                <span>Rejoindre un ménage</span>
              </Button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <>
            <DialogHeader>
              <DialogTitle>Créer un ménage</DialogTitle>
              <DialogDescription>
                Donnez un nom à votre ménage. Vous pourrez ensuite inviter votre partenaire avec un code.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="household-name">Nom du ménage</Label>
                <Input
                  id="household-name"
                  placeholder="Ex: Famille Dupont"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMode('choose')}
                  disabled={isLoading}
                >
                  Retour
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Créer le ménage'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {mode === 'join' && (
          <>
            <DialogHeader>
              <DialogTitle>Rejoindre un ménage</DialogTitle>
              <DialogDescription>
                Entrez le code d'invitation partagé par votre partenaire pour rejoindre son ménage.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Code d'invitation</Label>
                <Input
                  id="invite-code"
                  placeholder="Ex: ABC12DEF"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  className="uppercase tracking-widest text-center text-lg"
                  maxLength={8}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMode('choose')}
                  disabled={isLoading}
                >
                  Retour
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleJoin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Rejoindre'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
