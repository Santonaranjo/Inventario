"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  /** Si se define, pide un motivo obligatorio (mínimo `minLength` caracteres). */
  reason?: { label: string; minLength?: number };
  onConfirm: (reason?: string) => void;
}

/** Confirmación previa para acciones destructivas (desactivar, anular, eliminar). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  destructive = true,
  pending = false,
  reason,
  onConfirm,
}: ConfirmDialogProps) {
  const [motivo, setMotivo] = useState("");
  const min = reason?.minLength ?? 3;
  const motivoInvalido = reason ? motivo.trim().length < min : false;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setMotivo("");
        onOpenChange(o);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {reason && (
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-reason">{reason.label}</Label>
            <Textarea
              id="confirm-reason"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={255}
              aria-describedby="confirm-reason-hint"
            />
            <p id="confirm-reason-hint" className="text-xs text-muted-foreground">
              Mínimo {min} caracteres.
            </p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending || motivoInvalido}
            onClick={() => onConfirm(reason ? motivo.trim() : undefined)}
          >
            {pending ? "Procesando…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
