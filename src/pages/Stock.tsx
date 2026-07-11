import { Package, AlertTriangle, AlertCircle, Search, XCircle, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { api, calcEstado } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const estadoBadge = {
  ok:      "bg-success/10 text-success",
  bajo:    "bg-warning/10 text-warning",
  critico: "bg-destructive/10 text-destructive",
};

const estadoLabel = { ok: "Normal", bajo: "Bajo", critico: "Crítico" };

type Filtro = "todos" | "alerta" | "bajo" | "critico";
const FILTROS_VALIDOS: Filtro[] = ["todos", "alerta", "bajo", "critico"];
const filtroLabel: Record<Filtro, string> = {
  todos: "Todos",
  alerta: "⚠ Alertas",
  bajo: "⚠ Bajo",
  critico: "🔴 Crítico",
};

function SkeletonRow() {
  return (
    <tr className="border-b">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 rounded bg-muted animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const movimientoSchema = z.object({
  item_id: z.string().min(1, "Seleccioná un ítem"),
  tipo: z.enum(["entrada", "salida"], { required_error: "Seleccioná el tipo de movimiento" }),
  cantidad: z
    .string()
    .min(1, "La cantidad es obligatoria")
    .refine((v) => !isNaN(Number(v)), "Ingresá un número válido")
    .refine((v) => Number(v) > 0, "La cantidad debe ser mayor a 0"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  observacion: z.string().optional(),
});

type MovimientoFormValues = z.infer<typeof movimientoSchema>;

const movimientoDefaults: MovimientoFormValues = {
  item_id: "",
  tipo: "entrada",
  cantidad: "",
  fecha: todayISO(),
  observacion: "",
};

interface RegistrarMovimientoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: { id: number; producto: string }[];
}

function RegistrarMovimientoDialog({ open, onOpenChange, items }: RegistrarMovimientoDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<MovimientoFormValues>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: movimientoDefaults,
  });

  const mutation = useMutation({
    mutationFn: (values: MovimientoFormValues) =>
      api.movimientos.create({
        item_id: Number(values.item_id),
        tipo: values.tipo,
        cantidad: Number(values.cantidad),
        fecha: values.fecha,
        observacion: values.observacion?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
      toast.success("Movimiento registrado correctamente");
      handleOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al registrar el movimiento");
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset({ ...movimientoDefaults, fecha: todayISO() });
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && handleOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>Registrá una entrada o salida de stock para un ítem del inventario.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <FormField
              control={form.control}
              name="item_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ítem *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccioná un producto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={String(i.id)}>
                          {i.producto}
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
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de movimiento *</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="entrada" id="tipo-entrada" />
                        <Label htmlFor="tipo-entrada" className="font-normal cursor-pointer">Entrada</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="salida" id="tipo-salida" />
                        <Label htmlFor="tipo-salida" className="font-normal cursor-pointer">Salida</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cantidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad *</FormLabel>
                  <FormControl>
                    <Input type="number" min="0.01" step="0.01" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observación <span className="text-muted-foreground font-normal">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Ingreso por compra a proveedor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {mutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const Stock = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtroInicial = searchParams.get("filtro") as Filtro | null;
  const [filter, setFilter] = useState<Filtro>(
    filtroInicial && FILTROS_VALIDOS.includes(filtroInicial) ? filtroInicial : "todos"
  );

  const handleFilterChange = (f: Filtro) => {
    setFilter(f);
    setSearchParams(f === "todos" ? {} : { filtro: f });
  };

  useSocket({
    'stock:actualizado': () => queryClient.invalidateQueries({ queryKey: ['inventario'] }),
    'venta:nueva':       () => queryClient.invalidateQueries({ queryKey: ['inventario'] }),
  });

  const { data: rawItems = [], isLoading, isError, error } = useQuery({
    queryKey: ['inventario'],
    queryFn: () => api.inventario.getAll(),
  });

  const items = rawItems.map((item) => ({
    id: item.id,
    producto: item.nombre,
    categoria: item.categoria ?? "—",
    stock: Number(item.stock_actual),
    minimo: Number(item.punto_reorden),
    unidad: item.unidad_medida ?? "",
    estado: calcEstado(Number(item.stock_actual), Number(item.punto_reorden)),
  }));

  const filtered = items.filter((item) => {
    const matchSearch = item.producto.toLowerCase().includes(search.toLowerCase());
    if (filter === "todos") return matchSearch;
    if (filter === "alerta") return matchSearch && item.estado !== "ok";
    return matchSearch && item.estado === filter;
  });

  const alertCount = items.filter((i) => i.estado !== "ok").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Stock</h1>
            <p className="mt-1 text-muted-foreground">Gestión de inventario y alertas</p>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && alertCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">{alertCount} productos con stock bajo</span>
              </div>
            )}
            <Button onClick={() => setDialogOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              Registrar movimiento
            </Button>
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">
              Error al cargar el inventario: {error instanceof Error ? error.message : "Error del servidor"}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-card pl-10 pr-4 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {FILTROS_VALIDOS.map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filtroLabel[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground">Producto</th>
                <th className="text-left px-6 py-3 font-semibold text-muted-foreground">Categoría</th>
                <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Stock</th>
                <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Mínimo</th>
                <th className="text-center px-6 py-3 font-semibold text-muted-foreground">Estado</th>
                <th className="text-center px-6 py-3 font-semibold text-muted-foreground">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No se encontraron productos
                      </td>
                    </tr>
                  )
                  : filtered.map((item) => {
                    const pct = item.minimo > 0 ? Math.min((item.stock / item.minimo) * 100, 100) : 100;
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-card-foreground">{item.producto}</td>
                        <td className="px-6 py-4 text-muted-foreground">{item.categoria}</td>
                        <td className="px-6 py-4 text-right font-mono text-card-foreground">
                          {item.stock.toLocaleString("es-AR")} {item.unidad}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                          {item.minimo.toLocaleString("es-AR")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold", estadoBadge[item.estado])}>
                            {item.estado !== "ok" && <AlertTriangle className="h-3 w-3" />}
                            {estadoLabel[item.estado]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="mx-auto w-20 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                item.estado === "ok" ? "bg-success" : item.estado === "bajo" ? "bg-warning" : "bg-destructive"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      <RegistrarMovimientoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        items={items.map((i) => ({ id: i.id, producto: i.producto }))}
      />
    </AppLayout>
  );
};

export default Stock;
