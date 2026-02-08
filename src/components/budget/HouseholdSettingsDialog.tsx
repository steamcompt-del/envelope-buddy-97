import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Copy, RefreshCw, Users, Loader2, LogOut, Trash2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { HouseholdMembersDialog } from './HouseholdMembersDialog';

// Simple household type for the dialog (doesn't need full Household)
interface HouseholdInfo {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
}

interface HouseholdSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household: HouseholdInfo | null;
  currentUserId?: string;
  onUpdateName: (name: string) => Promise<void>;
  onRegenerateCode: () => Promise<string>;
  onLeaveHousehold: () => Promise<void>;
  onDeleteHousehold: () => Promise<void>;
}

export function HouseholdSettingsDialog({
  open,
  onOpenChange,
  household,
  currentUserId,
  onUpdateName,
  onRegenerateCode,
  onLeaveHousehold,
  onDeleteHousehold,
}: HouseholdSettingsDialogProps) {
  const [name, setName] = useState(household?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCreator = household?.created_by === currentUserId;

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

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await onLeaveHousehold();
      toast.success('Vous avez quitté le ménage');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erreur lors de la sortie du ménage');
      console.error(error);
    } finally {
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteHousehold();
      toast.success('Ménage supprimé');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!household) return null;

  return (
    <>
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

            <Separator />

            {/* Members section */}
            <div className="space-y-4">
              <Label>Membres</Label>
              <p className="text-sm text-muted-foreground">
                Consultez la liste des membres et leurs rôles.
              </p>
              <Button
                variant="outline"
                className="w-full justify-between gap-2"
                onClick={() => setShowMembers(true)}
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Voir les membres
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            <Separator />
            <div className="space-y-4">
              <Label className="text-destructive">Zone danger</Label>
              
              {isCreator ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Vous êtes le créateur de ce ménage. Le supprimer retirera tous les membres.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer le ménage
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Quitter ce ménage vous retirera de l'accès aux données partagées.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => setShowLeaveConfirm(true)}
                  >
                    <LogOut className="h-4 w-4" />
                    Quitter le ménage
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le ménage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous n'aurez plus accès aux données partagées de ce ménage. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={isLeaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLeaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Quitter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le ménage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le ménage et retirera tous ses membres. Les données du ménage ne seront plus accessibles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Household Members Dialog */}
      <HouseholdMembersDialog
        open={showMembers}
        onOpenChange={setShowMembers}
        householdId={household?.id || null}
        creatorId={household?.created_by || null}
      />
    </>
  );
}
