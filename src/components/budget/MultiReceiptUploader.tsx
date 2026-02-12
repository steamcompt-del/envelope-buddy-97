import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, Plus, X, Loader2, ImageIcon, Expand, CheckCircle2, AlertCircle, FileSearch, Shrink, Upload, Sparkles, Image as ImageLucide } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReceiptLightbox, ReceiptImage } from './ReceiptLightbox';
import type { ScanProgress, ScanStep } from '@/hooks/useReceiptScanner';

export interface PendingReceipt {
  id: string;
  file: File;
  previewUrl: string;
}

const STEP_LABELS: Record<ScanStep, string> = {
  idle: "",
  validating: "Vérification du fichier…",
  compressing: "Compression de l'image…",
  uploading: "Envoi au serveur…",
  analyzing: "Analyse IA en cours…",
  done: "Analyse terminée ✓",
  error: "Erreur d'analyse",
};

interface MultiReceiptUploaderProps {
  pendingReceipts: PendingReceipt[];
  onAddReceipts: (files: File[]) => void;
  onRemoveReceipt: (id: string) => void;
  onScanReceipt?: (file: File) => Promise<void>;
  isScanning?: boolean;
  scanProgress?: ScanProgress;
  disabled?: boolean;
}

export function MultiReceiptUploader({
  pendingReceipts,
  onAddReceipts,
  onRemoveReceipt,
  onScanReceipt,
  isScanning = false,
  scanProgress,
  disabled = false,
}: MultiReceiptUploaderProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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
    e.target.value = '';
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
      {/* Hidden file inputs: one for gallery (no capture), one for camera */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload buttons when no receipts */}
      {pendingReceipts.length === 0 ? (
        <div className="space-y-3">
          {isScanning ? (
            <Button
              type="button"
              variant="outline"
              disabled
              className="w-full rounded-xl h-14 bg-muted"
            >
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyse IA en cours...
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled}
                className="rounded-xl h-14 border-dashed flex flex-col gap-1"
              >
                <Camera className="w-5 h-5" />
                <span className="text-xs">Prendre une photo</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => galleryInputRef.current?.click()}
                disabled={disabled}
                className="rounded-xl h-14 border-dashed flex flex-col gap-1"
              >
                <ImageLucide className="w-5 h-5" />
                <span className="text-xs">Depuis la galerie</span>
              </Button>
            </div>
          )}
          {/* Progress indicator during scan */}
          {isScanning && scanProgress && scanProgress.step !== "idle" && (
            <ScanProgressIndicator progress={scanProgress} />
          )}
        </div>
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

            {/* Add more buttons */}
            <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isScanning || disabled}
                className="p-1.5 rounded-md hover:bg-primary/10 transition-colors disabled:opacity-50"
                title="Prendre une photo"
              >
                <Camera className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isScanning || disabled}
                className="p-1.5 rounded-md hover:bg-primary/10 transition-colors disabled:opacity-50"
                title="Depuis la galerie"
              >
                <ImageLucide className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-[9px] text-muted-foreground">Ajouter</span>
            </div>
          </div>

          {/* Count indicator */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {pendingReceipts.length} ticket{pendingReceipts.length > 1 ? 's' : ''} sélectionné{pendingReceipts.length > 1 ? 's' : ''}
            </div>
            {isScanning && scanProgress && scanProgress.step !== "idle" ? (
              <ScanProgressIndicator progress={scanProgress} compact />
            ) : isScanning ? (
              <div className="flex items-center gap-1 text-primary">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyse...
              </div>
            ) : null}
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

/* ─── Scan Progress Indicator ─────────────────────────────── */

function ScanProgressIndicator({ progress, compact = false }: { progress: ScanProgress; compact?: boolean }) {
  const label = STEP_LABELS[progress.step];
  const isError = progress.step === "error";
  const isDone = progress.step === "done";

  const stepIcon = () => {
    if (isDone) return <CheckCircle2 className="w-4 h-4 text-envelope-green" />;
    if (isError) return <AlertCircle className="w-4 h-4 text-destructive" />;
    switch (progress.step) {
      case "validating": return <FileSearch className="w-4 h-4 text-primary animate-pulse" />;
      case "compressing": return <Shrink className="w-4 h-4 text-primary animate-pulse" />;
      case "uploading": return <Upload className="w-4 h-4 text-primary animate-pulse" />;
      case "analyzing": return <Sparkles className="w-4 h-4 text-primary animate-pulse" />;
      default: return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        {stepIcon()}
        <span className={cn(isError ? "text-destructive" : isDone ? "text-envelope-green" : "text-primary")}>
          {label}
          {progress.step === "analyzing" && progress.attempt > 1 && (
            <span className="ml-1 text-muted-foreground">(tentative {progress.attempt}/{progress.maxAttempts})</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {stepIcon()}
          <span className={cn("font-medium", isError ? "text-destructive" : isDone ? "text-envelope-green" : "text-foreground")}>
            {label}
          </span>
        </div>
        {progress.step === "analyzing" && progress.attempt > 1 && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Tentative {progress.attempt}/{progress.maxAttempts}
          </span>
        )}
      </div>
      <Progress
        value={progress.percent}
        className="h-2"
      />
    </div>
  );
}
