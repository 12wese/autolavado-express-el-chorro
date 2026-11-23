import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/presentation/ui/button";
import { ArrowRight, Car, Sparkles, Clock } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { useAuthSession } from "@/application/hooks/useAuthSession";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuthSession();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-6 flex flex-col flex-1">
        {/* Header */}
        <header className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Autolavado Express El Chorro"
              className="w-12 h-12 rounded-full object-cover shadow-lg border-2 border-white/20"
            />
            <span className="font-display font-bold text-lg text-foreground">Autolavado Express El Chorro</span>
          </div>
          <Button
            onClick={() => navigate("/auth")}
            variant="outline"
            className="border-primary/20 hover:border-primary/50 hover:bg-primary/5"
          >
            Iniciar Sesión
          </Button>
        </header>

        {/* Hero */}
        <main className="max-w-4xl mx-auto text-center flex-1 flex flex-col justify-center">
          <div>
            <div className="mb-4 flex justify-center animate-slide-up">
              <img
                src={logo}
                alt="Autolavado Express El Chorro"
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover shadow-elevated border-4 border-white"
              />
            </div>

            <h1
              className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-3 leading-tight animate-slide-up"
              style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
            >
              Autolavado Express{" "}
              <span className="text-primary">El Chorro</span>
            </h1>
            <p
              className="text-base md:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto animate-slide-up"
              style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
            >
              Sistema de tablero Kanban para organizar y dar seguimiento a todos los trabajos de lavado de tu negocio.
            </p>
            <div className="animate-slide-up" style={{ animationDelay: "240ms", animationFillMode: "backwards" }}>
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft gap-2 px-8 h-12 text-base font-semibold"
              >
                Comenzar Ahora
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="row g-3 mt-4">
            {[
              {
                icon: Car,
                title: "Tipos de Auto",
                description: "Registra diferentes tipos de vehículos fácilmente",
              },
              {
                icon: Sparkles,
                title: "Tipos de Lavado",
                description: "Desde lavado básico hasta premium y pulido",
              },
              {
                icon: Clock,
                title: "Tablero Kanban",
                description: "Visualiza el estado de cada trabajo en tiempo real",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="col-12 col-md-4 bg-card rounded-2xl p-4 border border-border shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated animate-slide-up"
                style={{ animationDelay: `${320 + i * 80}ms`, animationFillMode: "backwards" }}
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-2 mx-auto">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-base mb-1">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-xs">{feature.description}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
