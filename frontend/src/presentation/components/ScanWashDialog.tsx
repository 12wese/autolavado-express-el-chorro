import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/presentation/ui/dialog";
import { Button } from "@/presentation/ui/button";
import { Input } from "@/presentation/ui/input";
import { Label } from "@/presentation/ui/label";
import { Checkbox } from "@/presentation/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/ui/select";
import { QrScanner } from "@/presentation/components/QrScanner";
import { CAR_TYPES, WASH_TYPES } from "@/domain/catalog";
import { WASH_STATUS_LABELS } from "@/domain/enums/wash-status.enum";
import { useScannedVehicle } from "@/application/hooks/useScannedVehicle";
import { useServicePrices } from "@/application/hooks/useServicePrices";
import { useAddons } from "@/application/hooks/useAddons";
import { useWashers } from "@/application/hooks/useWashers";
import { useQuickCreateWashJob } from "@/application/hooks/useQuickCreateWashJob";
import { ScanLine, AlertCircle, Loader2, UserRound } from "lucide-react";
import type { BusinessRole } from "@/domain/enums/business-role.enum";
import type { WashJob } from "@/domain/entities/wash-job.entity";
import { getScannedVehicleDefaults } from "@/application/services/scanned-vehicle.service";
import { WashJobTicket } from "@/presentation/components/WashJobTicket";

interface ScanWashDialogProps {
  businessId: string;
  userId: string;
  businessName: string;
  role: BusinessRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWashCreated: () => void;
}

