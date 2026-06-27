import { useMemo, useState } from "react";
import { Wallet, TrendingDown, AlertCircle, Search, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { cuentas, calcularSaldo, estaVencida, Cuenta } from "@/data/accountsData";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const TODAY = new Date("2026-06-27");

const Cuentas = () => {
  const [tab, setTab] = useState<"cliente" | "proveedor">("cliente");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "aldia" | "vencido">("todos");
  const [selected, setSelected] = useState<Cuenta | null>(null);

  const lista = useMemo(() => {
    return cuentas
      .filter((c) => c.tipo === tab)
      .filter((c) => c.nombre.toLowerCase().includes(search.toLowerCase()))
      .filter((c) => {
        if (filter === "todos") return true;
        const venc = estaVencida(c, TODAY);
        return filter === "vencido" ? venc : !venc;
      });
  }, [tab, search, filter]);

  const todasClientes = cuentas.filter((c) => c.tipo === "cliente");
  const todosProveedores = cuentas.filter((c) => c.tipo === "proveedor");
  const totalCobrar = todasClientes.reduce((s, c) => s + Math.max(0, calcularSaldo(c)), 0);
  const totalPagar = todosProveedores.reduce((s, c) => s + Math.max(0, calcularSaldo(c)), 0);
  const vencidas = cuentas.filter((c) => estaVencida(c, TODAY)).length;

  if (selected) return <Detalle cuenta={selected} onBack={() => setSelected(null)} />;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Cuentas Corrientes</h1>
          <p className="mt-1 text-muted-foreground">Saldos y vencimientos de clientes y proveedores</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard title="Total a Cobrar" value={fmt(totalCobrar)} icon={Wallet} variant="success" />
          <KpiCard title="Total a Pagar" value={fmt(totalPagar)} icon={TrendingDown} variant="warning" />
          <KpiCard title="Cuentas Vencidas" value={`${vencidas}`} icon={AlertCircle} variant="destructive" />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {(["cliente", "proveedor"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                  tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {t === "cliente" ? "Clientes" : "Proveedores"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
              className="w-full rounded-lg border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {(["todos", "aldia", "vencido"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {f === "todos" ? "Todos" : f === "aldia" ? "Al día" : "Vencidos"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground">{tab === "cliente" ? "Cliente" : "Proveedor"}</th>
                <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Saldo</th>
                <th className="text-center px-6 py-3 font-semibold text-muted-foreground">Vencimiento</th>
                <th className="text-center px-6 py-3 font-semibold text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const saldo = calcularSaldo(c);
                const venc = estaVencida(c, TODAY);
                return (
                  <tr key={c.id} onClick={() => setSelected(c)}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-card-foreground">{c.nombre}</td>
                    <td className="px-6 py-4 text-right font-mono">{fmt(saldo)}</td>
                    <td className="px-6 py-4 text-center text-muted-foreground">
                      {new Date(c.fechaVencimiento).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                        venc ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                        {venc ? "Vencido" : "Al día"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {lista.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

const Detalle = ({ cuenta, onBack }: { cuenta: Cuenta; onBack: () => void }) => {
  const saldo = calcularSaldo(cuenta);
  const venc = estaVencida(cuenta, TODAY);

  let saldoAcum = 0;
  const movs = [...cuenta.movimientos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((m) => {
      saldoAcum += cuenta.tipo === "cliente" ? m.debe - m.haber : m.haber - m.debe;
      return { ...m, saldo: saldoAcum };
    });

  return (
    <AppLayout>
      <div className="space-y-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <div className="rounded-xl border bg-card p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{cuenta.tipo === "cliente" ? "Cliente" : "Proveedor"}</p>
            <h1 className="text-2xl font-display font-bold text-card-foreground">{cuenta.nombre}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vence: {new Date(cuenta.fechaVencimiento).toLocaleDateString("es-AR")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo actual</p>
            <p className="text-3xl font-display font-bold text-card-foreground">{fmt(saldo)}</p>
            <span className={cn("inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-semibold",
              venc ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
              {venc ? "Vencido" : "Al día"}
            </span>
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground">Fecha</th>
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground">Comprobante</th>
                <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Debe</th>
                <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Haber</th>
                <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-6 py-3 text-muted-foreground">{new Date(m.fecha).toLocaleDateString("es-AR")}</td>
                  <td className="px-6 py-3 font-medium">{m.comprobante}</td>
                  <td className="px-6 py-3 text-right font-mono">{m.debe ? fmt(m.debe) : "—"}</td>
                  <td className="px-6 py-3 text-right font-mono">{m.haber ? fmt(m.haber) : "—"}</td>
                  <td className="px-6 py-3 text-right font-mono font-semibold">{fmt(m.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default Cuentas;
