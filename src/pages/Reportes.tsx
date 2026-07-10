import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle, TrendingUp, RotateCcw, Users, XCircle, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { api, calcEstado, type DetalleVenta, type CuentaMovimiento, type ItemInventario } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function fmtFecha(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtFechaExcel(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// ── MetricCard ────────────────────────────────────────────────────────────────

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

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-5 flex-1 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Guard ─────────────────────────────────────────────────────────────────────

const Reportes = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && user.rol !== "administrador") {
      toast.error("No tenés permiso para acceder a Reportes");
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || !user || user.rol !== "administrador") return null;
  return <ReportesContent />;
};

// ── Tab types ─────────────────────────────────────────────────────────────────

type Tab = "ventas" | "stock" | "cuentas";
const TABS: { id: Tab; label: string }[] = [
  { id: "ventas",  label: "Ventas"  },
  { id: "stock",   label: "Stock"   },
  { id: "cuentas", label: "Cuentas" },
];

// ── Sub-tables ────────────────────────────────────────────────────────────────

function VentasTable({ detalles, isLoading }: { detalles: DetalleVenta[]; isLoading: boolean }) {
  if (isLoading) return <TableSkeleton cols={6} />;
  if (!detalles.length) return <p className="text-sm text-muted-foreground text-center py-10">Sin ventas registradas</p>;
  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/50">
        <tr>
          {["Fecha", "Cliente", "Producto", "Cantidad", "Precio Unitario", "Total"].map(h => (
            <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {detalles.map(d => (
          <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
            <td className="px-4 py-3 text-muted-foreground">{fmtFecha(d.fecha)}</td>
            <td className="px-4 py-3 font-medium">{d.cliente_nombre}</td>
            <td className="px-4 py-3">{d.item_nombre}</td>
            <td className="px-4 py-3 text-right tabular-nums">{Number(d.cantidad).toLocaleString("es-AR")}</td>
            <td className="px-4 py-3 text-right tabular-nums">{fmtCurrency(Number(d.precio_unitario))}</td>
            <td className="px-4 py-3 text-right tabular-nums font-medium">
              {fmtCurrency(Number(d.cantidad) * Number(d.precio_unitario))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const ESTADO_BADGE: Record<string, string> = {
  ok:      "bg-success/10 text-success",
  bajo:    "bg-warning/10 text-warning",
  critico: "bg-destructive/10 text-destructive",
};
const ESTADO_LABEL: Record<string, string> = {
  ok: "Normal", bajo: "Bajo", critico: "Crítico",
};

function StockTable({ inventario, isLoading }: { inventario: ItemInventario[]; isLoading: boolean }) {
  if (isLoading) return <TableSkeleton cols={6} />;
  if (!inventario.length) return <p className="text-sm text-muted-foreground text-center py-10">Sin ítems en inventario</p>;
  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/50">
        <tr>
          {["Producto", "Categoría", "Unidad", "Stock Actual", "Punto de Reorden", "Estado"].map(h => (
            <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {inventario.map(i => {
          const estado = calcEstado(Number(i.stock_actual), Number(i.punto_reorden));
          return (
            <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium">{i.nombre}</td>
              <td className="px-4 py-3 text-muted-foreground">{i.categoria ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{i.unidad_medida ?? "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {Number(i.stock_actual).toLocaleString("es-AR")}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {Number(i.punto_reorden).toLocaleString("es-AR")}
              </td>
              <td className="px-4 py-3">
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", ESTADO_BADGE[estado])}>
                  {ESTADO_LABEL[estado]}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CuentasTable({
  clientes, proveedores, isLoading,
}: { clientes: CuentaMovimiento[]; proveedores: CuentaMovimiento[]; isLoading: boolean }) {
  if (isLoading) return <TableSkeleton cols={7} />;
  const todas = [
    ...clientes.map(c => ({ ...c, _entidad: "Cliente" as const })),
    ...proveedores.map(c => ({ ...c, _entidad: "Proveedor" as const })),
  ];
  if (!todas.length) return <p className="text-sm text-muted-foreground text-center py-10">Sin movimientos de cuenta</p>;
  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/50">
        <tr>
          {["Nombre", "", "Movimiento", "Monto", "Saldo Actual", "Fecha", "Vencimiento"].map((h, i) => (
            <th key={i} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {todas.map((c, i) => (
          <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
            <td className="px-4 py-3 font-medium">{c.entidad_nombre}</td>
            <td className="px-4 py-3">
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                c._entidad === "Cliente"
                  ? "bg-primary/10 text-primary"
                  : "bg-purple-500/10 text-purple-600"
              )}>
                {c._entidad}
              </span>
            </td>
            <td className="px-4 py-3">
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                c.tipo === "factura"
                  ? "bg-warning/10 text-warning"
                  : "bg-success/10 text-success"
              )}>
                {c.tipo === "factura" ? "Factura" : "Pago"}
              </span>
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{fmtCurrency(Number(c.monto))}</td>
            <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtCurrency(Number(c.saldo_actual))}</td>
            <td className="px-4 py-3 text-muted-foreground">{fmtFecha(c.fecha)}</td>
            <td className="px-4 py-3 text-muted-foreground">{fmtFecha(c.vencimiento)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

function ReportesContent() {
  const hoy = new Date();
  const [activeTab, setActiveTab] = useState<Tab>("ventas");

  const { data: ventas = [], isLoading: loadV, isError: errV } = useQuery({
    queryKey: ["ventas"],
    queryFn: () => api.ventas.getAll(),
  });

  const { data: detalles = [], isLoading: loadD } = useQuery({
    queryKey: ["ventas-detalles"],
    queryFn: () => api.ventas.getDetalles(),
  });

  const { data: movimientos = [], isLoading: loadM, isError: errM } = useQuery({
    queryKey: ["movimientos"],
    queryFn: () => api.movimientos.getAll(),
  });

  const { data: cuentasClientes = [], isLoading: loadCC, isError: errCC } = useQuery({
    queryKey: ["cuentas-clientes"],
    queryFn: () => api.cuentas.getClientes(),
  });

  const { data: cuentasProveedores = [], isLoading: loadCP } = useQuery({
    queryKey: ["cuentas-proveedores"],
    queryFn: () => api.cuentas.getProveedores(),
  });

  const { data: inventario = [], isLoading: loadI } = useQuery({
    queryKey: ["inventario"],
    queryFn: () => api.inventario.getAll(),
  });

  const isLoading = loadV || loadM || loadCC || loadI || loadD || loadCP;
  const isError   = errV || errM || errCC;

  // ── Analytics ──────────────────────────────────────────────────────────────

  const aging = (() => {
    const g = { alDia: 0, vencePronto: 0, vencido: 0, vencidoGrave: 0 };
    cuentasClientes.forEach((m) => {
      if (!m.vencimiento || m.saldo_actual <= 0) { g.alDia += Number(m.saldo_actual); return; }
      const dias = Math.ceil((new Date(m.vencimiento).getTime() - hoy.getTime()) / 86400000);
      if (dias > 30)       g.alDia       += Number(m.monto);
      else if (dias > 0)   g.vencePronto += Number(m.monto);
      else if (dias > -60) g.vencido      += Number(m.monto);
      else                 g.vencidoGrave += Number(m.monto);
    });
    return g;
  })();

  const agingChart = [
    { label: "Al día",       monto: aging.alDia },
    { label: "Vence pronto", monto: aging.vencePronto },
    { label: "Vencido",      monto: aging.vencido },
    { label: "Vencido +60d", monto: aging.vencidoGrave },
  ];

  const cuentasConVenc  = cuentasClientes.filter(m => m.vencimiento);
  const cuentasVencidas = cuentasConVenc.filter(
    m => m.vencimiento && new Date(m.vencimiento) < hoy && Number(m.saldo_actual) > 0
  );
  const riesgoMora = cuentasConVenc.length > 0
    ? Math.round((cuentasVencidas.length / cuentasConVenc.length) * 100)
    : 0;

  const saldoPorCliente = cuentasClientes.reduce<Record<string, { nombre: string; saldo: number }>>((acc, m) => {
    const key = String(m.entidad_id);
    if (!acc[key]) acc[key] = { nombre: m.entidad_nombre, saldo: 0 };
    acc[key].saldo = Number(m.saldo_actual);
    return acc;
  }, {});
  const totalSaldo = Object.values(saldoPorCliente).reduce((s, v) => s + v.saldo, 0);
  const concentracion = Object.values(saldoPorCliente)
    .filter(c => c.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5)
    .map(c => ({ ...c, pct: totalSaldo > 0 ? Math.round((c.saldo / totalSaldo) * 100) : 0 }));
  const top3Pct = concentracion.slice(0, 3).reduce((s, c) => s + c.pct, 0);

  const hace30 = new Date(hoy); hace30.setDate(hoy.getDate() - 30);
  const salidasRecientes = movimientos
    .filter(m => m.tipo === "salida" && new Date(m.fecha) >= hace30)
    .reduce((s, m) => s + Number(m.cantidad), 0);
  const stockPromedio = inventario.length > 0
    ? inventario.reduce((s, i) => s + Number(i.stock_actual), 0) / inventario.length
    : 1;
  const rotacion = stockPromedio > 0 ? (salidasRecientes / stockPromedio).toFixed(2) : "—";

  const ventasPorMes = (() => {
    const meses: Record<string, number> = {};
    ventas.forEach(v => {
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

  // ── Export ─────────────────────────────────────────────────────────────────

  function exportarExcel() {
    const fechaHoy = new Date().toISOString().slice(0, 10);
    const filename = `Reporte_GestionPro_${fechaHoy}.xlsx`;
    let rows: Record<string, string | number>[] = [];
    let sheetName: string;

    switch (activeTab) {
      case "ventas": {
        sheetName = "Ventas";
        rows = detalles.map(d => ({
          Fecha: fmtFechaExcel(d.fecha),
          Cliente: d.cliente_nombre,
          Producto: d.item_nombre,
          Cantidad: Number(d.cantidad),
          "Precio Unitario": Number(d.precio_unitario),
          Total: Math.round(Number(d.cantidad) * Number(d.precio_unitario) * 100) / 100,
        }));
        break;
      }
      case "stock": {
        sheetName = "Stock";
        rows = inventario.map(i => {
          const e = calcEstado(Number(i.stock_actual), Number(i.punto_reorden));
          return {
            Producto: i.nombre,
            Categoría: i.categoria ?? "—",
            Unidad: i.unidad_medida ?? "—",
            "Stock Actual": Number(i.stock_actual),
            "Punto de Reorden": Number(i.punto_reorden),
            Estado: e === "ok" ? "Normal" : e === "bajo" ? "Bajo" : "Crítico",
          };
        });
        break;
      }
      case "cuentas": {
        sheetName = "Cuentas";
        const toRow = (c: CuentaMovimiento) => ({
          "Cliente/Proveedor": c.entidad_nombre,
          Tipo: c.tipo === "factura" ? "Factura" : "Pago",
          Monto: Number(c.monto),
          "Saldo Actual": Number(c.saldo_actual),
          Fecha: fmtFechaExcel(c.fecha),
          Vencimiento: fmtFechaExcel(c.vencimiento),
          Observación: c.observacion ?? "",
        });
        rows = [...cuentasClientes.map(toRow), ...cuentasProveedores.map(toRow)];
        break;
      }
    }

    if (!rows.length) {
      toast.warning("No hay datos para exportar en esta sección");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const keys = Object.keys(rows[0]);
    ws["!cols"] = keys.map(key => ({
      wch: Math.max(key.length + 2, ...rows.map(r => String(r[key] ?? "").length + 1)),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
    toast.success(`"${filename}" descargado`);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Reportes</h1>
            <p className="mt-1 text-muted-foreground">Análisis financiero y operativo</p>
          </div>
          <Button onClick={exportarExcel} disabled={isLoading} className="shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">Error al cargar datos de reportes</p>
          </div>
        )}

        {/* Metrics */}
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
                value={fmtCurrency(totalSaldo)}
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

        {/* Tabs + data tables */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex border-b">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            {activeTab === "ventas"  && <VentasTable  detalles={detalles}    isLoading={loadD} />}
            {activeTab === "stock"   && <StockTable   inventario={inventario} isLoading={loadI} />}
            {activeTab === "cuentas" && (
              <CuentasTable
                clientes={cuentasClientes}
                proveedores={cuentasProveedores}
                isLoading={loadCC || loadCP}
              />
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-display font-semibold text-card-foreground mb-4">
              Aging de cuentas por cobrar
            </h3>
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
                    formatter={(v: number) => [fmtCurrency(v), "Monto"]}
                  />
                  <Bar dataKey="monto" fill="hsl(36,90%,50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-display font-semibold text-card-foreground mb-4">
              Concentración por cliente
            </h3>
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
                      <span className="text-muted-foreground shrink-0">
                        {fmtCurrency(c.saldo)} · {c.pct}%
                      </span>
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
                <YAxis stroke="hsl(220,10%,46%)" fontSize={12}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,13%,91%)", borderRadius: "8px" }}
                  formatter={(v: number) => [fmtCurrency(v), "Ventas"]}
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
