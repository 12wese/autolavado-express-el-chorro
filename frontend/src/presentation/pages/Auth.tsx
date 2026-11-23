import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/presentation/ui/button";
import { Input } from "@/presentation/ui/input";
import { Label } from "@/presentation/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/presentation/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Loader2 } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { emailSchema, passwordSchema } from "@/domain/validators/auth.validator";
import { useAuthSession } from "@/application/hooks/useAuthSession";
import * as authService from "@/application/services/auth.service";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthSession();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const { error } = await authService.signInWithPassword(email, password);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: error.message === "Invalid login credentials"
          ? "Credenciales inválidas. Verifica tu email y contraseña."
          : error.message,
      });
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const redirectUrl = `${window.location.origin}/dashboard`;

    const { error } = await authService.signUp(email, password, redirectUrl);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al registrarse",
        description: error.message === "User already registered"
          ? "Este email ya está registrado. Intenta iniciar sesión."
          : error.message,
      });
    } else {
      toast({
        title: "¡Cuenta creada!",
        description: "Tu cuenta ha sido creada exitosamente.",
      });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await authService.resetPasswordForEmail(
      email,
      `${window.location.origin}/reset-password`
    );
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });
      setForgotMode(false);
    }
  };

  const inputClass =
    "h-11 transition-colors duration-150 ease-out-strong focus-visible:border-primary";
  const primaryButtonClass =
    "w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft transition-all duration-200 active:scale-[0.98] disabled:active:scale-100";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Panel de marca — queda oculto en mobile, donde el logo aparece arriba del formulario */}
      <div className="hidden lg:flex lg:w-[45%] bg-muted relative overflow-hidden flex-col justify-between p-12 xl:p-16 text-foreground">
        <div className="absolute top-0 right-0 h-2 w-40 bg-primary rounded-bl-full" />
        <div className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full border-[32px] border-primary/10 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <img src={logo} alt="Autolavado Express El Chorro" className="w-11 h-11 rounded-full object-cover shadow-soft" />
          <span className="font-display font-bold text-lg">Autolavado Express El Chorro</span>
        </div>

        <div className="relative z-10 max-w-sm animate-fade-in">
          <h1 className="font-display text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Cada lavado, bajo control.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Organiza tu tablero de trabajos, controla el reparto con tus lavadores y revisa tus
            ingresos del mes, todo en un solo lugar.
          </p>
        </div>

        <p className="relative z-10 text-xs text-muted-foreground">
          Sistema de gestión de lavadero
        </p>
      </div>

      {/* Panel de formulario */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <img src={logo} alt="Autolavado Express El Chorro" className="w-14 h-14 rounded-full object-cover shadow-soft mb-3" />
            <span className="font-display font-bold text-lg">Autolavado Express El Chorro</span>
            <span className="text-sm text-muted-foreground">Sistema de gestión de lavadero</span>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto bg-transparent p-0 border-b border-border rounded-none mb-6">
              <TabsTrigger
                value="login"
                className="rounded-none border-b-2 border-transparent pb-3 text-muted-foreground transition-colors duration-150 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-none border-b-2 border-transparent pb-3 text-muted-foreground transition-colors duration-150 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Registrarse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {forgotMode ? (
                <form onSubmit={handleForgotPassword} className="space-y-4 animate-fade-in">
                  <p className="text-sm text-muted-foreground">
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      Email
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <Button type="submit" className={primaryButtonClass} disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? "Enviando..." : "Enviar enlace"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full transition-transform duration-150 ease-out-strong active:scale-[0.97]"
                    onClick={() => { setForgotMode(false); setErrors({}); }}
                  >
                    Volver
                  </Button>
                </form>
              ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Contraseña
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className={primaryButtonClass} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Cargando..." : "Iniciar Sesión"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setErrors({}); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors duration-150"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </form>
              )}
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Contraseña
                  </Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className={primaryButtonClass} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Cargando..." : "Crear Cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
