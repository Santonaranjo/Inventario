import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/** <select> nativo con el estilo de los inputs (accesible y simple para filtros y formularios). */
export const NativeSelect = forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  function NativeSelect({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
