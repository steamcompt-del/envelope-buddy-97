import { useState } from 'react';
import { Receipt } from '@/lib/receiptsDb';
import { Button } from '@/components/ui/button';
import { ImageIcon, Expand, Trash2, Download, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReceiptLightbox, ReceiptImage } from './ReceiptLightbox';

interface ReceiptGalleryProps {
  receipts: Receipt[];
  onDelete?: (receiptId: string) => Promise<void>;
  onAdd?: () => void;
  isDeleting?: boolean;
  isAdding?: boolean;
  canEdit?: boolean;
}

export function ReceiptGallery({
  receipts,
  onDelete,
  onAdd,
  isDeleting = false,
  isAdding = false,
  canEdit = false,
}: ReceiptGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const lightboxImages: ReceiptImage[] = receipts.map((r) => ({
    id: r.id,
    url: r.url,
    fileName: r.fileName,
  }));

  if (receipts.length === 0 && !canEdit) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <ImageIcon className="w-4 h-4" />
        Aucun ticket attaché
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Grid of receipts */}
      <div className="grid grid-cols-4 gap-2">
        {receipts.map((receipt, index) => (
          <div
            key={receipt.id}
            className="relative aspect-square rounded-lg overflow-hidden border border-border group cursor-pointer"
            onClick={() => handleOpenLightbox(index)}
          >
            <img
              src={receipt.url}
              alt={receipt.fileName || `Ticket ${index + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Expand className="w-5 h-5 text-white" />
            </div>

            {/* Delete button */}
            {canEdit && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(receipt.id);
                }}
                disabled={isDeleting || deletingId === receipt.id}
              >
                {deletingId === receipt.id ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Trash2 className="w-2.5 h-2.5" />
                )}
              </Button>
            )}
          </div>
        ))}

        {/* Add more button */}
        {canEdit && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            disabled={isAdding}
            className={cn(
              "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30",
              "flex flex-col items-center justify-center gap-1",
              "hover:border-primary hover:bg-primary/5 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">Ajouter</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Count */}
      {receipts.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ImageIcon className="w-3 h-3" />
          {receipts.length} ticket{receipts.length > 1 ? 's' : ''}
        </div>
      )}

      {/* Lightbox */}
      <ReceiptLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onDelete={canEdit && onDelete ? handleDelete : undefined}
        canDelete={canEdit && !!onDelete}
      />
    </div>
  );
}
