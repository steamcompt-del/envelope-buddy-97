import { useState } from "react";
import { toast } from "sonner";
import { fileToBase64 } from "@/lib/receiptStorage";
import { getBackendClient } from "@/lib/backendClient";
import { validateReceiptFile, compressImageIfNeeded, validateScannedData } from "@/lib/receiptValidation";
import { useReceiptCache } from "./useReceiptCache";

export interface ScannedReceiptItem {
  name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
}

export interface ScannedReceiptData {
  merchant: string;
  amount: number;
  category: string;
  description: string;
  items: ScannedReceiptItem[];
}

export interface ScanResult {
  data: ScannedReceiptData;
  warnings: string[];
  fromCache: boolean;
}

export function useReceiptScanner(userEnvelopes?: string[]) {
  const [isScanning, setIsScanning] = useState(false);
  const { get: getCached, set: setCached } = useReceiptCache();

  const scanReceipt = async (file: File): Promise<ScanResult | null> => {
    // 1. Validate file
    const fileValidation = validateReceiptFile(file);
    if (!fileValidation.valid) {
      toast.error(fileValidation.error);
      return null;
    }

    // 2. Check cache
    const cached = getCached(file);
    if (cached) {
      const validation = validateScannedData(cached);
      toast.success("Ticket déjà analysé (cache)", { duration: 2000 });
      return { data: cached, warnings: validation.warnings, fromCache: true };
    }

    setIsScanning(true);

    try {
      // 3. Compress if needed
      const compressedFile = await compressImageIfNeeded(file);

      const supabase = getBackendClient();
      const base64 = await fileToBase64(compressedFile);

      // 4. Call edge function
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: {
          imageBase64: base64,
          mimeType: compressedFile.type,
          userEnvelopes,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error, { duration: 6000 });
        return null;
      }

      const result: ScannedReceiptData = {
        merchant: data.merchant || "Inconnu",
        amount: data.amount || 0,
        category: data.category || "Shopping",
        description: data.description || "Achat",
        items: data.items || [],
      };

      // 5. Validate scanned data
      const validation = validateScannedData(result);

      if (!validation.valid) {
        toast.error(`Erreur de scan : ${validation.errors.join(' ')}`, { duration: 8000 });
        return null;
      }

      // 6. Cache the result
      setCached(file, result);

      toast.success("Ticket analysé avec succès !");
      return { data: result, warnings: validation.warnings, fromCache: false };
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
