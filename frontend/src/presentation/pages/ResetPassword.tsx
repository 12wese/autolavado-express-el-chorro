import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/presentation/ui/button";
import { Input } from "@/presentation/ui/input";
import { Label } from "@/presentation/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import logo from "@/assets/logo.jpg";
import * as authService from "@/application/services/auth.service";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    authService.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Contraseña muy corta", description: "Debe tener al menos 6 caracteres." });
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: "Las contraseñas no coinciden" });
      return;
    }
    setLoading(true);
    const { error } = await authService.updatePassword(password);
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Error al cambiar la contraseña", description: error.message });
      return;
    }
    toast({ title: "Contraseña actualizada", description: "Ya puedes usar tu nueva contraseña." });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elevated relative z-10 border-border">
        <CardHeader className="text-center space-y-4">
          <img src={logo} alt="Autolavado Express El Chorro" className="mx-auto w-16 h-16 rounded-full object-cover shadow-soft" />
          <div>
            <CardTitle className="text-2xl font-display">Nueva contraseña</CardTitle>
            <CardDescription>
              {ready ? "Ingresa tu nueva contraseña" : "Abre el enlace enviado a tu correo para continuar"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Nueva contraseña
              </Label>
              <Input id="new-password" type="password" placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Confirmar contraseña
              </Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} className="h-11" />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading || !ready}>
              {loading ? "Guardando..." : "Cambiar contraseña"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/auth")}>
              Volver al inicio de sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
