/**
 * Receipt file and scan data validation utilities
 */

import type { ScannedReceiptData } from '@/hooks/useReceiptScanner';

// ─── File validation ───────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateReceiptFile(file: File): FileValidationResult {
  if (file.size === 0) {
    return { valid: false, error: 'Le fichier est vide.' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum : 10MB.`,
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Format non supporté (${file.type || 'inconnu'}). Formats acceptés : JPG, PNG, WEBP.`,
    };
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
    return {
      valid: false,
      error: `Extension invalide (.${fileExt || '?'}). Extensions acceptées : .jpg, .png, .webp.`,
    };
  }

  return { valid: true };
}

// ─── Image compression ────────────────────────────────────────────

const COMPRESS_THRESHOLD = 2 * 1024 * 1024; // 2MB
const MAX_DIMENSION = 1920;

export async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size < COMPRESS_THRESHOLD) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_DIMENSION) {
        height = (height * MAX_DIMENSION) / width;
        width = MAX_DIMENSION;
      }
      if (height > MAX_DIMENSION) {
        width = (width * MAX_DIMENSION) / height;
        height = MAX_DIMENSION;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        0.85,
      );

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
}

// ─── Scan data validation ─────────────────────────────────────────

export interface ScanValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateScannedData(data: ScannedReceiptData): ScanValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Critical: amount is 0 or negative
  if (!data.amount || data.amount <= 0) {
    errors.push('Le montant scanné est invalide (0€). Vérifiez le ticket.');
  }

  // Suspiciously high
  if (data.amount > 10000) {
    errors.push(`Le montant scanné (${data.amount}€) semble anormalement élevé.`);
  }

  // Items coverage check
  if (data.items && data.items.length > 0 && data.amount > 0) {
    const itemsTotal = data.items.reduce((sum, item) => sum + item.total_price, 0);
    const percentCovered = (itemsTotal / data.amount) * 100;

    if (percentCovered < 50) {
      warnings.push(
        `Les articles détectés (${itemsTotal.toFixed(2)}€) ne représentent que ${percentCovered.toFixed(0)}% du total (${data.amount.toFixed(2)}€). Certains articles n'ont peut-être pas été lus.`,
      );
    }

    if (itemsTotal > data.amount * 1.1) {
      warnings.push(
        `La somme des articles (${itemsTotal.toFixed(2)}€) dépasse le total (${data.amount.toFixed(2)}€). Vérifiez les données.`,
      );
    }
  }

  // No items detected
  if (!data.items || data.items.length === 0) {
    warnings.push('Aucun article détecté sur le ticket.');
  }

  // Unknown merchant
  if (!data.merchant || data.merchant === 'Inconnu') {
    warnings.push("Le nom du magasin n'a pas pu être lu.");
  }

  return { valid: errors.length === 0, warnings, errors };
}
