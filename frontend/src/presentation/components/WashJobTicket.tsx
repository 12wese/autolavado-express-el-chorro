import type { WashJob } from "@/domain/entities/wash-job.entity";
import { WASH_STATUS_LABELS } from "@/domain/enums/wash-status.enum";
import { Button } from "@/presentation/ui/button";

interface WashJobTicketProps {
  businessName: string;
  job: WashJob;
  onNewScan: () => void;
  onClose: () => void;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("es-CO")}`;
}

export function WashJobTicket({ businessName, job, onNewScan, onClose }: WashJobTicketProps) {
  const addonsTotal = job.addons.reduce((total, addon) => total + addon.price_snapshot, 0);
  const basePrice = job.price - addonsTotal;
  const enteredAt = new Date(job.created_at);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
      <article
        aria-label="Comprobante del trabajo creado"
        className="mx-auto w-full max-w-sm border border-dashed bg-card p-5 font-mono text-sm shadow-sm"
      >
        <header className="space-y-1 border-b border-dashed pb-3 text-center">
          <h2 className="font-bold">{businessName || "Autolavado Express El Chorro"}</h2>
          <p className="text-xs tracking-widest">COMPROBANTE DE INGRESO</p>
        </header>

        <dl className="space-y-1 border-b border-dashed py-3 text-xs">
          <div className="flex justify-between gap-3">
            <dt>Fecha y hora</dt>
            <dd className="text-right">
              {Number.isNaN(enteredAt.getTime())
                ? job.created_at
                : enteredAt.toLocaleString("es-CO")}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Placa</dt>
            <dd className="font-bold">{job.license_plate}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Vehículo</dt>
            <dd>{job.car_type}</dd>
          </div>
        </dl>

        <section className="space-y-2 border-b border-dashed py-3">
          <h3 className="text-center text-xs font-bold tracking-wider">SERVICIOS</h3>
          <div className="flex justify-between gap-3">
            <span>{job.wash_type}</span>
            <span>{formatCurrency(basePrice)}</span>
          </div>
          {job.addons.map((addon) => (
            <div key={addon.id} className="flex justify-between gap-3 text-xs">
              <span>{addon.addon_name_snapshot}</span>
              <span>{formatCurrency(addon.price_snapshot)}</span>
            </div>
          ))}
        </section>

        <div className="flex justify-between gap-3 border-b border-dashed py-3 font-bold">
          <span>TOTAL A PAGAR</span>
          <span>{formatCurrency(job.price)}</span>
        </div>

        <p className="pt-3 text-center font-bold">
          Estado: {WASH_STATUS_LABELS[job.status]}
        </p>
      </article>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onNewScan}>Nuevo escaneo</Button>
        <Button type="button" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}
