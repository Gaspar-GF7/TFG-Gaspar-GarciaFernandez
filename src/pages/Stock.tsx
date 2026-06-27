import { Package, AlertTriangle, AlertCircle, Search, XCircle } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { api, calcEstado } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";

const estadoBadge = {
  ok:      "bg-success/10 text-success",
  bajo:    "bg-warning/10 text-warning",
  critico: "bg-destructive/10 text-destructive",
};

const estadoLabel = { ok: "Normal", bajo: "Bajo", critico: "Crítico" };

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

const Stock = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "bajo" | "critico">("todos");

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
          {!isLoading && alertCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">{alertCount} productos con stock bajo</span>
            </div>
          )}
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
            {(["todos", "bajo", "critico"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "todos" ? "Todos" : f === "bajo" ? "⚠ Bajo" : "🔴 Crítico"}
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
    </AppLayout>
  );
};

export default Stock;
