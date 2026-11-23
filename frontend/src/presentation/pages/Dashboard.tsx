import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/presentation/ui/button";
import { Input } from "@/presentation/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/ui/select";
import { KanbanBoard } from "@/presentation/components/KanbanBoard";
import { NewWashDialog } from "@/presentation/components/NewWashDialog";
import { ScanWashDialog } from "@/presentation/components/ScanWashDialog";
import { WasherStats } from "@/presentation/components/WasherStats";
import { WashHistory } from "@/presentation/components/WashHistory";
import { ConfigPanel } from "@/presentation/components/ConfigPanel";
import { SemanticGraphPanel } from "@/presentation/components/SemanticGraphPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/presentation/ui/tabs";
import {
  LogOut,
  Plus,
  LayoutDashboard,
  BarChart3,
  History,
  ScanLine,
  Settings,
  Network,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpg";
import { useAuthSession } from "@/application/hooks/useAuthSession";
import { useBusinessContext } from "@/application/hooks/useBusinessContext";
import { BUSINESS_ROLE_LABELS, type BusinessRole } from "@/domain/enums/business-role.enum";
import * as authService from "@/application/services/auth.service";

export default function Dashboard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("kanban");
  const [businessName, setBusinessName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, initializing } = useAuthSession();
  const businessContext = useBusinessContext(user?.id ?? null);
  const membership = businessContext.activeMembership;
  const role = membership?.role as BusinessRole | undefined;
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!initializing && !user) navigate("/auth");
  }, [initializing, user, navigate]);

  useEffect(() => {
    if (!isAdmin && (activeTab === "config" || activeTab === "semantic")) {
      setActiveTab("kanban");
    }
  }, [activeTab, isAdmin]);

  const handleSignOut = async () => {
    await authService.signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });
    navigate("/auth");
  };

  const handleWashCreated = () => {
    setRefreshKey((prev) => prev + 1);
    toast({
      title: "¡Trabajo creado!",
      description: "El nuevo trabajo de lavado ha sido agregado.",
    });
  };

  const handleCreateBusiness = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await businessContext.addBusiness(businessName)) setBusinessName("");
  };

  if (!user || initializing || businessContext.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando negocio y permisos...</div>
      </div>
    );
  }

  if (!membership || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <section className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6">
          <h1 className="font-display text-xl font-bold">Configura tu autolavado</h1>
          <p className="text-sm text-muted-foreground">
            No tienes un negocio activo. Crea uno o confirma el correo de una invitación para unirte.
          </p>
          <form onSubmit={handleCreateBusiness} className="space-y-3">
            <Input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Nombre del autolavado"
              maxLength={120}
              minLength={2}
              required
            />
            {businessContext.error && (
              <p className="text-sm text-destructive">{businessContext.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={businessName.trim().length < 2}>
              Crear negocio
            </Button>
          </form>
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            Cerrar sesión
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Autolavado Express El Chorro"
              className="w-12 h-12 rounded-full object-cover shadow-soft"
            />
            <div>
              <h1 className="font-display font-bold text-lg">{membership.business.name}</h1>
              <p className="text-xs text-muted-foreground">
                {user.email} · {BUSINESS_ROLE_LABELS[role]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {businessContext.memberships.length > 1 && (
              <Select value={membership.business_id} onValueChange={businessContext.selectBusiness}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {businessContext.memberships.map((item) => (
                    <SelectItem key={item.business_id} value={item.business_id}>
                      {item.business.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isAdmin && (
              <>
                <Button variant="outline" onClick={() => setScanDialogOpen(true)} className="gap-2">
                  <ScanLine className="w-4 h-4" />
                  <span className="hidden sm:inline">Escanear vehículo</span>
                </Button>
                <Button onClick={() => setDialogOpen(true)} className="shadow-soft gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nuevo Lavado</span>
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? "max-w-3xl grid-cols-5" : "max-w-xl grid-cols-3"} mb-6`}>
            <TabsTrigger value="kanban" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Tablero</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Estadísticas</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Historial</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="config" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Configuración</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="semantic" className="gap-2">
                <Network className="w-4 h-4" />
                <span className="hidden sm:inline">Grafo Semántico</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="kanban">
            <KanbanBoard
              key={`${refreshKey}-${membership.business_id}`}
              businessId={membership.business_id}
              role={role}
              washerId={membership.washer_id}
            />
          </TabsContent>

          <TabsContent value="stats">
            <WasherStats
              key={`${refreshKey}-${membership.business_id}`}
              businessId={membership.business_id}
              role={role}
              washerId={membership.washer_id}
            />
          </TabsContent>

          <TabsContent value="history">
            <WashHistory
              key={`${refreshKey}-${membership.business_id}`}
              businessId={membership.business_id}
              role={role}
              washerId={membership.washer_id}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="config">
              <ConfigPanel businessId={membership.business_id} userId={user.id} role={role} />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="semantic">
              <SemanticGraphPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {isAdmin && (
        <>
          <NewWashDialog
            businessId={membership.business_id}
            userId={user.id}
            role={role}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onWashCreated={handleWashCreated}
          />
          <ScanWashDialog
            businessId={membership.business_id}
            userId={user.id}
            businessName={membership.business.name}
            role={role}
            open={scanDialogOpen}
            onOpenChange={setScanDialogOpen}
            onWashCreated={handleWashCreated}
          />
        </>
      )}
    </div>
  );
}
