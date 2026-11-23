import { useState } from "react";
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
import { Car, Droplets, User, DollarSign, Hash } from "lucide-react";
import { useCreateWashJob } from "@/application/hooks/useCreateWashJob";
import { useAddons } from "@/application/hooks/useAddons";
import { useWashers } from "@/application/hooks/useWashers";
import type { BusinessRole } from "@/domain/enums/business-role.enum";
import { calculateTotalPrice } from "@/domain/rules/pricing.rules";
import { CAR_TYPES, WASH_TYPES } from "@/domain/catalog";

const carTypeSuggestions = CAR_TYPES;
const washTypes = WASH_TYPES;

interface NewWashDialogProps {
  businessId: string;
  userId: string;
  role: BusinessRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWashCreated: () => void;
}

export function NewWashDialog({
  businessId,
  userId,
  role,
  open,
  onOpenChange,
  onWashCreated,
}: NewWashDialogProps) {
  const [carType, setCarType] = useState("");
  const [selectedWashTypes, setSelectedWashTypes] = useState<string[]>([]);
  const [washerId, setWasherId] = useState<string | null>(null);
  const [licensePlate, setLicensePlate] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const { addons, loading: addonsLoading } = useAddons(businessId, userId, role);
  const { washers, loading: washersLoading } = useWashers(businessId, role);
  const { submit, loading, errors, setErrors } = useCreateWashJob(businessId, role, () => {
    onWashCreated();
  });
  const selectedAddons = addons.filter((addon) => addonIds.includes(addon.id));
  const basePriceValue = Number.parseFloat(basePrice) || 0;
  const totalPrice = calculateTotalPrice(basePriceValue, selectedAddons);

  const resetForm = () => {
    setCarType("");
    setSelectedWashTypes([]);
    setWasherId(null);
    setLicensePlate("");
    setBasePrice("");
    setAddonIds([]);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const created = await submit({
      carType,
      washTypes: selectedWashTypes,
      washerId,
      licensePlate,
      basePrice: basePriceValue,
      addonIds,
    });

    if (created) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle className="font-display">Nuevo Trabajo de Lavado</DialogTitle>
          <DialogDescription>
            Ingresa los detalles del nuevo trabajo de lavado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {/* Tipo de Auto */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Car className="w-4 h-4 text-muted-foreground" />
                Tipo de Auto
              </Label>
              <div className="grid grid-cols-3 gap-2 border rounded-md p-3">
                {carTypeSuggestions.map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={carType === type}
                      onCheckedChange={(checked) => setCarType(checked ? type : "")}
                    />
                    {type}
                  </label>
                ))}
              </div>
              {errors.carType && <p className="text-sm text-destructive">{errors.carType}</p>}
            </div>

            {/* Tipo de Lavado */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Droplets className="w-4 h-4 text-muted-foreground" />
                Tipo de Lavado
              </Label>
              <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                {washTypes.map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedWashTypes.includes(type)}
                      onCheckedChange={(checked) =>
                        setSelectedWashTypes((prev) =>
                          checked ? [...prev, type] : prev.filter((t) => t !== type)
                        )
                      }
                    />
                    {type}
                  </label>
                ))}
              </div>
              {errors.washTypes && <p className="text-sm text-destructive">{errors.washTypes}</p>}
            </div>

            {/* Lavador + Placa en fila */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Lavador
                </Label>
                <Select
                  value={washerId ?? "unassigned"}
                  onValueChange={(value) => setWasherId(value === "unassigned" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un lavador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {washers.map((washer) => (
                      <SelectItem key={washer.id} value={washer.id}>{washer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {washersLoading && <p className="text-xs text-muted-foreground">Cargando lavadores...</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="license-plate" className="flex items-center gap-2 text-sm font-medium">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  Placa
                </Label>
                <Input
                  id="license-plate"
                  placeholder="Ej: ABC-123"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  maxLength={20}
                />
                {errors.licensePlate && <p className="text-sm text-destructive">{errors.licensePlate}</p>}
              </div>
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
                          setAddonIds((prev) =>
                            checked
                              ? [...prev, addon.id]
                              : prev.filter((id) => id !== addon.id)
                          )
                        }
                      />
                      {addon.name} (+${addon.price.toFixed(2)})
                    </label>
                  ))}
                </div>
                {errors.addonIds && <p className="text-sm text-destructive">{errors.addonIds}</p>}
              </div>
            )}

            {/* Precio base */}
            <div className="space-y-2">
              <Label htmlFor="base-price" className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Precio base
              </Label>
              <Input
                id="base-price"
                type="number"
                placeholder="0.00"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                min="0"
                step="0.01"
              />
              {errors.basePrice && <p className="text-sm text-destructive">{errors.basePrice}</p>}
              <p className="text-sm font-semibold text-primary">
                Total estimado: ${totalPrice.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Botones fijos al fondo */}
          <div className="px-6 py-4 border-t shrink-0 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || addonsLoading || washersLoading}>
              {loading ? "Creando..." : addonsLoading || washersLoading ? "Cargando datos..." : "Crear Trabajo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