export function ScanWashDialog({
  businessId,
  userId,
  businessName,
  role,
  open,
  onOpenChange,
  onWashCreated,
}: ScanWashDialogProps) {
  const {
    vehicle,
    loading: lookingUp,
    error: lookupError,
    recognition,
    lookup,
    recognize,
    reset: resetLookup,
  } =
    useScannedVehicle(businessId);
  const { prices, loading: pricesLoading, loadError: pricesLoadError } =
    useServicePrices(businessId, userId, role);
  const { addons, loading: addonsLoading } = useAddons(businessId, userId, role);
  const { washers, loading: washersLoading } = useWashers(businessId, role);
  const catalogLoading = pricesLoading || addonsLoading || washersLoading;

  const [carType, setCarType] = useState("");
  const [washType, setWashType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [manualPlate, setManualPlate] = useState("");
  const [washerId, setWasherId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [ticket, setTicket] = useState<WashJob | null>(null);
  const [receiptUnavailableJobId, setReceiptUnavailableJobId] = useState<string | null>(null);
  const scanLockRef = useRef(false);
  const scanSessionRef = useRef(0);

  const { submit, computePriceBreakdown, loading, errors } = useQuickCreateWashJob(
    businessId,
    role,
    onWashCreated,
  );

  const handleDecode = useCallback(async (text: string) => {
    if (lookingUp || vehicle || scanLockRef.current) return;

    const scanSession = scanSessionRef.current;
    scanLockRef.current = true;
    try {
      const scanned = await lookup(text);
      if (scanned && scanSession === scanSessionRef.current) {
        const defaults = getScannedVehicleDefaults(scanned);
        setLicensePlate(scanned.plate);
        setCarType(defaults.carType);
        setWashType(defaults.washType);
        setAddonIds([]);
      }
    } finally {
      if (scanSession === scanSessionRef.current) scanLockRef.current = false;
    }
  }, [lookingUp, lookup, vehicle]);

  const handleAiRecognition = useCallback(async (imageBase64: string) => {
    if (lookingUp || vehicle || scanLockRef.current) return false;
    const scanSession = scanSessionRef.current;
    scanLockRef.current = true;
    try {
      const scanned = await recognize(imageBase64);
      if (!scanned || scanSession !== scanSessionRef.current) return false;
      const defaults = getScannedVehicleDefaults(scanned);
      setLicensePlate(scanned.plate);
      setCarType(defaults.carType);
      setWashType(defaults.washType);
      setAddonIds([]);
      return true;
    } finally {
      if (scanSession === scanSessionRef.current) scanLockRef.current = false;
    }
  }, [lookingUp, recognize, vehicle]);

  const resetForm = useCallback(() => {
    scanSessionRef.current += 1;
    scanLockRef.current = false;
    setTicket(null);
    setReceiptUnavailableJobId(null);
    resetLookup();
    setCarType("");
    setWashType("");
    setLicensePlate("");
    setManualPlate("");
    setWasherId(null);
    setAddonIds([]);
  }, [resetLookup]);

  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const priceBreakdown = useMemo(
    () => (carType && washType
      ? computePriceBreakdown(prices, addons, carType, washType, addonIds)
      : null),
    [carType, washType, addonIds, prices, addons, computePriceBreakdown],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const created = await submit(
      { carType, washType, licensePlate, washerId, addonIds },
      prices,
    );
    if (created?.status === "created") setTicket(created.job);
    if (created?.status === "receipt-unavailable") {
      setReceiptUnavailableJobId(created.jobId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle className="font-display flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            {ticket || receiptUnavailableJobId ? "Trabajo creado" : "Registrar vehículo por placa"}
          </DialogTitle>
          <DialogDescription>
            {ticket
              ? "El trabajo quedó registrado y este comprobante muestra los datos guardados."
              : receiptUnavailableJobId
              ? "El trabajo quedó guardado, pero no fue posible recuperar todos los datos del comprobante."
              : vehicle
              ? `Confirma los datos para registrar el vehículo ${vehicle.plate}.`
              : "Escanea un QR o apunta la cámara a una placa para consultar su historial."}
          </DialogDescription>
        </DialogHeader>

        {ticket && (
          <WashJobTicket
            businessName={businessName}
            job={ticket}
            onNewScan={resetForm}
            onClose={() => handleClose(false)}
          />
        )}

        {receiptUnavailableJobId && (
          <div className="space-y-4 p-6">
            <p role="alert" className="text-sm text-destructive">
              El trabajo se guardó correctamente, pero no se pudo cargar su comprobante.
              No lo registres de nuevo. Actualiza el tablero y contacta al administrador
              si necesitas el detalle. Referencia: {receiptUnavailableJobId}
            </p>
            <Button type="button" className="w-full" onClick={() => handleClose(false)}>
              Cerrar
            </Button>
          </div>
        )}

        {!ticket && !receiptUnavailableJobId && !vehicle && (
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="manual-scan-plate">O ingresa la placa manualmente</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-scan-plate"
                  placeholder="Ej: ABC123"
                  value={manualPlate}
                  onChange={(event) => setManualPlate(event.target.value)}
                  maxLength={20}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!manualPlate.trim() || lookingUp}
                  onClick={() => void handleDecode(manualPlate)}
                >
                  Consultar
                </Button>
              </div>
            </div>
            <QrScanner
              active={open && !vehicle}
              onDecode={handleDecode}
              onRecognizePlate={handleAiRecognition}
            />
            {recognition && (
              <p role="status" className="text-center text-sm text-muted-foreground">
                {recognition.plate
                  ? `Placa detectada: ${recognition.plate} · confianza ${Math.round(recognition.confidence * 100)}%`
                  : `No se detectó una placa legible · confianza ${Math.round(recognition.confidence * 100)}%`}
              </p>
            )}
            {lookingUp && (
              <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Consultando placa e historial...
              </p>
            )}
            {lookupError && (
              <p className="text-sm text-destructive text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" /> {lookupError}
              </p>
            )}
          </div>
        )}

        {!ticket && !receiptUnavailableJobId && vehicle && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-2">
                <span className="font-mono font-semibold">{vehicle.plate}</span>
                {vehicle.recognition && (
                  <span className="text-xs text-muted-foreground">
                    IA {Math.round(vehicle.recognition.confidence * 100)}%
                  </span>
                )}
                <span className="text-muted-foreground">
                  {vehicle.history.length
                    ? `${vehicle.history.length} registro(s) previo(s)`
                    : "Primera visita"}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Re-escanear / Limpiar
                </button>
              </div>
              {vehicle.recognition && (
                <p role="status" aria-live="polite" className="text-sm text-center text-primary">
                  Placa detectada: {vehicle.plate}
                </p>
              )}

              {vehicle.history.length > 0 && (
                <section className="space-y-2 rounded-md border p-3" aria-label="Historial reciente">
                  <h3 className="text-sm font-medium">Historial reciente de este negocio</h3>
                  <ul className="space-y-1">
                    {vehicle.history.map((job) => (
                      <li key={job.id} className="flex justify-between gap-3 text-xs text-muted-foreground">
                        <span>
                          {job.car_type} · {WASH_STATUS_LABELS[job.status]}
                        </span>
                        <span>
                          {new Date(job.created_at).toLocaleDateString()} · $
                          {job.price.toLocaleString("es-CO")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo de vehículo</Label>
                  <Select value={carType} onValueChange={setCarType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAR_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.carType && <p className="text-sm text-destructive">{errors.carType}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tipo de lavado</Label>
                  <Select value={washType} onValueChange={setWashType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {WASH_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.washType && <p className="text-sm text-destructive">{errors.washType}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scan-plate">Placa</Label>
                <Input
                  id="scan-plate"
                  placeholder="Ej: ABC123"
                  value={licensePlate}
                  onChange={(event) => setLicensePlate(event.target.value)}
                  maxLength={20}
                />
                {errors.licensePlate && (
                  <p className="text-sm text-destructive">{errors.licensePlate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserRound className="w-4 h-4" /> Lavador (opcional)
                </Label>
                <Select
                  value={washerId ?? "unassigned"}
                  onValueChange={(value) => setWasherId(value === "unassigned" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {washers.map((washer) => (
                      <SelectItem key={washer.id} value={washer.id}>{washer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {addons.length > 0 && (
                <div className="space-y-2">
                  <Label>Adiciones</Label>
                  <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                    {addons.map((addon) => (
                      <label key={addon.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={addonIds.includes(addon.id)}
                          onCheckedChange={(checked) =>
                            setAddonIds((previous) =>
                              checked
                                ? [...previous, addon.id]
                                : previous.filter((id) => id !== addon.id)
                            )
                          }
                        />
                        {addon.name} (+${addon.price.toLocaleString("es-CO")})
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t shrink-0 space-y-3">
              <div className="flex items-center justify-between rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                <span className="text-sm font-medium">Precio total</span>
                <span className="text-lg font-bold text-primary">
                  {pricesLoading ? (
                    <span className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando precios...
                    </span>
                  ) : priceBreakdown !== null ? (
                    `$${priceBreakdown.totalPrice.toLocaleString("es-CO")}`
                  ) : (
                    "—"
                  )}
                </span>
              </div>

              {priceBreakdown && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="flex justify-between gap-2">
                    <span>{washType} (base)</span>
                    <span>${priceBreakdown.basePrice.toLocaleString("es-CO")}</span>
                  </p>
                  {priceBreakdown.addons.map((addon) => (
                    <p key={addon.id} className="flex justify-between gap-2">
                      <span>{addon.name}</span>
                      <span>+${addon.price.toLocaleString("es-CO")}</span>
                    </p>
                  ))}
                </div>
              )}

              {!pricesLoading && pricesLoadError && (
                <p role="alert" className="text-sm text-destructive">
                  No se pudieron consultar las tarifas de este negocio. Revisa la conexión e inténtalo de nuevo.
                </p>
              )}

              {!pricesLoading && !pricesLoadError && prices.length === 0 && (
                <p role="alert" className="text-sm text-destructive">
                  Este negocio aún no tiene tarifas configuradas. Agrégalas en Configuración antes de crear trabajos.
                </p>
              )}

              {!catalogLoading && prices.length > 0 && carType && washType && priceBreakdown === null && (
                <p className="text-sm text-destructive">
                  No hay una tarifa para {carType} con {washType} en este negocio.
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || catalogLoading || pricesLoadError || priceBreakdown === null}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Creando..." : "Crear trabajo"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
