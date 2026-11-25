import { Input } from "@/components/ui/input";

/** Campo com rótulo usado nas telas de senha. */
export function CampoRotulado({ id, rotulo, ...props }: { id: string; rotulo: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {rotulo}
      </label>
      <Input id={id} className="h-11" {...props} />
    </div>
  );
}
