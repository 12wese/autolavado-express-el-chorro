import { useState } from "react";
import { Button } from "@/presentation/ui/button";
import { Input } from "@/presentation/ui/input";
import { Card, CardContent } from "@/presentation/ui/card";
import { useAddons } from "@/application/hooks/useAddons";
import type { BusinessRole } from "@/domain/enums/business-role.enum";
import { Plus, Trash2 } from "lucide-react";

interface AddonsAdminProps {
  businessId: string;
  userId: string;
  role: BusinessRole;
}

export function AddonsAdmin({ businessId, userId, role }: AddonsAdminProps) {
  const { addons, loading, addAddon, removeAddon } = useAddons(businessId, userId, role);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price) || 0;
    if (await addAddon(name, priceNum)) {
      setName("");
      setPrice("");
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input placeholder="Nombre (ej. Pulido)" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio"
          className="w-28 shrink-0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Button type="submit" className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Agregar
        </Button>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando adiciones...</p>
      ) : addons.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Todavía no has agregado adiciones.</p>
      ) : (
        <div className="space-y-2">
          {addons.map((addon) => (
            <Card key={addon.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <span className="font-medium">{addon.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">${addon.price.toFixed(2)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAddon(addon.id)}
                    title="Eliminar"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
