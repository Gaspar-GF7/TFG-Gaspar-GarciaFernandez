import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  FileText, Download, AlertCircle, TrendingUp, Users, CreditCard, Calendar,
  PackageX, RotateCw, AlertTriangle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { toast } from "@/hooks/use-toast";
import { cuentas, calcularSaldo, estaVencida, diasVencido } from "@/data/accountsData";
import { stockItems, monthlySalesData, topProducts } from "@/data/mockData";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;
const TODAY = new Date("2026-06-27");

type Tipo = "ventas" | "stock" | "cuentas";

// ===== Mock complementario de ventas (clientes) =====
const ventasMock = [
  { fecha: "2026-06-01", cliente: "Supermercado La Esquina", producto: "Papas Clásicas 200g", cantidad: 120, total: 480000, modalidad: "credito" },
  { fecha: "2026-06-03", cliente: "Distribuidora Norte SA", producto: "Papas Cheddar 150g", cantidad: 200, total: 720000, modalidad: "credito" },
  { fecha: "2026-06-05", cliente: "Kiosco Don Pepe", producto: "Papas BBQ 200g", cantidad: 30, total: 105000, modalidad: "contado" },
  { fecha: "2026-06-08", cliente: "Mayorista Central", producto: "Papas Clásicas 200g", cantidad: 350, total: 1400000, modalidad: "credito" },
  { fecha: "2026-06-10", cliente: "Almacén San Martín", producto: "Papas Light 150g", cantidad: 40, total: 120000, modalidad: "contado" },
  { fecha: "2026-06-12", cliente: "Supermercado Plaza", producto: "Papas Cheddar 150g", cantidad: 180, total: 648000, modalidad: "credito" },
  { fecha: "2026-06-15", cliente: "Distribuidora Sur", producto: "Papas Clásicas 200g", cantidad: 220, total: 880000, modalidad: "credito" },
  { fecha: "2026-06-18", cliente: "Mini Market Express", producto: "Papas Jamón 200g", cantidad: 50, total: 175000, modalidad: "contado" },
  { fecha: "2026-06-20", cliente: "Estación de Servicio YPF Ruta 8", producto: "Papas BBQ 200g", cantidad: 60, total: 210000, modalidad: "contado" },
  { fecha: "2026-06-22", cliente: "Supermercado La Esquina", producto: "Papas Cheddar 150g", cantidad: 90, total: 324000, modalidad: "credito" },
  { fecha: "2026-06-24", cliente: "Mayorista Central", producto: "Papas BBQ 200g", cantidad: 140, total: 490000, modalidad: "credito" },
  { fecha: "2026-06-25", cliente: "Drugstore Las Lomas", producto: "Papas Light 150g", cantidad: 70, total: 210000, modalidad: "contado" },
];

// ===== Mock movimientos stock =====
const movimientosStock = [
  { producto: "Papas Clásicas 200g", salidas: 3420, stockPromedio: 1100, alertas: 1 },
  { producto: "Papas Cheddar 150g", salidas: 2810, stockPromedio: 950, alertas: 0 },
  { producto: "Papas BBQ 200g", salidas: 2150, stockPromedio: 400, alertas: 4 },
  { producto: "Papas Light 150g", salidas: 1890, stockPromedio: 720, alertas: 1 },
  { producto: "Papas Jamón 200g", salidas: 1240, stockPromedio: 500, alertas: 2 },
  { producto: "Papas Picantes 200g", salidas: 0, stockPromedio: 280, alertas: 0 },
  { producto: "Papas Edición Limitada Trufa", salidas: 0, stockPromedio: 150, alertas: 0 },
];

