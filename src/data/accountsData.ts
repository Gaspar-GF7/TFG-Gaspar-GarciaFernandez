export type Movimiento = {
  fecha: string; // ISO date
  comprobante: string;
  debe: number;
  haber: number;
};

export type Cuenta = {
  id: number;
  nombre: string;
  tipo: "cliente" | "proveedor";
  fechaVencimiento: string;
  movimientos: Movimiento[];
};

// Helper: today reference for the prototype
const TODAY = new Date("2026-06-27");
const daysAgo = (n: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const daysFromNow = (n: number) => daysAgo(-n);

export const cuentas: Cuenta[] = [
  // ===== CLIENTES (12) =====
  {
    id: 1, nombre: "Supermercado La Esquina", tipo: "cliente",
    fechaVencimiento: daysFromNow(10),
    movimientos: [
      { fecha: daysAgo(45), comprobante: "Factura A-0012", debe: 245000, haber: 0 },
      { fecha: daysAgo(30), comprobante: "Recibo R-0045", debe: 0, haber: 145000 },
      { fecha: daysAgo(10), comprobante: "Factura A-0089", debe: 180000, haber: 0 },
    ],
  },
  {
    id: 2, nombre: "Kiosco Don Pepe", tipo: "cliente",
    fechaVencimiento: daysAgo(5),
    movimientos: [
      { fecha: daysAgo(40), comprobante: "Factura A-0034", debe: 85000, haber: 0 },
      { fecha: daysAgo(20), comprobante: "Factura A-0067", debe: 42000, haber: 0 },
    ],
  },
  {
    id: 3, nombre: "Distribuidora Norte SA", tipo: "cliente",
    fechaVencimiento: daysAgo(75),
    movimientos: [
      { fecha: daysAgo(100), comprobante: "Factura A-0008", debe: 520000, haber: 0 },
      { fecha: daysAgo(80), comprobante: "Recibo R-0021", debe: 0, haber: 100000 },
    ],
  },
  {
    id: 4, nombre: "Almacén San Martín", tipo: "cliente",
    fechaVencimiento: daysFromNow(22),
    movimientos: [
      { fecha: daysAgo(15), comprobante: "Factura A-0091", debe: 78000, haber: 0 },
      { fecha: daysAgo(5), comprobante: "Recibo R-0102", debe: 0, haber: 78000 },
    ],
  },
  {
    id: 5, nombre: "Mayorista Central", tipo: "cliente",
    fechaVencimiento: daysAgo(35),
    movimientos: [
      { fecha: daysAgo(60), comprobante: "Factura A-0044", debe: 680000, haber: 0 },
      { fecha: daysAgo(50), comprobante: "Recibo R-0066", debe: 0, haber: 200000 },
    ],
  },
  {
    id: 6, nombre: "Drugstore Las Lomas", tipo: "cliente",
    fechaVencimiento: daysFromNow(5),
    movimientos: [
      { fecha: daysAgo(20), comprobante: "Factura A-0078", debe: 125000, haber: 0 },
    ],
  },
  {
    id: 7, nombre: "Supermercado Plaza", tipo: "cliente",
    fechaVencimiento: daysAgo(95),
    movimientos: [
      { fecha: daysAgo(120), comprobante: "Factura A-0015", debe: 410000, haber: 0 },
      { fecha: daysAgo(100), comprobante: "Recibo R-0030", debe: 0, haber: 60000 },
    ],
  },
  {
    id: 8, nombre: "Quiosco El Trébol", tipo: "cliente",
    fechaVencimiento: daysFromNow(15),
    movimientos: [
      { fecha: daysAgo(8), comprobante: "Factura A-0099", debe: 32000, haber: 0 },
    ],
  },
  {
    id: 9, nombre: "Autoservicio La Familia", tipo: "cliente",
    fechaVencimiento: daysAgo(18),
    movimientos: [
      { fecha: daysAgo(50), comprobante: "Factura A-0050", debe: 190000, haber: 0 },
      { fecha: daysAgo(35), comprobante: "Recibo R-0070", debe: 0, haber: 60000 },
    ],
  },
  {
    id: 10, nombre: "Estación de Servicio YPF Ruta 8", tipo: "cliente",
    fechaVencimiento: daysFromNow(7),
    movimientos: [
      { fecha: daysAgo(12), comprobante: "Factura A-0095", debe: 95000, haber: 0 },
      { fecha: daysAgo(5), comprobante: "Recibo R-0110", debe: 0, haber: 95000 },
    ],
  },
  {
    id: 11, nombre: "Mini Market Express", tipo: "cliente",
    fechaVencimiento: daysAgo(50),
    movimientos: [
      { fecha: daysAgo(75), comprobante: "Factura A-0028", debe: 220000, haber: 0 },
      { fecha: daysAgo(60), comprobante: "Recibo R-0055", debe: 0, haber: 70000 },
    ],
  },
  {
    id: 12, nombre: "Distribuidora Sur", tipo: "cliente",
    fechaVencimiento: daysFromNow(28),
    movimientos: [
      { fecha: daysAgo(10), comprobante: "Factura A-0097", debe: 310000, haber: 0 },
    ],
  },

  // ===== PROVEEDORES (6) =====
  {
    id: 101, nombre: "Agro Papas SRL", tipo: "proveedor",
    fechaVencimiento: daysFromNow(8),
    movimientos: [
      { fecha: daysAgo(20), comprobante: "Factura B-2210", debe: 0, haber: 450000 },
      { fecha: daysAgo(10), comprobante: "Pago P-0080", debe: 200000, haber: 0 },
    ],
  },
  {
    id: 102, nombre: "Aceites del Plata", tipo: "proveedor",
    fechaVencimiento: daysAgo(12),
    movimientos: [
      { fecha: daysAgo(40), comprobante: "Factura B-1105", debe: 0, haber: 320000 },
      { fecha: daysAgo(30), comprobante: "Pago P-0070", debe: 100000, haber: 0 },
    ],
  },
  {
    id: 103, nombre: "Envases Modernos SA", tipo: "proveedor",
    fechaVencimiento: daysFromNow(20),
    movimientos: [
      { fecha: daysAgo(15), comprobante: "Factura B-3344", debe: 0, haber: 180000 },
    ],
  },
  {
    id: 104, nombre: "Condimentos Andinos", tipo: "proveedor",
    fechaVencimiento: daysAgo(70),
    movimientos: [
      { fecha: daysAgo(95), comprobante: "Factura B-0890", debe: 0, haber: 140000 },
      { fecha: daysAgo(80), comprobante: "Pago P-0050", debe: 40000, haber: 0 },
    ],
  },
  {
    id: 105, nombre: "Transporte Rápido SRL", tipo: "proveedor",
    fechaVencimiento: daysAgo(25),
    movimientos: [
      { fecha: daysAgo(35), comprobante: "Factura B-4400", debe: 0, haber: 95000 },
    ],
  },
  {
    id: 106, nombre: "Energía Industrial SA", tipo: "proveedor",
    fechaVencimiento: daysFromNow(12),
    movimientos: [
      { fecha: daysAgo(5), comprobante: "Factura B-5510", debe: 0, haber: 215000 },
    ],
  },
];

export const calcularSaldo = (c: Cuenta): number => {
  // Para clientes: debe - haber (lo que nos deben). Para proveedores: haber - debe (lo que les debemos).
  const totalDebe = c.movimientos.reduce((s, m) => s + m.debe, 0);
  const totalHaber = c.movimientos.reduce((s, m) => s + m.haber, 0);
  return c.tipo === "cliente" ? totalDebe - totalHaber : totalHaber - totalDebe;
};

export const estaVencida = (c: Cuenta, ref: Date = new Date()): boolean => {
  const saldo = calcularSaldo(c);
  return saldo > 0 && new Date(c.fechaVencimiento) < ref;
};

export const diasVencido = (c: Cuenta, ref: Date = new Date()): number => {
  const d = (ref.getTime() - new Date(c.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.floor(d));
};
