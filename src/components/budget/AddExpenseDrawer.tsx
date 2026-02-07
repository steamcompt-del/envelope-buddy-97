import { useState, useRef } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import { mockScanReceipt, ScannedReceiptData } from '@/lib/mockReceiptScanner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, Loader2, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddExpenseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEnvelopeId?: string;
}

export function AddExpenseDrawer({ 
  open, 
  onOpenChange,
  preselectedEnvelopeId 
}: AddExpenseDrawerProps) {
  const { envelopes, addTransaction } = useBudget();
  const [selectedEnvelope, setSelectedEnvelope] = useState(preselectedEnvelopeId || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !selectedEnvelope) return;
    
    addTransaction(selectedEnvelope, parsedAmount, description || 'Dépense', merchant || undefined);
    resetForm();
    onOpenChange(false);
  };
  
  const resetForm = () => {
    setAmount('');
    setDescription('');
    setMerchant('');
    setSelectedEnvelope('');
  };
  
  const handleScanClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsScanning(true);
    
    try {
      // TODO: Remplacer par un appel API OpenAI Vision ici
      // Ne JAMAIS stocker l'image en localStorage (trop lourd)
      // On extrait uniquement les données pertinentes
      const scannedData: ScannedReceiptData = await mockScanReceipt(file);
      
      // Auto-fill the form with scanned data
      setAmount(scannedData.amount.toString().replace('.', ','));
      setDescription(scannedData.description);
      setMerchant(scannedData.merchant);
      
      // Try to match category to envelope
      const matchingEnvelope = envelopes.find(
        env => env.name.toLowerCase() === scannedData.category.toLowerCase()
      );
      if (matchingEnvelope) {
        setSelectedEnvelope(matchingEnvelope.id);
      }
    } catch (error) {
      console.error('Error scanning receipt:', error);
    } finally {
      setIsScanning(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <DrawerTitle>Ajouter une dépense</DrawerTitle>
                <DrawerDescription>
                  Entrez manuellement ou scannez un ticket
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>
          
          <div className="p-4 pb-8">
            {/* Hidden file input for receipt scanning */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {/* Scan button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleScanClick}
              disabled={isScanning}
              className={cn(
                "w-full mb-4 rounded-xl h-14 border-dashed",
                isScanning && "bg-muted"
              )}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 mr-2" />
                  Scanner un ticket (Image)
                </>
              )}
            </Button>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expense-envelope">Enveloppe</Label>
                <Select value={selectedEnvelope} onValueChange={setSelectedEnvelope}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {envelopes.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name} ({(env.allocated - env.spent).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} restant)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Montant</Label>
                <div className="relative">
                  <Input
                    id="expense-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-2xl font-semibold pr-12 rounded-xl"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    €
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="expense-merchant">Marchand</Label>
                  <Input
                    id="expense-merchant"
                    type="text"
                    placeholder="Ex: Carrefour"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expense-description">Description</Label>
                  <Input
                    id="expense-description"
                    type="text"
                    placeholder="Ex: Courses"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedEnvelope || !amount || parseFloat(amount.replace(',', '.')) <= 0}
                  className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90"
                >
                  Dépenser
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