const Reportes = () => {
  const [tipo, setTipo] = useState<Tipo>("cuentas");
  const [desde, setDesde] = useState("2026-06-01");
  const [hasta, setHasta] = useState("2026-06-27");
  const [generated, setGenerated] = useState(true);

  const validar = () => {
    if (!desde || !hasta) {
      toast({ title: "Período obligatorio", description: "Seleccioná un rango de fechas para generar el reporte.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const onGenerar = () => {
    if (!validar()) return;
    setGenerated(true);
    toast({ title: "Reporte generado", description: `Período ${desde} a ${hasta}` });
  };

  const onExportar = () => {
    if (!validar()) return;
    const wb = XLSX.utils.book_new();
    const meta = [
      ["Tipo de reporte", tipo],
      ["Período", `${desde} a ${hasta}`],
      ["Generado el", new Date().toLocaleString("es-AR")],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), "Resumen");

    let datos: any[] = [];
    let bi: any[] = [];
    if (tipo === "cuentas") {
      datos = cuentas.map((c) => ({
        Tipo: c.tipo, Nombre: c.nombre, Saldo: calcularSaldo(c),
        Vencimiento: c.fechaVencimiento, Estado: estaVencida(c, TODAY) ? "Vencido" : "Al día",
        "Días vencido": diasVencido(c, TODAY),
      }));
      bi = Object.entries(agingBuckets()).map(([bucket, v]) => ({ Bucket: bucket, Clientes: v.cliente, Proveedores: v.proveedor }));
    } else if (tipo === "ventas") {
      datos = ventasMock;
      bi = [{ "Ticket promedio": ticketPromedio.actual, "Var %": ticketPromedio.variacion, "% Crédito": modalidadVentas.credito, "% Contado": modalidadVentas.contado }];
    } else {
      datos = movimientosStock.map((m) => ({
        Producto: m.producto, Salidas: m.salidas, "Stock promedio": m.stockPromedio,
        Rotación: m.stockPromedio ? +(m.salidas / m.stockPromedio).toFixed(2) : 0,
        "Alertas críticas": m.alertas,
      }));
      bi = datos;
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(datos), "Datos");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bi), "Métricas BI");
    XLSX.writeFile(wb, `reporte_${tipo}_${desde}_${hasta}.xlsx`);
  };

  // ===== Cálculos BI =====
  function agingBuckets() {
    const buckets: Record<string, { cliente: number; proveedor: number }> = {
      "0-30": { cliente: 0, proveedor: 0 }, "31-60": { cliente: 0, proveedor: 0 },
      "61-90": { cliente: 0, proveedor: 0 }, "+90": { cliente: 0, proveedor: 0 },
    };
    cuentas.forEach((c) => {
      if (!estaVencida(c, TODAY)) return;
      const d = diasVencido(c, TODAY);
      const saldo = Math.max(0, calcularSaldo(c));
      const k = d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : "+90";
      buckets[k][c.tipo] += saldo;
    });
    return buckets;
  }

  const aging = useMemo(() => {
    const b = agingBuckets();
    return Object.entries(b).map(([bucket, v]) => ({ bucket, Clientes: v.cliente, Proveedores: v.proveedor }));
  }, []);

  const concentracion = useMemo(() => {
    const clientes = cuentas.filter((c) => c.tipo === "cliente").map((c) => ({ nombre: c.nombre, saldo: Math.max(0, calcularSaldo(c)) }));
    const total = clientes.reduce((s, c) => s + c.saldo, 0);
    const top5 = [...clientes].sort((a, b) => b.saldo - a.saldo).slice(0, 5);
    const top5sum = top5.reduce((s, c) => s + c.saldo, 0);
    return { pct: total ? (top5sum / total) * 100 : 0, top5, total };
  }, []);

  const riesgoMora = useMemo(() => {
    return cuentas
      .filter((c) => c.tipo === "cliente" && estaVencida(c, TODAY))
      .map((c) => ({ nombre: c.nombre, saldo: calcularSaldo(c), dias: diasVencido(c, TODAY) }))
      .sort((a, b) => b.saldo * b.dias - a.saldo * a.dias)
      .slice(0, 5);
  }, []);

  const proyeccion30 = useMemo(() => {
    const limite = new Date(TODAY); limite.setDate(limite.getDate() + 30);
    let cobros = 0, pagos = 0;
    cuentas.forEach((c) => {
      const v = new Date(c.fechaVencimiento);
      const saldo = Math.max(0, calcularSaldo(c));
      if (v >= TODAY && v <= limite) {
        if (c.tipo === "cliente") cobros += saldo; else pagos += saldo;
      }
    });
    return { cobros, pagos };
  }, []);

  const cumplimiento = useMemo(() => {
    const total = cuentas.length;
    const venc = cuentas.filter((c) => estaVencida(c, TODAY)).length;
    const actual = ((total - venc) / total) * 100;
    return { actual, anterior: 72.5, variacion: actual - 72.5 };
  }, []);

  // Ventas
  const ticketPromedio = useMemo(() => {
    const actual = ventasMock.reduce((s, v) => s + v.total, 0) / ventasMock.length;
    const anterior = 380000;
    return { actual, anterior, variacion: ((actual - anterior) / anterior) * 100 };
  }, []);

  const rankingClientes = useMemo(() => {
    const map: Record<string, number> = {};
    ventasMock.forEach((v) => { map[v.cliente] = (map[v.cliente] || 0) + v.total; });
    return Object.entries(map).map(([cliente, total]) => ({ cliente, total })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, []);

  const modalidadVentas = useMemo(() => {
    const total = ventasMock.reduce((s, v) => s + v.total, 0);
    const credito = ventasMock.filter((v) => v.modalidad === "credito").reduce((s, v) => s + v.total, 0);
    return { credito: (credito / total) * 100, contado: ((total - credito) / total) * 100 };
  }, []);

  const variacionVentas = useMemo(() => {
    const actual = ventasMock.reduce((s, v) => s + v.total, 0);
    const anterior = monthlySalesData[monthlySalesData.length - 1].ventas;
    return { actual, anterior, variacion: ((actual - anterior) / anterior) * 100 };
  }, []);

  // Stock
  const rotacion = movimientosStock.filter((m) => m.salidas > 0).map((m) => ({
    producto: m.producto, rotacion: +(m.salidas / m.stockPromedio).toFixed(2),
  })).sort((a, b) => b.rotacion - a.rotacion);
  const sinMovimiento = movimientosStock.filter((m) => m.salidas === 0);
  const masAlertas = [...movimientosStock].sort((a, b) => b.alertas - a.alertas).slice(0, 3);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Reportes</h1>
          <p className="mt-1 text-muted-foreground">Analítica de negocio y exportación a Excel</p>
        </div>

        {/* Selector */}
        <div className="rounded-xl border bg-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Tipo de reporte</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="cuentas">Cuentas corrientes</option>
                <option value="ventas">Ventas</option>
                <option value="stock">Stock</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Desde *</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Hasta *</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={onGenerar}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <FileText className="h-4 w-4" /> Generar
              </button>
              <button onClick={onExportar}
                className="inline-flex items-center justify-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted">
                <Download className="h-4 w-4" /> Excel
              </button>
            </div>
          </div>
          {(!desde || !hasta) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> El período es obligatorio.
            </div>
          )}
        </div>

        {generated && (
          <>
            {/* ====== BI: CUENTAS ====== */}
            {tipo === "cuentas" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard title="Concentración Top 5" value={pct(concentracion.pct)} icon={Users} variant="warning" />
                  <KpiCard title="Cobros próximos 30d" value={fmt(proyeccion30.cobros)} icon={Calendar} variant="success" />
                  <KpiCard title="Pagos próximos 30d" value={fmt(proyeccion30.pagos)} icon={Calendar} variant="warning" />
                  <KpiCard title="Cumplimiento de pago" value={pct(cumplimiento.actual)} change={cumplimiento.variacion} icon={CreditCard} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-xl border bg-card p-6">
                    <h3 className="font-display font-semibold text-card-foreground mb-4">Antigüedad de saldos (Aging)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={aging}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="bucket" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Legend />
                        <Bar dataKey="Clientes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Proveedores" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border bg-card p-6">
                    <h3 className="font-display font-semibold text-card-foreground mb-4">Ranking de riesgo de mora</h3>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 font-medium">Cliente</th>
                        <th className="text-right py-2 font-medium">Saldo</th>
                        <th className="text-right py-2 font-medium">Días</th>
                      </tr></thead>
                      <tbody>
                        {riesgoMora.map((r) => (
                          <tr key={r.nombre} className="border-b last:border-0">
                            <td className="py-2.5">{r.nombre}</td>
                            <td className="py-2.5 text-right font-mono">{fmt(r.saldo)}</td>
                            <td className="py-2.5 text-right">
                              <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">{r.dias}d</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ====== BI: VENTAS ====== */}
            {tipo === "ventas" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard title="Ticket promedio" value={fmt(ticketPromedio.actual)} change={ticketPromedio.variacion} icon={TrendingUp} />
                  <KpiCard title="Ventas período" value={fmt(variacionVentas.actual)} change={variacionVentas.variacion} icon={TrendingUp} variant="success" />
                  <KpiCard title="% Crédito" value={pct(modalidadVentas.credito)} icon={CreditCard} variant="warning" />
                  <KpiCard title="% Contado" value={pct(modalidadVentas.contado)} icon={CreditCard} variant="success" />
                </div>

                <div className="rounded-xl border bg-card p-6">
                  <h3 className="font-display font-semibold text-card-foreground mb-4">Top 10 clientes por volumen</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={rankingClientes} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                      <YAxis dataKey="cliente" type="category" className="text-xs" width={180} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ====== BI: STOCK ====== */}
            {tipo === "stock" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <KpiCard title="Productos sin movimiento" value={`${sinMovimiento.length}`} icon={PackageX} variant="warning" />
                  <KpiCard title="Producto más rotativo" value={rotacion[0]?.producto.split(" ").slice(0, 2).join(" ") || "—"} icon={RotateCw} variant="success" />
                  <KpiCard title="Alertas críticas (top)" value={`${masAlertas[0]?.alertas ?? 0}`} icon={AlertTriangle} variant="destructive" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-xl border bg-card p-6">
                    <h3 className="font-display font-semibold text-card-foreground mb-4">Índice de rotación por producto</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={rotacion}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="producto" className="text-xs" angle={-15} height={60} textAnchor="end" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="rotacion" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border bg-card p-6">
                    <h3 className="font-display font-semibold text-card-foreground mb-4">Productos con más alertas críticas</h3>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 font-medium">Producto</th>
                        <th className="text-right py-2 font-medium">Alertas</th>
                      </tr></thead>
                      <tbody>
                        {masAlertas.map((m) => (
                          <tr key={m.producto} className="border-b last:border-0">
                            <td className="py-2.5">{m.producto}</td>
                            <td className="py-2.5 text-right">
                              <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">{m.alertas}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ====== Tabla de datos ====== */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="font-display font-semibold text-card-foreground">Datos consolidados</h3>
                <span className="text-xs text-muted-foreground">{desde} → {hasta}</span>
              </div>
              <div className="overflow-x-auto">
                {tipo === "cuentas" && (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50 text-muted-foreground">
                      <th className="text-left px-6 py-3 font-semibold">Tipo</th>
                      <th className="text-left px-6 py-3 font-semibold">Nombre</th>
                      <th className="text-right px-6 py-3 font-semibold">Saldo</th>
                      <th className="text-center px-6 py-3 font-semibold">Vencimiento</th>
                      <th className="text-center px-6 py-3 font-semibold">Estado</th>
                    </tr></thead>
                    <tbody>
                      {cuentas.map((c) => {
                        const venc = estaVencida(c, TODAY);
                        return (
                          <tr key={c.id} className="border-b last:border-0">
                            <td className="px-6 py-3 capitalize text-muted-foreground">{c.tipo}</td>
                            <td className="px-6 py-3 font-medium">{c.nombre}</td>
                            <td className="px-6 py-3 text-right font-mono">{fmt(calcularSaldo(c))}</td>
                            <td className="px-6 py-3 text-center text-muted-foreground">{new Date(c.fechaVencimiento).toLocaleDateString("es-AR")}</td>
                            <td className="px-6 py-3 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${venc ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                                {venc ? "Vencido" : "Al día"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {tipo === "ventas" && (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50 text-muted-foreground">
                      <th className="text-left px-6 py-3 font-semibold">Fecha</th>
                      <th className="text-left px-6 py-3 font-semibold">Cliente</th>
                      <th className="text-left px-6 py-3 font-semibold">Producto</th>
                      <th className="text-right px-6 py-3 font-semibold">Cant.</th>
                      <th className="text-right px-6 py-3 font-semibold">Total</th>
                      <th className="text-center px-6 py-3 font-semibold">Modalidad</th>
                    </tr></thead>
                    <tbody>
                      {ventasMock.map((v, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-6 py-3 text-muted-foreground">{new Date(v.fecha).toLocaleDateString("es-AR")}</td>
                          <td className="px-6 py-3 font-medium">{v.cliente}</td>
                          <td className="px-6 py-3">{v.producto}</td>
                          <td className="px-6 py-3 text-right font-mono">{v.cantidad}</td>
                          <td className="px-6 py-3 text-right font-mono">{fmt(v.total)}</td>
                          <td className="px-6 py-3 text-center capitalize text-muted-foreground">{v.modalidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {tipo === "stock" && (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50 text-muted-foreground">
                      <th className="text-left px-6 py-3 font-semibold">Producto</th>
                      <th className="text-right px-6 py-3 font-semibold">Salidas</th>
                      <th className="text-right px-6 py-3 font-semibold">Stock prom.</th>
                      <th className="text-right px-6 py-3 font-semibold">Rotación</th>
                      <th className="text-right px-6 py-3 font-semibold">Alertas</th>
                    </tr></thead>
                    <tbody>
                      {movimientosStock.map((m) => (
                        <tr key={m.producto} className="border-b last:border-0">
                          <td className="px-6 py-3 font-medium">{m.producto}</td>
                          <td className="px-6 py-3 text-right font-mono">{m.salidas.toLocaleString()}</td>
                          <td className="px-6 py-3 text-right font-mono">{m.stockPromedio.toLocaleString()}</td>
                          <td className="px-6 py-3 text-right font-mono">{m.stockPromedio ? (m.salidas / m.stockPromedio).toFixed(2) : "—"}</td>
                          <td className="px-6 py-3 text-right">{m.alertas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Reportes;
