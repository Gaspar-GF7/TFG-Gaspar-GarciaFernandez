require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Iniciando seed...');

    // ── Limpiar tablas respetando FK ──────────────────────────────────────────
    await client.query(`
      TRUNCATE detalle_venta, venta,
               cuenta_corriente_cliente, cuenta_corriente_proveedor,
               movimiento_stock,
               item_inventario,
               cliente, proveedor,
               usuario
      RESTART IDENTITY CASCADE
    `);
    console.log('✓ tablas vaciadas');

    // ── Usuarios ──────────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash('admin123', 10);
    const operHash  = await bcrypt.hash('operador123', 10);

    const { rows: [admin] } = await client.query(
      `INSERT INTO usuario (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Admin Principal', 'admin@crunchsnacks.com.ar', adminHash, 'administrador']
    );
    const { rows: [oper] } = await client.query(
      `INSERT INTO usuario (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Juan Operador', 'operador@crunchsnacks.com.ar', operHash, 'operador']
    );
    const adminId = admin.id;
    const operId  = oper.id;
    console.log('✓ usuarios');

    // ── Proveedores ───────────────────────────────────────────────────────────
    const proveedorRows = [
      ['Agro San Luis S.A.',      'contacto@agrosanluis.com.ar',   '2664501234', '30 días'],
      ['Aceites del Sur S.R.L.',  'ventas@aceitesdelsur.com.ar',   '2914502345', 'Contado'],
      ['Packaging Córdoba S.A.',  'pedidos@packagingcba.com.ar',   '3514503456', '60 días'],
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

    // ── Clientes ──────────────────────────────────────────────────────────────
    const clienteRows = [
      ['Kiosco El Rincón',        'kioscoelrincon@gmail.com',              '3512101010', 'Av. Colón 480, Córdoba'],
      ['Despensa Don Ramón',      'donramon.despensa@gmail.com',           '1143202020', 'Av. Corrientes 1850, Buenos Aires'],
      ['Almacén La Esquina',      'laesquinarosario@gmail.com',            '3414303030', 'San Martín 620, Rosario'],
      ['Supermercado Avenida',    'compras@supermercadoavenida.com.ar',    '2614404040', 'Av. San Martín 1120, Mendoza'],
      ['Minimercado Los Andes',   'losandes.mini@gmail.com',               '3515505050', 'Bv. Los Andes 330, Villa Carlos Paz, Córdoba'],
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

    // ── Items de inventario ───────────────────────────────────────────────────
    // [nombre, descripcion, categoria, unidad_medida, stock_actual, punto_reorden]
    // Estado: ok → stock > reorden | bajo → stock > reorden*0.5 | crítico → stock <= reorden*0.5
    const itemRows = [
      // Productos terminados
      ['Papas Clásicas 100g',          'Sabor original, la variedad estrella',              'Producto terminado', 'unid', 1200, 200], // ok
      ['Papas Queso Cheddar 100g',     'Saborizadas con queso cheddar',                    'Producto terminado', 'unid',  850, 150], // ok
      ['Papas Jamón Ahumado 100g',     'Saborizadas con jamón ahumado',                    'Producto terminado', 'unid',   70, 200], // CRÍTICO (70 <= 100)
      ['Papas Crema y Cebolla 100g',   'Saborizadas con crema y cebolla',                  'Producto terminado', 'unid',  130, 200], // BAJO (100 < 130 <= 200)
      ['Papas Picante 100g',           'Sabor picante intenso',                            'Producto terminado', 'unid',   40, 150], // CRÍTICO (40 <= 75)
      // Insumos
      ['Papa fresca',                  'Insumo principal — papa lavada lista para procesar', 'Insumo',           'kg',    500, 100], // ok
      ['Aceite de girasol',            'Insumo — aceite de girasol para fritura',           'Insumo',           'litros', 200,  50], // ok
      ['Sal fina',                     'Insumo — sal fina para condimentar',                'Insumo',           'kg',    150,  30], // ok
      ['Bolsas packaging 100g (x1000)','Packaging — bolsas impresas para producto de 100g','Packaging',        'pack',   20,   5], // ok
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
    // itemIds: 0=Clásicas, 1=Cheddar, 2=Jamón, 3=Crema/Cebolla, 4=Picante
    //          5=Papa fresca, 6=Aceite, 7=Sal, 8=Bolsas
    const movimientos = [
      [itemIds[5], adminId, 'entrada', 500,  'Compra inicial papa fresca — Agro San Luis'],
      [itemIds[6], adminId, 'entrada', 200,  'Compra mensual aceite girasol — Aceites del Sur'],
      [itemIds[8], adminId, 'entrada',   5,  'Compra bolsas packaging 100g — Packaging Córdoba'],
      [itemIds[0], operId,  'salida',  100,  'Despacho venta Kiosco El Rincón'],
      [itemIds[3], operId,  'salida',  200,  'Despacho venta Supermercado Avenida'],
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
      [clienteIds[0], 'factura', 127500.00, 127500.00, 30, 'Factura B 0001-00000201 — Kiosco El Rincón'],
      [clienteIds[1], 'factura',  56000.00,  56000.00, 15, 'Factura B 0001-00000202 — Despensa Don Ramón'],
      [clienteIds[2], 'factura',  84000.00,  84000.00, 30, 'Factura B 0001-00000203 — Almacén La Esquina'],
      [clienteIds[2], 'pago',     40000.00,  44000.00,  0, 'Pago parcial transferencia — Almacén La Esquina'],
      [clienteIds[3], 'factura', 332500.00, 332500.00, 30, 'Factura B 0001-00000204 — Supermercado Avenida'],
      [clienteIds[4], 'factura',  38500.00,  38500.00, 45, 'Factura B 0001-00000205 — Minimercado Los Andes'],
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
      [proveedorIds[0], 'factura', 185000.00, 185000.00, 30, 'Factura prov 0010-00000301 — Agro San Luis (papa + condimentos)'],
      [proveedorIds[0], 'pago',     90000.00,  95000.00,  0, 'Pago parcial cheque — Agro San Luis'],
      [proveedorIds[1], 'factura',  98000.00,  98000.00,  0, 'Factura prov 0020-00000115 — Aceites del Sur (contado)'],
      [proveedorIds[2], 'factura',  47500.00,  47500.00, 60, 'Factura prov 0030-00000088 — Packaging Córdoba (bolsas)'],
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
    // Venta 1: Kiosco El Rincón — papas clásicas + sal y vinagre
    const { rows: [venta1] } = await client.query(
      `INSERT INTO venta (cliente_id, usuario_id, total_monto) VALUES ($1, $2, $3) RETURNING id`,
      [clienteIds[0], adminId, 127500.00]
    );
    // Venta 2: Supermercado Avenida — mix de papas + snack saborizado
    const { rows: [venta2] } = await client.query(
      `INSERT INTO venta (cliente_id, usuario_id, total_monto) VALUES ($1, $2, $3) RETURNING id`,
      [clienteIds[3], operId, 332500.00]
    );

    // [venta_id, item_id, cantidad, precio_unitario]
    const detalles = [
      [venta1.id, itemIds[0], 100,  850.00],   // Clásicas    100 × $850  = $85.000
      [venta1.id, itemIds[1],  50,  850.00],   // Cheddar      50 × $850  = $42.500  → total $127.500
      [venta2.id, itemIds[3], 200, 1100.00],   // Crema/Ceb   200 × $1100 = $220.000
      [venta2.id, itemIds[4], 150,  750.00],   // Picante     150 × $750  = $112.500 → total $332.500
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
    console.log('  administrador → admin@crunchsnacks.com.ar    / admin123');
    console.log('  operador      → operador@crunchsnacks.com.ar / operador123');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
