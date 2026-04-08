import { DollarSign, ShoppingCart, Package, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { dailySalesData, topProducts, kpiData } from "@/data/mockData";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const Dashboard = () => {
  const ventasCambio = ((kpiData.ventasHoy - kpiData.ventasAyer) / kpiData.ventasAyer) * 100;
  const ventasMesCambio = ((kpiData.ventasMes - kpiData.ventasMesAnterior) / kpiData.ventasMesAnterior) * 100;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Resumen de tu negocio en tiempo real</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Ventas Hoy" value={formatCurrency(kpiData.ventasHoy)} change={ventasCambio} icon={DollarSign} />
          <KpiCard title="Ventas del Mes" value={formatCurrency(kpiData.ventasMes)} change={ventasMesCambio} icon={ShoppingCart} />
          <KpiCard title="Productos Vendidos" value={kpiData.productosVendidosHoy.toLocaleString()} icon={Package} variant="success" />
          <KpiCard
            title="Alertas de Stock"
            value={`${kpiData.stockBajo + kpiData.stockCritico} items`}
            icon={AlertTriangle}
            variant={kpiData.stockCritico > 0 ? "destructive" : "warning"}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border bg-card p-6">
            <h3 className="font-display font-semibold text-card-foreground mb-4">Ventas vs Gastos — Última semana</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailySalesData}>
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
                  formatter={(value: number) => [formatCurrency(value)]}
                />
                <Area type="monotone" dataKey="ventas" stroke="hsl(36,90%,50%)" fill="url(#ventasGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="gastos" stroke="hsl(200,70%,50%)" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-display font-semibold text-card-foreground mb-4">Productos Top</h3>
            <div className="space-y-4">
              {topProducts.map((product, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-card-foreground font-medium">{product.name}</span>
                    <span className="text-muted-foreground">{product.porcentaje}%</span>
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
