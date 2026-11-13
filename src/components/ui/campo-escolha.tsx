import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Caixa de escolha nativa (abre a lista do celular), com o visual dos outros campos. */
export const CampoEscolha = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className={cn("relative min-w-0", className)}>
      <select
        ref={ref}
        className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-background pl-3 pr-9 text-sm [color-scheme:dark] transition-colors hover:border-primary/40 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
);
CampoEscolha.displayName = "CampoEscolha";
