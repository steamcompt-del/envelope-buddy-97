/**
 * Receipt storage utilities using Supabase Storage
 * Tickets are stored in the 'receipts' bucket
 */

import { getBackendClient } from "@/lib/backendClient";
import { validateReceiptFile } from "@/lib/receiptValidation";

export interface UploadReceiptResult {
  url: string;
  path: string;
}

/**
 * Upload a receipt image to Supabase Storage
 * @param file - The image file to upload
 * @param transactionId - ID of the associated transaction (used for filename)
 */
export async function uploadReceipt(
  file: File,
  transactionId: string
): Promise<UploadReceiptResult> {
  // Validate before upload
  const validation = validateReceiptFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const supabase = getBackendClient();

  // Generate unique filename with timestamp to avoid collisions
  const fileExt = file.name.split(".").pop() || "jpg";
  const uniqueSuffix = Date.now().toString(36);
  const fileName = `${transactionId}_${uniqueSuffix}.${fileExt}`;
  const filePath = `transactions/${fileName}`;

  const { data, error } = await supabase.storage
    .from("receipts")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false, // Never overwrite existing files
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error("Erreur lors de l'upload du ticket");
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("receipts").getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
  };
}

/**
 * Delete a receipt from storage
 * @param path - The storage path of the receipt
 */
export async function deleteReceipt(path: string): Promise<void> {
  const supabase = getBackendClient();

  const { error } = await supabase.storage.from("receipts").remove([path]);

  if (error) {
    console.error("Delete error:", error);
    throw new Error("Erreur lors de la suppression du ticket");
  }
}

/**
 * Get public URL for a receipt
 * @param path - The storage path of the receipt
 */
export async function getReceiptUrl(path: string): Promise<string> {
  const supabase = getBackendClient();

  const {
    data: { publicUrl },
  } = supabase.storage.from("receipts").getPublicUrl(path);

  return publicUrl;
}

/**
 * Convert file to base64 for AI analysis
 * @param file - The image file
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 content
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
