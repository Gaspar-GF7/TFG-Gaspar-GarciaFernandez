import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, XCircle, TrendingUp, TrendingDown, X } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, CuentaMovimiento } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";

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
  const queryClient = useQueryClient();

  useSocket({
    'cuenta:actualizada': (data: unknown) => {
      const { tipo } = data as { tipo: string };
      queryClient.invalidateQueries({
        queryKey: [tipo === 'cliente' ? 'cuentas-clientes' : 'cuentas-proveedores'],
      });
    },
  });

  const entidades = Array.from(
    new Map(movimientos.map((m) => [m.entidad_id, m.entidad_nombre])).entries()
  ).map(([id, nombre]) => ({ id, nombre }));

  const [entidadId, setEntidadId] = useState<number | null>(null);
  const selectedId = entidadId ?? (entidades[0]?.id ?? null);

  const movsFiltrados = movimientos
    .filter((m) => m.entidad_id === selectedId)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const saldoActual = movsFiltrados[0]?.saldo_actual ?? 0;

  // ── Formulario modal ───────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [formTipo, setFormTipo] = useState<"factura" | "pago">("factura");
  const [formMonto, setFormMonto] = useState("");
  const [formVencimiento, setFormVencimiento] = useState("");
  const [formObservacion, setFormObservacion] = useState("");

  function resetForm() {
    setFormTipo("factura");
    setFormMonto("");
    setFormVencimiento("");
    setFormObservacion("");
  }

  function openModal() {
    resetForm();
    setModalOpen(true);
  }

  const queryKey = tipo === "cliente" ? "cuentas-clientes" : "cuentas-proveedores";

  const mutation = useMutation({
    mutationFn: () => {
      const montoNum = parseFloat(formMonto);
      const base = {
        tipo: formTipo,
        monto: montoNum,
        ...(formVencimiento ? { vencimiento: formVencimiento } : {}),
        ...(formObservacion.trim() ? { observacion: formObservacion.trim() } : {}),
      };
      if (tipo === "cliente") {
        return api.cuentas.postCliente({ cliente_id: selectedId!, ...base });
      } else {
        return api.cuentas.postProveedor({ proveedor_id: selectedId!, ...base });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setModalOpen(false);
      toast.success("Movimiento registrado correctamente");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al registrar movimiento");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) {
      toast.error("Seleccioná un " + (tipo === "cliente" ? "cliente" : "proveedor"));
      return;
    }
    const montoNum = parseFloat(formMonto);
    if (!formMonto || isNaN(montoNum) || montoNum <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    mutation.mutate();
  }

  const entidadActual = entidades.find((e) => e.id === selectedId);

  return (
    <div className="space-y-5">
      {isError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">Error al cargar cuentas corrientes</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
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
              onClick={openModal}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
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
                      {m.debe > 0
                        ? <span className="text-destructive">{formatCurrency(m.debe)}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {m.haber > 0
                        ? <span className="text-success">{formatCurrency(m.haber)}</span>
                        : <span className="text-muted-foreground">—</span>}
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

      {/* ── Modal de registro ──────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !mutation.isPending && setModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <div>
                <h2 className="text-lg font-display font-semibold text-card-foreground">
                  Registrar movimiento
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {tipo === "cliente" ? "Cliente" : "Proveedor"}: {entidadActual?.nombre ?? "—"}
                </p>
              </div>
              <button
                onClick={() => !mutation.isPending && setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Tipo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">Tipo *</label>
                <div className="flex gap-2">
                  {(["factura", "pago"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormTipo(t)}
                      className={cn(
                        "flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                        formTipo === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {t === "factura" ? "Factura" : "Pago"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monto */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formMonto}
                    onChange={(e) => setFormMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border bg-background pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                </div>
              </div>

              {/* Vencimiento — solo para facturas */}
              {formTipo === "factura" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground">
                    Vencimiento <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={formVencimiento}
                    onChange={(e) => setFormVencimiento(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}

              {/* Observación */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">
                  Observación <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={formObservacion}
                  onChange={(e) => setFormObservacion(e.target.value)}
                  placeholder="Ej: Factura N° 0001-00012345"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={mutation.isPending}
                  className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {mutation.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const Cuentas = () => {
  const { user } = useAuth();
  const puedeRegistrar = user?.rol === "administrador";

  const { data: cuentasClientes = [], isLoading: loadCli, isError: errCli } = useQuery({
    queryKey: ["cuentas-clientes"],
    queryFn: () => api.cuentas.getClientes(),
  });

  const { data: cuentasProveedores = [], isLoading: loadProv, isError: errProv } = useQuery({
    queryKey: ["cuentas-proveedores"],
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
