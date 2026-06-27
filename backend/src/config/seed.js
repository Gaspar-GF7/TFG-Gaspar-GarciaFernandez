require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Iniciando seed...');

    // ── Usuarios ──────────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash('admin123', 10);
    const operHash  = await bcrypt.hash('operador123', 10);

    const { rows: [admin] } = await client.query(
      `INSERT INTO usuario (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ['Admin Principal', 'admin@pyme.com', adminHash, 'administrador']
    );
    const { rows: [oper] } = await client.query(
      `INSERT INTO usuario (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ['Juan Operador', 'operador@pyme.com', operHash, 'operador']
    );
    const adminId = admin.id;
    const operId  = oper.id;
    console.log('✓ usuarios');

    // ── Clientes ──────────────────────────────────────────────────────────────
    const clienteRows = [
      ['Distribuidora El Sur',   'elsur@mail.com',      '2914001111', 'Av. Colón 1230, Bahía Blanca'],
      ['Comercial Norte SA',     'norte@comercial.com', '2914002222', 'San Martín 450, Bahía Blanca'],
      ['La Ferretería Central',  'ferreteria@mail.com', '2914003333', 'Alsina 780, Bahía Blanca'],
      ['Supermercado Los Pinos', 'pinos@super.com',     '2914004444', 'Brown 310, Punta Alta'],
      ['Panadería Don Jorge',    'donjorge@pan.com',    '2914005555', 'Italia 90, Coronel Rosales'],
    ];
    const clienteIds = [];
    for (const [nombre, email, telefono, direccion] of clienteRows) {
      const { rows: [r] } = await client.query(
        `INSERT INTO cliente (nombre, email, telefono, direccion)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [nombre, email, telefono, direccion]
      );
      clienteIds.push(r.id);
    }
    console.log('✓ clientes');

    // ── Proveedores ───────────────────────────────────────────────────────────
    const proveedorRows = [
      ['Importaciones García',   'garcia@import.com',  '1145001234', '30 días'],
      ['Mayorista Pampeano',     'pampeano@may.com',   '2914090000', 'Contado'],
      ['Distribuidora Nacional', 'dnacional@dist.com', '1145009876', '60 días'],
    ];
    const proveedorIds = [];
    for (const [nombre, email, telefono, condicion_pago] of proveedorRows) {
      const { rows: [r] } = await client.query(
        `INSERT INTO proveedor (nombre, email, telefono, condicion_pago)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [nombre, email, telefono, condicion_pago]
      );
      proveedorIds.push(r.id);
    }
    console.log('✓ proveedores');

    // ── Items de inventario ───────────────────────────────────────────────────
    const itemRows = [
      ['Harina 000',         'Harina de trigo tipo 000',          'Alimentos',    'kg',     350.00,  50.00],
      ['Azúcar refinada',    'Azúcar blanca refinada',            'Alimentos',    'kg',     180.00,  30.00],
      ['Aceite girasol 1L',  'Aceite de girasol botella 1 litro', 'Alimentos',    'unid',    95.00,  20.00],
      ['Papel A4 resma',     'Resma 500 hojas 75 g/m²',          'Librería',     'resma',   40.00,  10.00],
      ['Bolsa basura 60L',   'Bolsa de residuos negra 60 litros', 'Limpieza',     'paquete', 60.00,  15.00],
      ['Detergente 500ml',   'Detergente líquido multiuso',       'Limpieza',     'unid',    12.00,  10.00],
      ['Tornillo 4x40 zinc', 'Tornillo cabeza Phillips 4x40 mm',  'Ferretería',   'caja',   200.00,  25.00],
      ['Cable eléctrico 2.5','Cable unipolar 2.5 mm² rojo',       'Electricidad', 'm',      500.00, 100.00],
    ];
    const itemIds = [];
    for (const [nombre, descripcion, categoria, unidad_medida, stock_actual, punto_reorden] of itemRows) {
      const { rows: [r] } = await client.query(
        `INSERT INTO item_inventario (nombre, descripcion, categoria, unidad_medida, stock_actual, punto_reorden)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [nombre, descripcion, categoria, unidad_medida, stock_actual, punto_reorden]
      );
      itemIds.push(r.id);
    }
    console.log('✓ items inventario');

    // ── Movimientos de stock ──────────────────────────────────────────────────
    const movimientos = [
      [itemIds[0], adminId, 'entrada', 200, 'Compra inicial mayorista'],
      [itemIds[2], adminId, 'entrada', 100, 'Reposición mensual aceite'],
      [itemIds[4], operId,  'salida',   20, 'Venta distribuidora norte'],
      [itemIds[6], operId,  'salida',   50, 'Pedido cliente ferretería'],
      [itemIds[0], operId,  'salida',   30, 'Venta panadería'],
    ];
    for (const [item_id, usuario_id, tipo, cantidad, observacion] of movimientos) {
      await client.query(
        `INSERT INTO movimiento_stock (item_id, usuario_id, tipo, cantidad, observacion)
         VALUES ($1, $2, $3, $4, $5)`,
        [item_id, usuario_id, tipo, cantidad, observacion]
      );
    }
    console.log('✓ movimientos stock');

    // ── Cuentas corrientes clientes ───────────────────────────────────────────
    const cccRows = [
      [clienteIds[0], 'factura', 45000.00, 45000.00, 30, 'Factura B 0001-00000123'],
      [clienteIds[1], 'factura', 82000.00, 82000.00, 30, 'Factura B 0001-00000124'],
      [clienteIds[0], 'pago',    15000.00, 30000.00,  0, 'Pago parcial transferencia'],
      [clienteIds[2], 'factura', 21500.00, 21500.00, 15, 'Factura B 0001-00000125'],
      [clienteIds[3], 'factura', 63000.00, 63000.00, 45, 'Factura B 0001-00000126'],
    ];
    for (const [cliente_id, tipo, monto, saldo_actual, dias, observacion] of cccRows) {
      const vencimiento = dias > 0 ? `CURRENT_DATE + ${dias}` : 'NULL';
      await client.query(
        `INSERT INTO cuenta_corriente_cliente (cliente_id, tipo, monto, saldo_actual, vencimiento, observacion)
         VALUES ($1, $2, $3, $4, ${vencimiento}, $5)`,
        [cliente_id, tipo, monto, saldo_actual, observacion]
      );
    }
    console.log('✓ cuentas corrientes clientes');

    // ── Cuentas corrientes proveedores ────────────────────────────────────────
    const ccpRows = [
      [proveedorIds[0], 'factura', 120000.00, 120000.00, 30, 'Factura prov A 0002-00000045'],
      [proveedorIds[1], 'factura',  48000.00,  48000.00, 10, 'Factura prov B 0003-00000012'],
      [proveedorIds[0], 'pago',     60000.00,  60000.00,  0, 'Pago parcial cheque'],
      [proveedorIds[2], 'factura',  95000.00,  95000.00, 60, 'Factura prov C 0004-00000088'],
    ];
    for (const [proveedor_id, tipo, monto, saldo_actual, dias, observacion] of ccpRows) {
      const vencimiento = dias > 0 ? `CURRENT_DATE + ${dias}` : 'NULL';
      await client.query(
        `INSERT INTO cuenta_corriente_proveedor (proveedor_id, tipo, monto, saldo_actual, vencimiento, observacion)
         VALUES ($1, $2, $3, $4, ${vencimiento}, $5)`,
        [proveedor_id, tipo, monto, saldo_actual, observacion]
      );
    }
    console.log('✓ cuentas corrientes proveedores');

    // ── Ventas ────────────────────────────────────────────────────────────────
    const { rows: [venta1] } = await client.query(
      `INSERT INTO venta (cliente_id, usuario_id, total_monto) VALUES ($1, $2, $3) RETURNING id`,
      [clienteIds[0], adminId, 16500.00]
    );
    const { rows: [venta2] } = await client.query(
      `INSERT INTO venta (cliente_id, usuario_id, total_monto) VALUES ($1, $2, $3) RETURNING id`,
      [clienteIds[1], operId, 32000.00]
    );

    const detalles = [
      [venta1.id, itemIds[0],  50,  200.00],
      [venta1.id, itemIds[2],  15,  500.00],
      [venta2.id, itemIds[6],   5, 4000.00],
      [venta2.id, itemIds[7],  20,  600.00],
    ];
    for (const [venta_id, item_id, cantidad, precio_unitario] of detalles) {
      await client.query(
        `INSERT INTO detalle_venta (venta_id, item_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [venta_id, item_id, cantidad, precio_unitario]
      );
    }
    console.log('✓ ventas y detalles');

    console.log('\nSeed completado exitosamente.');
    console.log('\nCredenciales de acceso:');
    console.log('  administrador → admin@pyme.com    / admin123');
    console.log('  operador      → operador@pyme.com / operador123');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
