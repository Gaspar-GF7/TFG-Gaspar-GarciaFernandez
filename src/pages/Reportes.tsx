import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, TrendingUp, RotateCcw, Users, XCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function MetricCard({ title, value, sub, icon: Icon, variant = "default" }: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; variant?: "default" | "warning" | "destructive" | "success";
}) {
  const color = {
    default:     "bg-primary/10 text-primary",
    warning:     "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    success:     "bg-success/10 text-success",
  }[variant];
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-display font-bold text-card-foreground">{value}</p>
          {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("rounded-lg p-3", color)}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      <div className="h-8 w-24 rounded bg-muted animate-pulse" />
    </div>
  );
}

const Reportes = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirigir si no es administrador — combinamos guard sincrónico + toast en efecto
  useEffect(() => {
    if (!loading && user && user.rol !== 'administrador') {
      toast.error("No tenés permiso para acceder a Reportes");
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // Guard sincrónico: evita que el contenido se pinte ni un frame para no-admins
  if (loading || !user || user.rol !== 'administrador') return null;

  return <ReportesContent />;
};

function ReportesContent() {
  const hoy = new Date();

  const { data: ventas = [], isLoading: loadV, isError: errV } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => api.ventas.getAll(),
  });

  const { data: movimientos = [], isLoading: loadM, isError: errM } = useQuery({
    queryKey: ['movimientos'],
    queryFn: () => api.movimientos.getAll(),
  });

  const { data: cuentasClientes = [], isLoading: loadC, isError: errC } = useQuery({
    queryKey: ['cuentas-clientes'],
    queryFn: () => api.cuentas.getClientes(),
  });

  const { data: inventario = [], isLoading: loadI } = useQuery({
    queryKey: ['inventario'],
    queryFn: () => api.inventario.getAll(),
  });

  const isLoading = loadV || loadM || loadC || loadI;
  const isError   = errV || errM || errC;

  // ── 1. Aging de cuentas por cobrar ──────────────────────────────────────────
  const aging = (() => {
    const grupos = { alDia: 0, vencePronto: 0, vencido: 0, vencidoGrave: 0 };
    cuentasClientes.forEach((m) => {
      if (!m.vencimiento || m.saldo_actual <= 0) { grupos.alDia += Number(m.saldo_actual); return; }
      const dias = Math.ceil((new Date(m.vencimiento).getTime() - hoy.getTime()) / 86400000);
      if (dias > 30)       grupos.alDia      += Number(m.monto);
      else if (dias > 0)   grupos.vencePronto += Number(m.monto);
      else if (dias > -60) grupos.vencido      += Number(m.monto);
      else                 grupos.vencidoGrave  += Number(m.monto);
    });
    return grupos;
  })();

  const agingChart = [
    { label: "Al día",        monto: aging.alDia },
    { label: "Vence pronto",  monto: aging.vencePronto },
    { label: "Vencido",       monto: aging.vencido },
    { label: "Vencido +60d",  monto: aging.vencidoGrave },
  ];

  // ── 2. Riesgo de mora ────────────────────────────────────────────────────────
  const cuentasConVenc  = cuentasClientes.filter((m) => m.vencimiento);
  const cuentasVencidas = cuentasConVenc.filter(
    (m) => m.vencimiento && new Date(m.vencimiento) < hoy && Number(m.saldo_actual) > 0
  );
  const riesgoMora = cuentasConVenc.length > 0
    ? Math.round((cuentasVencidas.length / cuentasConVenc.length) * 100)
    : 0;

  // ── 3. Concentración por cliente ─────────────────────────────────────────────
  const saldoPorCliente = cuentasClientes.reduce<Record<string, { nombre: string; saldo: number }>>((acc, m) => {
    const key = String(m.entidad_id);
    if (!acc[key]) acc[key] = { nombre: m.entidad_nombre, saldo: 0 };
    acc[key].saldo = Number(m.saldo_actual);
    return acc;
  }, {});

  const totalSaldo = Object.values(saldoPorCliente).reduce((s, v) => s + v.saldo, 0);

  const concentracion = Object.values(saldoPorCliente)
    .filter((c) => c.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5)
    .map((c) => ({
      ...c,
      pct: totalSaldo > 0 ? Math.round((c.saldo / totalSaldo) * 100) : 0,
    }));

  const top3Pct = concentracion.slice(0, 3).reduce((s, c) => s + c.pct, 0);

  // ── 4. Rotación de inventario (últimos 30 días) ───────────────────────────────
  const hace30 = new Date(hoy); hace30.setDate(hoy.getDate() - 30);
  const salidasRecientes = movimientos
    .filter((m) => m.tipo === 'salida' && new Date(m.fecha) >= hace30)
    .reduce((s, m) => s + Number(m.cantidad), 0);

  const stockPromedio = inventario.length > 0
    ? inventario.reduce((s, i) => s + Number(i.stock_actual), 0) / inventario.length
    : 1;

  const rotacion = stockPromedio > 0 ? (salidasRecientes / stockPromedio).toFixed(2) : "—";

  // ── Ventas por mes (últimos 4 meses) ─────────────────────────────────────────
  const ventasPorMes = (() => {
    const meses: Record<string, number> = {};
    ventas.forEach((v) => {
      const k = v.fecha.slice(0, 7);
      meses[k] = (meses[k] ?? 0) + Number(v.total_monto);
    });
    return Object.entries(meses)
      .sort()
      .slice(-4)
      .map(([mes, total]) => ({
        label: new Date(mes + "-01").toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
        total,
      }));
  })();

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Reportes</h1>
          <p className="mt-1 text-muted-foreground">Análisis financiero y operativo</p>
        </div>

        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">Error al cargar datos de reportes</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <MetricCard
                title="Riesgo de mora"
                value={`${riesgoMora}%`}
                sub={`${cuentasVencidas.length} cuentas vencidas`}
                icon={AlertTriangle}
                variant={riesgoMora > 30 ? "destructive" : riesgoMora > 10 ? "warning" : "success"}
              />
              <MetricCard
                title="Concentración top 3"
                value={`${top3Pct}%`}
                sub="del saldo en 3 clientes"
                icon={Users}
                variant={top3Pct > 60 ? "warning" : "default"}
              />
              <MetricCard
                title="Saldo total clientes"
                value={formatCurrency(totalSaldo)}
                sub="cuentas por cobrar"
                icon={TrendingUp}
                variant={totalSaldo > 0 ? "destructive" : "success"}
              />
              <MetricCard
                title="Rotación de stock"
                value={`${rotacion}x`}
                sub="últimos 30 días"
                icon={RotateCcw}
                variant="default"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-display font-semibold text-card-foreground mb-4">Aging de cuentas por cobrar</h3>
            {isLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={agingChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" horizontal={false} />
                  <XAxis type="number" stroke="hsl(220,10%,46%)" fontSize={12}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="label" stroke="hsl(220,10%,46%)" fontSize={12} width={90} />
                  <Tooltip
                    contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,13%,91%)", borderRadius: "8px" }}
                    formatter={(v: number) => [formatCurrency(v), "Monto"]}
                  />
                  <Bar dataKey="monto" fill="hsl(36,90%,50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-display font-semibold text-card-foreground mb-4">Concentración por cliente</h3>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : concentracion.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin saldos pendientes</p>
            ) : (
              <div className="space-y-3">
                {concentracion.map((c, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-card-foreground truncate mr-2">{c.nombre}</span>
                      <span className="text-muted-foreground shrink-0">{formatCurrency(c.saldo)} · {c.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-display font-semibold text-card-foreground mb-4">Ventas por mes</h3>
          {isLoading ? (
            <div className="h-[220px] flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : ventasPorMes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sin ventas registradas</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ventasPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="label" stroke="hsl(220,10%,46%)" fontSize={12} />
                <YAxis stroke="hsl(220,10%,46%)" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,13%,91%)", borderRadius: "8px" }}
                  formatter={(v: number) => [formatCurrency(v), "Ventas"]}
                />
                <Bar dataKey="total" fill="hsl(220,70%,60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default Reportes;
