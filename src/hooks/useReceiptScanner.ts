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

export type ScanStep = "idle" | "validating" | "compressing" | "uploading" | "analyzing" | "done" | "error";

export interface ScanProgress {
  step: ScanStep;
  attempt: number;
  maxAttempts: number;
  percent: number;
}

const STEP_PERCENT: Record<ScanStep, number> = {
  idle: 0,
  validating: 10,
  compressing: 25,
  uploading: 45,
  analyzing: 70,
  done: 100,
  error: 0,
};

export function useReceiptScanner(userEnvelopes?: string[]) {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress>({
    step: "idle",
    attempt: 0,
    maxAttempts: 3,
    percent: 0,
  });
  const { get: getCached, set: setCached } = useReceiptCache();

  const updateStep = (step: ScanStep, attempt = 0) => {
    setProgress({ step, attempt, maxAttempts: 3, percent: STEP_PERCENT[step] });
  };

  const scanReceipt = async (file: File): Promise<ScanResult | null> => {
    // 1. Validate file
    updateStep("validating");
    const fileValidation = validateReceiptFile(file);
    if (!fileValidation.valid) {
      toast.error(fileValidation.error);
      updateStep("error");
      return null;
    }

    // 2. Check cache
    const cached = getCached(file);
    if (cached) {
      const validation = validateScannedData(cached);
      toast.success("Ticket déjà analysé (cache)", { duration: 2000 });
      updateStep("done");
      return { data: cached, warnings: validation.warnings, fromCache: true };
    }

    setIsScanning(true);

    try {
      // 3. Compress if needed
      updateStep("compressing");
      const compressedFile = await compressImageIfNeeded(file);

      updateStep("uploading");
      const supabase = getBackendClient();
      const base64 = await fileToBase64(compressedFile);

      // 4. Call edge function (with client-side retry tracking)
      const maxAttempts = 3;
      let lastError: Error | null = null;
      let data: any = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        updateStep("analyzing", attempt);
        setProgress(p => ({ ...p, attempt, maxAttempts }));

        try {
          const response = await supabase.functions.invoke("scan-receipt", {
            body: {
              imageBase64: base64,
              mimeType: compressedFile.type,
              userEnvelopes,
            },
          });

          if (response.error) {
            lastError = response.error;
            if (attempt < maxAttempts) {
              const delay = Math.pow(2, attempt - 1) * 1000;
              await new Promise(r => setTimeout(r, delay));
              continue;
            }
            throw lastError;
          }

          data = response.data;
          break;
        } catch (err) {
          lastError = err as Error;
          if (attempt < maxAttempts) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }
      }

      if (!data) throw lastError || new Error("Échec après plusieurs tentatives");

      if (data?.error) {
        toast.error(data.error, { duration: 6000 });
        updateStep("error");
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
        updateStep("error");
        return null;
      }

      // 6. Cache the result
      setCached(file, result);

      updateStep("done");
      toast.success("Ticket analysé avec succès !");
      return { data: result, warnings: validation.warnings, fromCache: false };
    } catch (error) {
      console.error("Error scanning receipt:", error);
      updateStep("error");
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'analyse du ticket"
      );
      return null;
    } finally {
      setIsScanning(false);
      // Reset progress after a short delay
      setTimeout(() => updateStep("idle"), 2000);
    }
  };

  return {
    isScanning,
    progress,
    scanReceipt,
  };
}
