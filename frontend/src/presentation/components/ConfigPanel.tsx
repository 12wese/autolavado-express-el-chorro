import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/presentation/ui/tabs";
import { WashersAdmin } from "@/presentation/components/WashersAdmin";
import { ServicePricesAdmin } from "@/presentation/components/ServicePricesAdmin";
import { AddonsAdmin } from "@/presentation/components/AddonsAdmin";
import type { BusinessRole } from "@/domain/enums/business-role.enum";

interface ConfigPanelProps {
  businessId: string;
  userId: string;
  role: BusinessRole;
}

export function ConfigPanel({ businessId, userId, role }: ConfigPanelProps) {
  return (
    <Tabs defaultValue="washers" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
        <TabsTrigger value="washers">Lavadores</TabsTrigger>
        <TabsTrigger value="prices">Precios</TabsTrigger>
        <TabsTrigger value="addons">Adiciones</TabsTrigger>
      </TabsList>

      <TabsContent value="washers">
        <WashersAdmin businessId={businessId} role={role} />
      </TabsContent>

      <TabsContent value="prices">
        <ServicePricesAdmin businessId={businessId} userId={userId} role={role} />
      </TabsContent>

      <TabsContent value="addons">
        <AddonsAdmin businessId={businessId} userId={userId} role={role} />
      </TabsContent>
    </Tabs>
  );
}
