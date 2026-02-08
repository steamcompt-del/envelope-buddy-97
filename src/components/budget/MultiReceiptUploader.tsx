import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Plus, X, Loader2, ImageIcon, Expand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReceiptLightbox, ReceiptImage } from './ReceiptLightbox';

export interface PendingReceipt {
  id: string;
  file: File;
  previewUrl: string;
}

interface MultiReceiptUploaderProps {
  pendingReceipts: PendingReceipt[];
  onAddReceipts: (files: File[]) => void;
  onRemoveReceipt: (id: string) => void;
  onScanReceipt?: (file: File) => Promise<void>;
  isScanning?: boolean;
  disabled?: boolean;
}

export function MultiReceiptUploader({
  pendingReceipts,
  onAddReceipts,
  onRemoveReceipt,
  onScanReceipt,
  isScanning = false,
  disabled = false,
}: MultiReceiptUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    onAddReceipts(files);

    // Scan the first new receipt if handler is provided
    if (onScanReceipt && files.length > 0 && pendingReceipts.length === 0) {
      await onScanReceipt(files[0]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const lightboxImages: ReceiptImage[] = pendingReceipts.map((r) => ({
    id: r.id,
    url: r.previewUrl,
    fileName: r.file.name,
  }));

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload button when no receipts */}
      {pendingReceipts.length === 0 ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning || disabled}
          className={cn(
            "w-full rounded-xl h-14 border-dashed",
            isScanning && "bg-muted"
          )}
        >
          {isScanning ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyse IA en cours...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5 mr-2" />
              Scanner un ticket (Image)
            </>
          )}
        </Button>
      ) : (
        <>
          {/* Grid of receipts */}
          <div className="grid grid-cols-3 gap-2">
            {pendingReceipts.map((receipt, index) => (
              <div
                key={receipt.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-border group"
              >
                <img
                  src={receipt.previewUrl}
                  alt={`Ticket ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenLightbox(index)}
                    className="h-8 w-8 text-white hover:bg-white/20"
                  >
                    <Expand className="w-4 h-4" />
                  </Button>
                </div>

                {/* Remove button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemoveReceipt(receipt.id)}
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </Button>

                {/* Badge for first receipt */}
                {index === 0 && (
                  <div className="absolute bottom-1 left-1 bg-primary/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground">
                    Principal
                  </div>
                )}
              </div>
            ))}

            {/* Add more button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning || disabled}
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30",
                "flex flex-col items-center justify-center gap-1",
                "hover:border-primary hover:bg-primary/5 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Ajouter</span>
            </button>
          </div>

          {/* Count indicator */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {pendingReceipts.length} ticket{pendingReceipts.length > 1 ? 's' : ''} sélectionné{pendingReceipts.length > 1 ? 's' : ''}
            </div>
            {isScanning && (
              <div className="flex items-center gap-1 text-primary">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyse...
              </div>
            )}
          </div>
        </>
      )}

      {/* Lightbox for preview */}
      <ReceiptLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onDelete={onRemoveReceipt}
        canDelete
      />
    </div>
  );
}
