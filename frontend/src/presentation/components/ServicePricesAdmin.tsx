import { useEffect, useState } from "react";
import { Input } from "@/presentation/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/ui/table";
import { CAR_TYPES, WASH_TYPES } from "@/domain/catalog";
import { useServicePrices } from "@/application/hooks/useServicePrices";
import type { BusinessRole } from "@/domain/enums/business-role.enum";

interface ServicePricesAdminProps {
  businessId: string;
  userId: string;
  role: BusinessRole;
}

export function ServicePricesAdmin({ businessId, userId, role }: ServicePricesAdminProps) {
  const { prices, loading, setPrice } = useServicePrices(businessId, userId, role);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const cellKey = (carType: string, washType: string) => `${carType}|${washType}`;

  useEffect(() => {
    const next: Record<string, string> = {};
    prices.forEach((p) => {
      next[cellKey(p.car_type, p.wash_type)] = p.price.toFixed(2);
    });
    setDrafts((prev) => ({ ...next, ...prev }));
  }, [prices]);

  const handleBlur = (carType: string, washType: string) => {
    const key = cellKey(carType, washType);
    const value = parseFloat(drafts[key] ?? "");
    const existing = prices.find((p) => p.car_type === carType && p.wash_type === washType);
    if (!isNaN(value) && value !== existing?.price) {
      setPrice(carType, washType, value);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando precios...</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Define el precio para cada combinación. Las celdas vacías no tienen precio automático todavía.
      </p>
      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card">Tipo de Auto</TableHead>
              {WASH_TYPES.map((washType) => (
                <TableHead key={washType} className="min-w-[120px]">
                  {washType}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {CAR_TYPES.map((carType) => (
              <TableRow key={carType}>
                <TableCell className="font-medium sticky left-0 bg-card">{carType}</TableCell>
                {WASH_TYPES.map((washType) => {
                  const key = cellKey(carType, washType);
                  return (
                    <TableCell key={key}>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="h-8 w-24"
                        value={drafts[key] ?? ""}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                        onBlur={() => handleBlur(carType, washType)}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
