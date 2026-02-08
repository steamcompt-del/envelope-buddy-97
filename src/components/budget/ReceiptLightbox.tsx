import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, X, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReceiptImage {
  id: string;
  url: string;
  fileName?: string;
}

interface ReceiptLightboxProps {
  images: ReceiptImage[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

export function ReceiptLightbox({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
  onDelete,
  canDelete = false,
}: ReceiptLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
  };

  const handleDownload = async () => {
    if (!currentImage) return;
    
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentImage.fileName || `ticket-${currentImage.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleDelete = () => {
    if (currentImage && onDelete) {
      onDelete(currentImage.id);
      if (images.length === 1) {
        onOpenChange(false);
      } else if (currentIndex >= images.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    }
  };

  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-white text-sm">
            {images.length > 1 && (
              <span>{currentIndex + 1} / {images.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="text-white hover:bg-white/20"
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <span className="text-white text-sm min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="text-white hover:bg-white/20"
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
            >
              <Download className="w-5 h-5" />
            </Button>
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Image */}
        <div className="flex items-center justify-center w-full h-[90vh] overflow-auto">
          <img
            src={currentImage.url}
            alt={currentImage.fileName || 'Ticket de caisse'}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20",
                "w-12 h-12 rounded-full"
              )}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20",
                "w-12 h-12 rounded-full"
              )}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          </>
        )}

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 p-4 bg-gradient-to-t from-black/80 to-transparent">
            {images.map((img, index) => (
              <button
                key={img.id}
                onClick={() => {
                  setCurrentIndex(index);
                  setZoom(1);
                }}
                className={cn(
                  "w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                  index === currentIndex
                    ? "border-primary ring-2 ring-primary/50"
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
