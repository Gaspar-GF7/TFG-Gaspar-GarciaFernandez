import { DollarSign, ShoppingCart, Package, AlertTriangle, XCircle, ArrowUp, ArrowDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { api, calcEstado } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function KpiSkeleton() {
  return (
    <div className="rounded-xl border p-6 bg-card space-y-3">
      <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      <div className="h-8 w-32 rounded bg-muted animate-pulse" />
      <div className="h-3 w-20 rounded bg-muted animate-pulse" />
    </div>
  );
}

const Dashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useSocket({
    'venta:nueva': () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
    },
    'stock:actualizado': () => {
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
    },
  });

  const { data: ventas = [], isLoading: loadVentas, isError: errVentas } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => api.ventas.getAll(),
  });

  const { data: inventario = [], isLoading: loadInv, isError: errInv } = useQuery({
    queryKey: ['inventario'],
    queryFn: () => api.inventario.getAll(),
  });

  const { data: movimientos = [], isLoading: loadMov } = useQuery({
    queryKey: ['movimientos'],
    queryFn: () => api.movimientos.getAll(),
  });

  const isLoading = loadVentas || loadInv || loadMov;
  const isError   = errVentas || errInv;

  // ── Derivaciones ────────────────────────────────────────────────────────────
  const hoy   = new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);
  const mesStr = hoy.toISOString().slice(0, 7);

  const ventasHoy = ventas
    .filter((v) => v.fecha.slice(0, 10) === hoyStr)
    .reduce((s, v) => s + Number(v.total_monto), 0);

  const ventasMes = ventas
    .filter((v) => v.fecha.slice(0, 7) === mesStr)
    .reduce((s, v) => s + Number(v.total_monto), 0);

  const ventasMesAnt = ventas
    .filter((v) => {
      const d = new Date(v.fecha);
      return d.getMonth() === hoy.getMonth() - 1 && d.getFullYear() === hoy.getFullYear();
    })
    .reduce((s, v) => s + Number(v.total_monto), 0);

  const ventasMesCambio = ventasMesAnt > 0
    ? ((ventasMes - ventasMesAnt) / ventasMesAnt) * 100
    : null;

  const cantVentasMes = ventas.filter((v) => v.fecha.slice(0, 7) === mesStr).length;

  const alertCount = inventario.filter(
    (i) => calcEstado(Number(i.stock_actual), Number(i.punto_reorden)) !== 'ok'
  ).length;

  const criticoCount = inventario.filter(
    (i) => calcEstado(Number(i.stock_actual), Number(i.punto_reorden)) === 'critico'
  ).length;

  // ── Gráfico últimos 7 días ───────────────────────────────────────────────────
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toISOString().slice(0, 10);
    const total = ventas
      .filter((v) => v.fecha.slice(0, 10) === dStr)
      .reduce((s, v) => s + Number(v.total_monto), 0);
    return { day: DIAS[d.getDay()], ventas: total };
  });

  // ── Top Productos por salidas ────────────────────────────────────────────────
  const salidasPorItem = movimientos
    .filter((m) => m.tipo === 'salida')
    .reduce<Record<string, number>>((acc, m) => {
      acc[m.item_nombre] = (acc[m.item_nombre] ?? 0) + Number(m.cantidad);
      return acc;
    }, {});

  // Productos terminados: se listan todos aunque todavía no tengan salidas registradas
  const productosTerminados = inventario.filter((i) => i.categoria === 'Producto terminado');

  const totalSalidas = productosTerminados.reduce(
    (s, i) => s + (salidasPorItem[i.nombre] ?? 0),
    0
  );

  // Comparación de salidas por producto contra el mes anterior
  const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const mesAntStr = inicioMesAnt.toISOString().slice(0, 7);

  const salidasPorItemEnMes = (mesTarget: string) =>
    movimientos
      .filter((m) => m.tipo === 'salida' && m.fecha.slice(0, 7) === mesTarget)
      .reduce<Record<string, number>>((acc, m) => {
        acc[m.item_nombre] = (acc[m.item_nombre] ?? 0) + Number(m.cantidad);
        return acc;
      }, {});

  const salidasMesActual = salidasPorItemEnMes(mesStr);
  const salidasMesAnterior = salidasPorItemEnMes(mesAntStr);

  const calcVariacionProducto = (nombre: string): number | null => {
    const actual = salidasMesActual[nombre] ?? 0;
    const anterior = salidasMesAnterior[nombre] ?? 0;
    if (anterior === 0) return null;
    return ((actual - anterior) / anterior) * 100;
  };

  const topProducts = productosTerminados
    .map((item) => {
      const qty = salidasPorItem[item.nombre] ?? 0;
      return {
        name: item.nombre,
        ventas: qty,
        porcentaje: totalSalidas > 0 ? Math.round((qty / totalSalidas) * 100) : 0,
        variacion: calcVariacionProducto(item.nombre),
      };
    })
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 5);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Resumen de tu negocio en tiempo real</p>
        </div>

        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">Error al cargar datos del dashboard</p>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard title="Ventas Hoy" value={formatCurrency(ventasHoy)} icon={DollarSign} />
              <KpiCard
                title="Ingresos del Mes"
                value={formatCurrency(ventasMes)}
                change={ventasMesCambio ?? undefined}
                icon={ShoppingCart}
              />
              <KpiCard
                title="Transacciones del Mes"
                value={`${cantVentasMes} ventas`}
                icon={Package}
                variant="success"
              />
              <KpiCard
                title="Alertas de Stock"
                value={`${alertCount} items`}
                icon={AlertTriangle}
                variant={criticoCount > 0 ? "destructive" : alertCount > 0 ? "warning" : "default"}
                onClick={() => navigate('/stock?filtro=alerta')}
              />
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border bg-card p-6">
            <h3 className="font-display font-semibold text-card-foreground mb-4">Ventas — Últimos 7 días</h3>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(36,90%,50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(36,90%,50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="day" stroke="hsl(220,10%,46%)" fontSize={12} />
                  <YAxis stroke="hsl(220,10%,46%)" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,13%,91%)", borderRadius: "8px" }}
                    formatter={(value: number) => [formatCurrency(value), "Ventas"]}
                  />
                  <Area type="monotone" dataKey="ventas" stroke="hsl(36,90%,50%)" fill="url(#ventasGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-display font-semibold text-card-foreground mb-4">Top Productos (salidas)</h3>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-4 rounded bg-muted animate-pulse" />
                    <div className="h-2 rounded-full bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin movimientos de salida registrados</p>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-card-foreground font-medium truncate mr-2">{product.name}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="text-muted-foreground">{product.porcentaje}%</span>
                        {product.variacion !== null && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                              product.variacion >= 0 ? "text-success" : "text-destructive"
                            }`}
                          >
                            {product.variacion >= 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            {Math.abs(Math.round(product.variacion))}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${product.porcentaje}%`, opacity: 1 - i * 0.15 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
