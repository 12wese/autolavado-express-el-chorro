import { useState } from "react";
import { Button } from "@/presentation/ui/button";
import { Input } from "@/presentation/ui/input";
import { Card, CardContent } from "@/presentation/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/presentation/ui/dialog";
import { useWashers } from "@/application/hooks/useWashers";
import { WasherQrCode } from "@/presentation/components/WasherQrCode";
import type { Washer } from "@/domain/entities/washer.entity";
import type { BusinessRole } from "@/domain/enums/business-role.enum";
import { Plus, QrCode, Trash2 } from "lucide-react";

interface WashersAdminProps {
  businessId: string;
  role: BusinessRole;
}

export function WashersAdmin({ businessId, role }: WashersAdminProps) {
  const { washers, loading, addWasher, removeWasher } = useWashers(businessId, role);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [qrWasher, setQrWasher] = useState<Washer | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await addWasher(name, email)) {
      setName("");
      setEmail("");
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Nombre del lavador"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />
        <Input
          type="email"
          placeholder="Correo de su cuenta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={320}
        />
        <Button type="submit" className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Agregar
        </Button>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando lavadores...</p>
      ) : washers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Todavía no has agregado lavadores.
        </p>
      ) : (
        <div className="space-y-2">
          {washers.map((washer) => (
            <Card key={washer.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <span className="font-medium">{washer.name}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setQrWasher(washer)} title="Ver código QR">
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWasher(washer.id)}
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

      <Dialog open={!!qrWasher} onOpenChange={(open) => !open && setQrWasher(null)}>
        <DialogContent className="w-[90vw] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{qrWasher?.name}</DialogTitle>
          </DialogHeader>
          {qrWasher && (
            <div className="flex flex-col items-center gap-3 py-2">
              <WasherQrCode token={qrWasher.qr_token} size={220} />
              <p className="text-xs text-muted-foreground text-center">
                Envía al lavador la invitación y el enlace de registro. Después de verificar esa misma
                dirección de correo, podrá consultar sus trabajos asignados.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
