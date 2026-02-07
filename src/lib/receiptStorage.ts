/**
 * Receipt storage utilities using Supabase Storage
 * Tickets are stored in the 'receipts' bucket
 */

async function getSupabaseClient() {
  try {
    const mod = await import("@/integrations/supabase/client");
    return mod.supabase;
  } catch (e) {
    console.error("Supabase client import failed:", e);
    throw new Error("Le backend n'est pas prêt. Rafraîchis la page.");
  }
}

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
  const supabase = await getSupabaseClient();

  // Generate unique filename
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${transactionId}.${fileExt}`;
  const filePath = `transactions/${fileName}`;

  const { data, error } = await supabase.storage
    .from("receipts")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
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
  const supabase = await getSupabaseClient();

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
  const supabase = await getSupabaseClient();

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
