import { useState } from "react";
import { toast } from "sonner";
import { fileToBase64 } from "@/lib/receiptStorage";
import { getBackendClient } from "@/lib/backendClient";

export interface ScannedReceiptData {
  merchant: string;
  amount: number;
  category: string;
  description: string;
}

export function useReceiptScanner() {
  const [isScanning, setIsScanning] = useState(false);

  const scanReceipt = async (file: File): Promise<ScannedReceiptData | null> => {
    setIsScanning(true);

    try {
      const supabase = getBackendClient();

      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: {
          imageBase64: base64,
          mimeType: file.type,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      toast.success("Ticket analysé avec succès !");
      return data as ScannedReceiptData;
    } catch (error) {
      console.error("Error scanning receipt:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'analyse du ticket"
      );
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  return {
    isScanning,
    scanReceipt,
  };
}
