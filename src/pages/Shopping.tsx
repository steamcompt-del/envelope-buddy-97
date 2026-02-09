import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingListContent } from '@/components/budget/ShoppingListContent';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

export default function ShoppingPage() {
  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b">
        <div className="container flex items-center gap-4 py-4">
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
      </header>

      {/* Content */}
      <div className="container py-6">
        <ShoppingListContent />
      </div>
    </div>
  );
}
