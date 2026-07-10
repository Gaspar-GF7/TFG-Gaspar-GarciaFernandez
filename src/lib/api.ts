const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error del servidor');
  return data as T;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'administrador' | 'operador';
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ItemInventario {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  unidad_medida: string | null;
  stock_actual: number;
  punto_reorden: number;
}

export interface MovimientoStock {
  id: number;
  item_id: number;
  usuario_id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  fecha: string;
  observacion: string | null;
  item_nombre: string;
  usuario_nombre: string;
}

export interface Venta {
  id: number;
  cliente_id: number;
  usuario_id: number;
  fecha: string;
  total_monto: number;
  cliente_nombre: string;
  usuario_nombre: string;
}

export interface DetalleVenta {
  id: number;
  venta_id: number;
  cantidad: number;
  precio_unitario: number;
  fecha: string;
  cliente_nombre: string;
  item_nombre: string;
  unidad_medida: string | null;
}

export interface CuentaMovimientoRaw {
  id: number;
  cliente_id?: number;
  proveedor_id?: number;
  tipo: 'factura' | 'pago';
  monto: number;
  saldo_actual: number;
  fecha: string;
  vencimiento: string | null;
  observacion: string | null;
  cliente_nombre?: string;
  proveedor_nombre?: string;
}

export interface CuentaMovimiento extends CuentaMovimientoRaw {
  entidad_id: number;
  entidad_nombre: string;
  debe: number;
  haber: number;
}

// ── Helper: calcular estado de stock ─────────────────────────────────────────

export function calcEstado(stock: number, minimo: number): 'ok' | 'bajo' | 'critico' {
  if (stock > minimo) return 'ok';
  if (minimo > 0 && stock > minimo * 0.5) return 'bajo';
  return 'critico';
}

// ── Transformaciones Debe/Haber ───────────────────────────────────────────────

function toClienteMovimiento(raw: CuentaMovimientoRaw): CuentaMovimiento {
  return {
    ...raw,
    entidad_id: raw.cliente_id!,
    entidad_nombre: raw.cliente_nombre ?? '',
    debe: raw.tipo === 'factura' ? Number(raw.monto) : 0,
    haber: raw.tipo === 'pago' ? Number(raw.monto) : 0,
  };
}

function toProveedorMovimiento(raw: CuentaMovimientoRaw): CuentaMovimiento {
  return {
    ...raw,
    entidad_id: raw.proveedor_id!,
    entidad_nombre: raw.proveedor_nombre ?? '',
    debe: raw.tipo === 'pago' ? Number(raw.monto) : 0,
    haber: raw.tipo === 'factura' ? Number(raw.monto) : 0,
  };
}

// ── API client ────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<User>('/auth/me'),
  },

  inventario: {
    getAll: (params?: { categoria?: string; search?: string; bajo_stock?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.categoria) qs.set('categoria', params.categoria);
      if (params?.search) qs.set('search', params.search);
      if (params?.bajo_stock) qs.set('bajo_stock', '1');
      const q = qs.toString();
      return request<ItemInventario[]>(`/inventario${q ? `?${q}` : ''}`);
    },
  },

  movimientos: {
    getAll: (params?: { item_id?: number; tipo?: string; desde?: string; hasta?: string }) => {
      const qs = new URLSearchParams();
      if (params?.item_id) qs.set('item_id', String(params.item_id));
      if (params?.tipo) qs.set('tipo', params.tipo);
      if (params?.desde) qs.set('desde', params.desde);
      if (params?.hasta) qs.set('hasta', params.hasta);
      const q = qs.toString();
      return request<MovimientoStock[]>(`/movimientos${q ? `?${q}` : ''}`);
    },
  },

  ventas: {
    getAll: (params?: { cliente_id?: number; desde?: string; hasta?: string }) => {
      const qs = new URLSearchParams();
      if (params?.cliente_id) qs.set('cliente_id', String(params.cliente_id));
      if (params?.desde) qs.set('desde', params.desde);
      if (params?.hasta) qs.set('hasta', params.hasta);
      const q = qs.toString();
      return request<Venta[]>(`/ventas${q ? `?${q}` : ''}`);
    },
    getDetalles: () => request<DetalleVenta[]>('/ventas/detalles'),
  },

  cuentas: {
    getClientes: async (): Promise<CuentaMovimiento[]> => {
      const raw = await request<CuentaMovimientoRaw[]>('/cuentas/clientes');
      return raw.map(toClienteMovimiento);
    },
    getProveedores: async (): Promise<CuentaMovimiento[]> => {
      const raw = await request<CuentaMovimientoRaw[]>('/cuentas/proveedores');
      return raw.map(toProveedorMovimiento);
    },
    postCliente: (body: {
      cliente_id: number;
      tipo: 'factura' | 'pago';
      monto: number;
      vencimiento?: string;
      observacion?: string;
    }) => request<CuentaMovimientoRaw>('/cuentas/clientes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    postProveedor: (body: {
      proveedor_id: number;
      tipo: 'factura' | 'pago';
      monto: number;
      vencimiento?: string;
      observacion?: string;
    }) => request<CuentaMovimientoRaw>('/cuentas/proveedores', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  },
};
