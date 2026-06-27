import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, TrendingUp, BarChart3, Package, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Si ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Completá tu email y contraseña");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Bienvenido a GestiónPro");
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left – brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-sidebar-accent-foreground">
              GestiónPro
            </h1>
            <p className="text-xs text-sidebar-foreground">PyME Analytics</p>
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="font-display text-4xl font-bold text-sidebar-accent-foreground leading-tight">
              Decisiones en tiempo real para tu fábrica.
            </h2>
            <p className="mt-4 text-base text-sidebar-foreground max-w-md">
              Ventas, stock y cuentas corrientes en un solo lugar. Sin esperar
              reportes en PDF.
            </p>
          </div>

          <div className="grid gap-4 max-w-md">
            {[
              { icon: BarChart3, title: "Dashboards en vivo", desc: "KPIs actualizados al instante" },
              { icon: Package, title: "Control de stock", desc: "Alertas de bajo nivel automáticas" },
              { icon: Zap, title: "Reportes a Excel", desc: "Exportá en un clic, configurable" },
            ].map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-4 p-4 rounded-xl bg-sidebar-accent/40 border border-sidebar-border backdrop-blur-sm"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sidebar-accent-foreground">{f.title}</p>
                  <p className="text-sm text-sidebar-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-sidebar-foreground">
          © {new Date().getFullYear()} GestiónPro. Todos los derechos reservados.
        </p>
      </div>

      {/* Right – form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-lg font-bold">GestiónPro</h1>
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">
              Iniciá sesión
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Accedé a tu panel de gestión y analítica.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  className="pl-10 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => toast.info("Función disponible próximamente")}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Mostrar contraseña"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Mantener sesión iniciada
              </Label>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">o continuá con</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              onClick={() => toast.info("SSO disponible próximamente")}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Solicitá acceso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
