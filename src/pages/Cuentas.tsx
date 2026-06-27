import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, CuentaMovimiento } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

function SkeletonRow() {
  return (
    <tr className="border-b">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-5 py-3">
          <div className="h-4 rounded bg-muted animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

interface CuentaTabProps {
  movimientos: CuentaMovimiento[];
  isLoading: boolean;
  isError: boolean;
  tipo: "cliente" | "proveedor";
  puedeRegistrar: boolean;
}

function CuentaTab({ movimientos, isLoading, isError, tipo, puedeRegistrar }: CuentaTabProps) {
  const entidades = Array.from(
    new Map(movimientos.map((m) => [m.entidad_id, m.entidad_nombre])).entries()
  ).map(([id, nombre]) => ({ id, nombre }));

  const [entidadId, setEntidadId] = useState<number | null>(null);
  const selectedId = entidadId ?? (entidades[0]?.id ?? null);

  const movsFiltrados = movimientos
    .filter((m) => m.entidad_id === selectedId)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const saldoActual = movsFiltrados[0]?.saldo_actual ?? 0;

  return (
    <div className="space-y-5">
      {isError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">Error al cargar cuentas corrientes</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <select
          value={selectedId ?? ""}
          onChange={(e) => setEntidadId(Number(e.target.value))}
          className="rounded-lg border bg-card px-3 py-2 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[220px]"
          disabled={isLoading || entidades.length === 0}
        >
          {entidades.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>

        <div className="flex items-center gap-4">
          {selectedId && !isLoading && (
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
              saldoActual > 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
            )}>
              {saldoActual > 0
                ? <TrendingUp className="h-4 w-4" />
                : <TrendingDown className="h-4 w-4" />}
              Saldo: {formatCurrency(Number(saldoActual))}
            </div>
          )}

          {puedeRegistrar ? (
            <button
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={() => alert("Formulario de registro (próximamente)")}
            >
              <PlusCircle className="h-4 w-4" />
              Registrar movimiento
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <button
                    disabled
                    className="flex items-center gap-2 rounded-lg bg-primary/40 px-4 py-2 text-sm font-medium text-primary-foreground cursor-not-allowed opacity-50"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Registrar movimiento
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Solo administradores pueden registrar movimientos
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Fecha</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Concepto</th>
              <th className="text-right px-5 py-3 font-semibold text-muted-foreground">
                {tipo === "cliente" ? "Debe (factura)" : "Debe (pago)"}
              </th>
              <th className="text-right px-5 py-3 font-semibold text-muted-foreground">
                {tipo === "cliente" ? "Haber (pago)" : "Haber (factura)"}
              </th>
              <th className="text-right px-5 py-3 font-semibold text-muted-foreground">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              : movsFiltrados.length === 0
                ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                      Sin movimientos para {tipo === "cliente" ? "este cliente" : "este proveedor"}
                    </td>
                  </tr>
                )
                : movsFiltrados.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(m.fecha)}</td>
                    <td className="px-5 py-3 text-card-foreground">
                      <div>{m.tipo === "factura" ? "Factura" : "Pago"}</div>
                      {m.observacion && (
                        <div className="text-xs text-muted-foreground">{m.observacion}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {m.debe > 0 ? (
                        <span className="text-destructive">{formatCurrency(m.debe)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {m.haber > 0 ? (
                        <span className="text-success">{formatCurrency(m.haber)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-card-foreground">
                      {formatCurrency(Number(m.saldo_actual))}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Cuentas = () => {
  const { user } = useAuth();
  const puedeRegistrar = user?.rol === 'administrador';

  const { data: cuentasClientes = [], isLoading: loadCli, isError: errCli } = useQuery({
    queryKey: ['cuentas-clientes'],
    queryFn: () => api.cuentas.getClientes(),
  });

  const { data: cuentasProveedores = [], isLoading: loadProv, isError: errProv } = useQuery({
    queryKey: ['cuentas-proveedores'],
    queryFn: () => api.cuentas.getProveedores(),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Cuentas Corrientes</h1>
          <p className="mt-1 text-muted-foreground">Seguimiento de deudas y pagos con clientes y proveedores</p>
        </div>

        <Tabs defaultValue="clientes">
          <TabsList className="mb-4">
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
          </TabsList>

          <TabsContent value="clientes">
            <CuentaTab
              movimientos={cuentasClientes}
              isLoading={loadCli}
              isError={errCli}
              tipo="cliente"
              puedeRegistrar={puedeRegistrar}
            />
          </TabsContent>

          <TabsContent value="proveedores">
            <CuentaTab
              movimientos={cuentasProveedores}
              isLoading={loadProv}
              isError={errProv}
              tipo="proveedor"
              puedeRegistrar={puedeRegistrar}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Cuentas;
