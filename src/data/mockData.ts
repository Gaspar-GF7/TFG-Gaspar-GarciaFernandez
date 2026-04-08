export const dailySalesData = [
  { day: "Lun", ventas: 45200, gastos: 28400 },
  { day: "Mar", ventas: 52300, gastos: 31200 },
  { day: "Mié", ventas: 48900, gastos: 29800 },
  { day: "Jue", ventas: 61200, gastos: 35600 },
  { day: "Vie", ventas: 72400, gastos: 38900 },
  { day: "Sáb", ventas: 85600, gastos: 42100 },
  { day: "Dom", ventas: 39800, gastos: 22300 },
];

export const monthlySalesData = [
  { month: "Ene", ventas: 1240000, gastos: 820000 },
  { month: "Feb", ventas: 1380000, gastos: 890000 },
  { month: "Mar", ventas: 1520000, gastos: 950000 },
  { month: "Abr", ventas: 1410000, gastos: 920000 },
];

export const topProducts = [
  { name: "Papas Clásicas 200g", ventas: 3420, porcentaje: 28 },
  { name: "Papas Cheddar 150g", ventas: 2810, porcentaje: 23 },
  { name: "Papas BBQ 200g", ventas: 2150, porcentaje: 18 },
  { name: "Papas Light 150g", ventas: 1890, porcentaje: 15 },
  { name: "Papas Jamón 200g", ventas: 1240, porcentaje: 10 },
];

export const stockItems = [
  { id: 1, producto: "Papas Clásicas 200g", categoria: "Producto terminado", stock: 1240, minimo: 500, unidad: "paquetes", estado: "ok" as const },
  { id: 2, producto: "Papas Cheddar 150g", categoria: "Producto terminado", stock: 890, minimo: 400, unidad: "paquetes", estado: "ok" as const },
  { id: 3, producto: "Papas BBQ 200g", categoria: "Producto terminado", stock: 320, minimo: 400, unidad: "paquetes", estado: "bajo" as const },
  { id: 4, producto: "Papa cruda (kg)", categoria: "Materia prima", stock: 2800, minimo: 1000, unidad: "kg", estado: "ok" as const },
  { id: 5, producto: "Aceite vegetal (L)", categoria: "Materia prima", stock: 180, minimo: 200, unidad: "litros", estado: "critico" as const },
  { id: 6, producto: "Sal fina (kg)", categoria: "Materia prima", stock: 450, minimo: 100, unidad: "kg", estado: "ok" as const },
  { id: 7, producto: "Bolsas 200g", categoria: "Packaging", stock: 5200, minimo: 2000, unidad: "unidades", estado: "ok" as const },
  { id: 8, producto: "Bolsas 150g", categoria: "Packaging", stock: 1800, minimo: 2000, unidad: "unidades", estado: "bajo" as const },
  { id: 9, producto: "Condimento Cheddar", categoria: "Materia prima", stock: 35, minimo: 50, unidad: "kg", estado: "critico" as const },
  { id: 10, producto: "Papas Light 150g", categoria: "Producto terminado", stock: 670, minimo: 300, unidad: "paquetes", estado: "ok" as const },
];

export const kpiData = {
  ventasHoy: 85600,
  ventasAyer: 72400,
  ventasMes: 5550000,
  ventasMesAnterior: 4980000,
  productosVendidosHoy: 1240,
  stockBajo: 2,
  stockCritico: 2,
};
