// Mock receipt scanner function
// TODO: Remplacer par un appel API OpenAI Vision ici
// Exemple d'intégration future:
// const response = await openai.chat.completions.create({
//   model: "gpt-4o-mini",
//   messages: [{
//     role: "user",
//     content: [
//       { type: "text", text: "Extract merchant name, total amount, and category from this receipt" },
//       { type: "image_url", image_url: { url: base64Image } }
//     ]
//   }]
// });

export interface ScannedReceiptData {
  merchant: string;
  amount: number;
  category: string;
  description: string;
}

// Sample mock data for realistic simulation
const mockData: ScannedReceiptData[] = [
  { merchant: 'E.Leclerc', amount: 45.50, category: 'Courses', description: 'Courses alimentaires' },
  { merchant: 'Carrefour', amount: 72.30, category: 'Courses', description: 'Courses hebdomadaires' },
  { merchant: 'SNCF', amount: 35.00, category: 'Transport', description: 'Billet de train' },
  { merchant: 'McDonald\'s', amount: 12.90, category: 'Restaurant', description: 'Déjeuner' },
  { merchant: 'Fnac', amount: 89.99, category: 'Shopping', description: 'Livre et accessoires' },
  { merchant: 'Pharmacie', amount: 23.45, category: 'Santé', description: 'Médicaments' },
  { merchant: 'Netflix', amount: 15.99, category: 'Loisirs', description: 'Abonnement mensuel' },
  { merchant: 'Total Energies', amount: 65.00, category: 'Transport', description: 'Carburant' },
  { merchant: 'Uber Eats', amount: 28.50, category: 'Restaurant', description: 'Livraison repas' },
  { merchant: 'Decathlon', amount: 54.90, category: 'Shopping', description: 'Équipement sport' },
];

/**
 * Simulates AI receipt scanning with a 2-second delay
 * @param _file - The image file (not used in mock, but kept for API compatibility)
 * @returns Promise with scanned receipt data
 * 
 * IMPORTANT: Ne JAMAIS stocker l'image en localStorage (trop lourd).
 * Cette fonction extrait uniquement les données pertinentes.
 */
export async function mockScanReceipt(_file: File): Promise<ScannedReceiptData> {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return random mock data
  const randomIndex = Math.floor(Math.random() * mockData.length);
  return mockData[randomIndex];
}

// Category to envelope color mapping
export const categoryToColor: Record<string, string> = {
  'Courses': 'green',
  'Restaurant': 'orange',
  'Transport': 'blue',
  'Loisirs': 'purple',
  'Santé': 'pink',
  'Shopping': 'yellow',
  'Factures': 'teal',
  'Épargne': 'green',
};
