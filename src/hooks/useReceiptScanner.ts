import { useState } from "react";
import { toast } from "sonner";
import { fileToBase64 } from "@/lib/receiptStorage";
import { getBackendClient } from "@/lib/backendClient";

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

      // Ensure items array exists
      const result: ScannedReceiptData = {
        merchant: data.merchant || "Inconnu",
        amount: data.amount || 0,
        category: data.category || "Shopping",
        description: data.description || "Achat",
        items: data.items || [],
      };

      toast.success("Ticket analysé avec succès !");
      return result;
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
