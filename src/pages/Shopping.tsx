import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ShoppingListContent } from '@/components/budget/ShoppingListContent';
import { ArrowLeft, ShoppingCart, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ShoppingPage() {
  const [storeMode, setStoreMode] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Liste de courses
            </h1>
          </div>

          {/* Store Mode Toggle */}
          <button
            onClick={() => setStoreMode(!storeMode)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-sm font-medium',
              storeMode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
            )}
          >
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Magasin</span>
            <Switch
              checked={storeMode}
              onCheckedChange={setStoreMode}
              className="scale-75 -mr-1"
            />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="container py-6">
        <ShoppingListContent storeMode={storeMode} />
      </div>
    </div>
  );
}
