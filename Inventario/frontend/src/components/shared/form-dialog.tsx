"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Diálogo controlado para formularios de crear/editar. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto sm:max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
