import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Crown } from 'lucide-react';
import { getBackendClient } from '@/lib/backendClient';

interface Member {
  id: string;
  user_id: string;
  household_id: string;
  joined_at: string;
  profiles?: {
    display_name?: string;
  } | null;
}

interface HouseholdMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string | null;
  creatorId: string | null;
}

export function HouseholdMembersDialog({
  open,
  onOpenChange,
  householdId,
  creatorId,
}: HouseholdMembersDialogProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !householdId) return;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const supabase = getBackendClient();
        const { data } = await supabase
          .from('household_members')
          .select('*, profiles(display_name)')
          .eq('household_id', householdId);

        setMembers(data || []);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [open, householdId]);

  const getInitials = (name?: string | null): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membres du ménage
          </DialogTitle>
          <DialogDescription>
            {members.length} membre{members.length > 1 ? 's' : ''} dans ce ménage
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Chargement des membres...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun membre trouvé</p>
            </div>
          ) : (
            members.map((member) => {
              const isCreator = member.user_id === creatorId;
              const displayName =
                member.profiles?.display_name || 'Utilisateur anonyme';

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-sm font-semibold">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{displayName}</p>
                      {isCreator && (
                        <Badge variant="default" className="gap-1 shrink-0">
                          <Crown className="h-3 w-3" />
                          Créateur
                        </Badge>
                      )}
                      {!isCreator && (
                        <Badge variant="outline" className="shrink-0">
                          Membre
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Rejoint le {formatDate(member.joined_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
