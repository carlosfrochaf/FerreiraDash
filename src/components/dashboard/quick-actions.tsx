import Link from "next/link";
import { PlusCircle, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button asChild variant="default" size="lg" className="h-16 text-base bg-primary hover:bg-primary/90 text-primary-foreground">
        <Link href="/lancamentos/novo">
          <PlusCircle className="h-6 w-6" />
          Novo Lançamento
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="h-16 text-base border-primary/30 text-primary hover:bg-primary/5">
        <Link href="/repasse">
          <ArrowLeftRight className="h-6 w-6" />
          Repasse Jurídico
        </Link>
      </Button>
    </div>
  );
}
