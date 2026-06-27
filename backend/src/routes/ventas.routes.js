const router    = require('express').Router();
const pool      = require('../config/db');
const auth      = require('../middleware/auth');
const roles     = require('../middleware/roles');
const { getIo } = require('../socket');

const todosRoles = [auth, roles('administrador', 'operador')];

// GET /api/ventas  (?cliente_id=&desde=&hasta=)
router.get('/', ...todosRoles, async (req, res) => {
  const { cliente_id, desde, hasta } = req.query;
  const conditions = [];
  const params = [];

  if (cliente_id) {
    params.push(cliente_id);
    conditions.push(`v.cliente_id = $${params.length}`);
  }
  if (desde) {
    params.push(desde);
    conditions.push(`v.fecha >= $${params.length}`);
  }
  if (hasta) {
    params.push(hasta);
    conditions.push(`v.fecha <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const { rows } = await pool.query(
      `SELECT v.*, c.nombre AS cliente_nombre, u.nombre AS usuario_nombre
       FROM venta v
       JOIN cliente c ON c.id = v.cliente_id
       JOIN usuario u ON u.id = v.usuario_id
       ${where}
       ORDER BY v.fecha DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/ventas/:id  (con detalle)
router.get('/:id', ...todosRoles, async (req, res) => {
  try {
    const { rows: ventas } = await pool.query(
      `SELECT v.*, c.nombre AS cliente_nombre, u.nombre AS usuario_nombre
       FROM venta v
       JOIN cliente c ON c.id = v.cliente_id
       JOIN usuario u ON u.id = v.usuario_id
       WHERE v.id = $1`,
      [req.params.id]
    );
    if (!ventas[0]) return res.status(404).json({ error: 'Venta no encontrada' });

    const { rows: detalles } = await pool.query(
      `SELECT dv.*, i.nombre AS item_nombre, i.unidad_medida
       FROM detalle_venta dv
       JOIN item_inventario i ON i.id = dv.item_id
       WHERE dv.venta_id = $1`,
      [req.params.id]
    );
    res.json({ ...ventas[0], detalles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/ventas  (ambos roles)
// Body: { cliente_id, items: [{item_id, cantidad, precio_unitario}] }
router.post('/', ...todosRoles, async (req, res) => {
  const { cliente_id, items } = req.body;

  if (!cliente_id || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'cliente_id e items (array) son requeridos' });
  }
  for (const it of items) {
    if (!it.item_id || !it.cantidad || !it.precio_unitario) {
      return res.status(400).json({ error: 'Cada item requiere item_id, cantidad y precio_unitario' });
    }
    if (Number(it.cantidad) <= 0 || Number(it.precio_unitario) <= 0) {
      return res.status(400).json({ error: 'cantidad y precio_unitario deben ser mayores a 0' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: cliRows } = await client.query(
      'SELECT id FROM cliente WHERE id=$1', [cliente_id]
    );
    if (!cliRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Verificar stock y calcular total
    let totalMonto = 0;
    const itemsConStock = [];

    for (const it of items) {
      const { rows } = await client.query(
        'SELECT id, nombre, stock_actual FROM item_inventario WHERE id=$1 FOR UPDATE',
        [it.item_id]
      );
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Item ${it.item_id} no encontrado` });
      }
      const stockDisponible = parseFloat(rows[0].stock_actual);
      const cant = parseFloat(it.cantidad);
      if (stockDisponible < cant) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Stock insuficiente para "${rows[0].nombre}". Disponible: ${stockDisponible}`,
        });
      }
      totalMonto += cant * parseFloat(it.precio_unitario);
      itemsConStock.push({ ...it, cant, stockDisponible, nombre: rows[0].nombre });
    }

    // Insertar venta
    const { rows: ventaRows } = await client.query(
      `INSERT INTO venta (cliente_id, usuario_id, total_monto)
       VALUES ($1, $2, $3) RETURNING *`,
      [cliente_id, req.user.id, totalMonto]
    );
    const venta = ventaRows[0];

    const detalles = [];
    for (const it of itemsConStock) {
      // Detalle de venta
      const { rows: detRows } = await client.query(
        `INSERT INTO detalle_venta (venta_id, item_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [venta.id, it.item_id, it.cant, parseFloat(it.precio_unitario)]
      );
      detalles.push(detRows[0]);

      // Descontar stock
      await client.query(
        'UPDATE item_inventario SET stock_actual = stock_actual - $1 WHERE id=$2',
        [it.cant, it.item_id]
      );

      // Movimiento de stock automático
      await client.query(
        `INSERT INTO movimiento_stock (item_id, usuario_id, tipo, cantidad, observacion)
         VALUES ($1, $2, 'salida', $3, $4)`,
        [it.item_id, req.user.id, it.cant, `Venta #${venta.id}`]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ...venta, detalles });
    getIo()?.emit('venta:nueva', {
      id: venta.id,
      total_monto: venta.total_monto,
      fecha: venta.fecha,
      items_actualizados: itemsConStock.map((it) => ({
        item_id: Number(it.item_id),
        stock_actual: it.stockDisponible - it.cant,
      })),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
