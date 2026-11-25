import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, UserRound, XCircle } from "lucide-react";
import { useWasherByToken } from "@/application/hooks/useWasherByToken";
import { Button } from "@/presentation/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/presentation/ui/dialog";
import { QrScanner } from "@/presentation/components/QrScanner";

interface WasherQrLookupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WasherQrLookup({ open, onOpenChange }: WasherQrLookupProps) {
  const { washer, loading, notFound, error, lookup, reset } = useWasherByToken();
  const [scanAttempt, setScanAttempt] = useState(0);

  const handleDecode = useCallback((qrValue: string) => {
    void lookup(qrValue);
  }, [lookup]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!open) {
      reset();
      setScanAttempt(0);
    }
  }, [open, reset]);

  const retry = () => {
    reset();
    setScanAttempt((attempt) => attempt + 1);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-sm">
        <DialogHeader>
          <DialogTitle>Identificar lavador por QR</DialogTitle>
          <DialogDescription>
            Apunta la cámara al código QR del lavador para validar que siga activo.
          </DialogDescription>
        </DialogHeader>

        {washer ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/40 p-5 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <p className="text-sm text-muted-foreground">Lavador activo identificado</p>
            <p className="flex items-center gap-2 font-semibold">
              <UserRound className="h-4 w-4" />
              {washer.name}
            </p>
          </div>
        ) : notFound ? (
          <div className="space-y-3 text-center">
            <XCircle className="mx-auto h-8 w-8 text-destructive" />
            <p role="alert" className="text-sm text-destructive">
              El código no coincide con ningún lavador activo. Revisa el QR e inténtalo otra vez.
            </p>
            <Button type="button" className="w-full" onClick={retry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reintentar escaneo
            </Button>
          </div>
        ) : error ? (
          <div className="space-y-3 text-center">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            <Button type="button" className="w-full" onClick={retry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : loading ? (
          <p role="status" className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Validando el token del lavador...
          </p>
        ) : (
          <div className="space-y-3">
            <QrScanner
              key={scanAttempt}
              active={open}
              onDecode={handleDecode}
              qrOnly
            />
            <p role="status" className="text-center text-xs text-muted-foreground">
              Si tarda en iniciar, confirma que el navegador tenga permiso para usar la cámara.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
