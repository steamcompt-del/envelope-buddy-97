import { useState } from 'react';
import { useBudget, defaultEnvelopeTemplates } from '@/contexts/BudgetContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { 
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet, Check
} from 'lucide-react';
import { ComponentType } from 'react';

interface CreateEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Icon mapping for type safety
const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  ShoppingCart,
  Utensils,
  Car,
  Gamepad2,
  Heart,
  ShoppingBag,
  Receipt,
  PiggyBank,
  Home,
  Plane,
  Gift,
  Music,
  Wifi,
  Smartphone,
  Coffee,
  Wallet,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Wallet;
  return <Icon className={className} />;
}

const colorOptions = [
  { name: 'blue', class: 'bg-envelope-blue' },
  { name: 'green', class: 'bg-envelope-green' },
  { name: 'orange', class: 'bg-envelope-orange' },
  { name: 'pink', class: 'bg-envelope-pink' },
  { name: 'purple', class: 'bg-envelope-purple' },
  { name: 'yellow', class: 'bg-envelope-yellow' },
  { name: 'teal', class: 'bg-envelope-teal' },
];

const iconOptions = [
  'ShoppingCart', 'Utensils', 'Car', 'Gamepad2', 'Heart', 
  'ShoppingBag', 'Receipt', 'PiggyBank', 'Home', 'Plane',
  'Gift', 'Music', 'Wifi', 'Smartphone', 'Coffee'
];

export function CreateEnvelopeDialog({ open, onOpenChange }: CreateEnvelopeDialogProps) {
  const { createEnvelope } = useBudget();
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Wallet');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [showCustom, setShowCustom] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createEnvelope(name.trim(), selectedIcon, selectedColor);
    setName('');
    setSelectedIcon('Wallet');
    setSelectedColor('blue');
    setShowCustom(false);
    onOpenChange(false);
  };
  
  const handleTemplateSelect = (template: typeof defaultEnvelopeTemplates[0]) => {
    setName(template.name);
    setSelectedIcon(template.icon);
    setSelectedColor(template.color);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle enveloppe</DialogTitle>
          <DialogDescription>
            Choisissez un modèle ou créez une enveloppe personnalisée
          </DialogDescription>
        </DialogHeader>
        
        {!showCustom ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {defaultEnvelopeTemplates.map((template) => (
                <button
                  key={template.name}
                  onClick={() => handleTemplateSelect(template)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    name === template.name 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <DynamicIcon name={template.icon} className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{template.name}</span>
                </button>
              ))}
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCustom(true)}
              className="w-full rounded-xl"
            >
              Personnaliser
            </Button>
            
            {name && (
              <Button
                onClick={handleSubmit}
                className="w-full rounded-xl gradient-primary shadow-button"
              >
                Créer "{name}"
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="envelope-name">Nom</Label>
              <Input
                id="envelope-name"
                type="text"
                placeholder="Ex: Vacances"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color.name)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all flex items-center justify-center",
                      color.class,
                      selectedColor === color.name && "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                    )}
                  >
                    {selectedColor === color.name && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Icône</Label>
              <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={cn(
                      "w-10 h-10 rounded-lg border flex items-center justify-center transition-all",
                      selectedIcon === icon 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <DynamicIcon name={icon} className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCustom(false)}
                className="flex-1 rounded-xl"
              >
                Retour
              </Button>
              <Button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 rounded-xl gradient-primary shadow-button"
              >
                Créer
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
