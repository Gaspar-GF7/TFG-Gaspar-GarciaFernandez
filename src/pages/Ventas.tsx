import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShoppingCart, XCircle, PlusCircle, Trash2, Eye, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { api, type Venta } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

const esProductoTerminado = (categoria: string | null) =>
  categoria?.toLowerCase() === "producto terminado";

function SkeletonRow() {
  return (
    <tr className="border-b">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 rounded bg-muted animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ── Registrar venta: schema ──────────────────────────────────────────────────

const lineaSchema = z.object({
  item_id: z.string().min(1, "Seleccioná un producto"),
  cantidad: z
    .string()
    .min(1, "Obligatorio")
    .refine((v) => !isNaN(Number(v)), "Número inválido")
    .refine((v) => Number(v) > 0, "Debe ser mayor a 0"),
  precio_unitario: z
    .string()
    .min(1, "Obligatorio")
    .refine((v) => !isNaN(Number(v)), "Número inválido")
    .refine((v) => Number(v) > 0, "Debe ser mayor a 0"),
});

const ventaSchema = z.object({
  cliente_id: z.string().min(1, "Seleccioná un cliente"),
  items: z.array(lineaSchema).min(1, "Agregá al menos un ítem"),
});

type VentaFormValues = z.infer<typeof ventaSchema>;

const lineaDefault = { item_id: "", cantidad: "", precio_unitario: "" };
const ventaDefaults: VentaFormValues = { cliente_id: "", items: [lineaDefault] };

// ── Registrar venta: dialog ──────────────────────────────────────────────────

interface RegistrarVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientes: { id: number; nombre: string }[];
  items: { id: number; nombre: string }[];
}

function RegistrarVentaDialog({ open, onOpenChange, clientes, items }: RegistrarVentaDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<VentaFormValues>({
    resolver: zodResolver(ventaSchema),
    defaultValues: ventaDefaults,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const total = watchedItems.reduce((sum, it) => {
    const cant = Number(it.cantidad);
    const precio = Number(it.precio_unitario);
    return sum + (isNaN(cant) || isNaN(precio) ? 0 : cant * precio);
  }, 0);

  const mutation = useMutation({
    mutationFn: (values: VentaFormValues) =>
      api.ventas.create({
        cliente_id: Number(values.cliente_id),
        items: values.items.map((it) => ({
          item_id: Number(it.item_id),
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      queryClient.invalidateQueries({ queryKey: ["ventas-detalles"] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
      queryClient.invalidateQueries({ queryKey: ["cuentas-clientes"] });
      toast.success("Venta registrada correctamente");
      handleOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al registrar la venta");
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset(ventaDefaults);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && handleOpenChange(next)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar venta</DialogTitle>
          <DialogDescription>
            Seleccioná el cliente y los ítems vendidos. El stock y la cuenta corriente se actualizan automáticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccioná un cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Ítems *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(lineaDefault)}
                >
                  <PlusCircle className="h-4 w-4" />
                  Agregar línea
                </Button>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2 rounded-lg border p-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.item_id`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Producto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {items.map((i) => (
                                <SelectItem key={i.id} value={String(i.id)}>
                                  {i.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.cantidad`}
                      render={({ field }) => (
                        <FormItem className="w-28">
                          <FormControl>
                            <Input type="number" min="0.01" step="0.01" placeholder="Cantidad" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.precio_unitario`}
                      render={({ field }) => (
                        <FormItem className="w-32">
                          <FormControl>
                            <Input type="number" min="0.01" step="0.01" placeholder="Precio unit." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {form.formState.errors.items?.root && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.items.root.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-lg font-display font-bold text-card-foreground">{fmtCurrency(total)}</span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando..." : "Registrar venta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Detalle de venta: dialog ──────────────────────────────────────────────────

function DetalleVentaDialog({ ventaId, onClose }: { ventaId: number | null; onClose: () => void }) {
  const { data: venta, isLoading } = useQuery({
    queryKey: ["venta", ventaId],
    queryFn: () => api.ventas.getById(ventaId!),
    enabled: ventaId !== null,
  });

  return (
    <Dialog open={ventaId !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de venta {ventaId ? `#${ventaId}` : ""}</DialogTitle>
          {venta && (
            <DialogDescription>
              {venta.cliente_nombre} · {fmtDate(venta.fecha)} · Registrada por {venta.usuario_nombre}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading || !venta ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Producto</th>
                  <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Cantidad</th>
                  <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Precio</th>
                  <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {venta.detalles.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-card-foreground">{d.item_nombre}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {Number(d.cantidad).toLocaleString("es-AR")} {d.unidad_medida ?? ""}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{fmtCurrency(Number(d.precio_unitario))}</td>
                    <td className="px-4 py-2 text-right font-mono font-medium">
                      {fmtCurrency(Number(d.cantidad) * Number(d.precio_unitario))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <td colSpan={3} className="px-4 py-2 text-right font-semibold text-card-foreground">Total</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-card-foreground">
                    {fmtCurrency(Number(venta.total_monto))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

const Ventas = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  const [clienteFiltro, setClienteFiltro] = useState<string>("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtrosActivos = clienteFiltro !== "" || desde !== "" || hasta !== "";
  function limpiarFiltros() {
    setClienteFiltro("");
    setDesde("");
    setHasta("");
  }

  useSocket({
    'venta:nueva': () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['ventas-detalles'] });
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api.clientes.getAll(),
  });

  const { data: inventario = [] } = useQuery({
    queryKey: ["inventario"],
    queryFn: () => api.inventario.getAll(),
  });

  const { data: ventas = [], isLoading, isError, error } = useQuery({
    queryKey: [
      "ventas",
      clienteFiltro || undefined,
      desde || undefined,
      hasta || undefined,
    ],
    queryFn: () =>
      api.ventas.getAll({
        cliente_id: clienteFiltro ? Number(clienteFiltro) : undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Ventas</h1>
            <p className="mt-1 text-muted-foreground">Registro de ventas a clientes</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            Registrar venta
          </Button>
        </div>

        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">
              Error al cargar las ventas: {error instanceof Error ? error.message : "Error del servidor"}
            </p>
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Cliente</label>
            <Select value={clienteFiltro || "todos"} onValueChange={(v) => setClienteFiltro(v === "todos" ? "" : v)}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todos los clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los clientes</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Desde</label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Hasta</label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
          </div>

          {filtrosActivos && (
            <Button variant="ghost" onClick={limpiarFiltros} className="text-muted-foreground">
              <X className="h-4 w-4" />
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Tabla */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground">Fecha</th>
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground">Cliente</th>
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground">Registrada por</th>
                <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Total</th>
                <th className="text-center px-6 py-3 font-semibold text-muted-foreground">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : ventas.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No se encontraron ventas
                      </td>
                    </tr>
                  )
                  : ventas.map((v: Venta) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground">{fmtDate(v.fecha)}</td>
                      <td className="px-6 py-4 font-medium text-card-foreground">{v.cliente_nombre}</td>
                      <td className="px-6 py-4 text-muted-foreground">{v.usuario_nombre}</td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-card-foreground">
                        {fmtCurrency(Number(v.total_monto))}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button variant="ghost" size="icon" onClick={() => setDetalleId(v.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      <RegistrarVentaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientes={clientes.map((c) => ({ id: c.id, nombre: c.nombre }))}
        items={inventario
          .filter((i) => esProductoTerminado(i.categoria))
          .map((i) => ({ id: i.id, nombre: i.nombre }))}
      />

      <DetalleVentaDialog ventaId={detalleId} onClose={() => setDetalleId(null)} />
    </AppLayout>
  );
};

export default Ventas;
