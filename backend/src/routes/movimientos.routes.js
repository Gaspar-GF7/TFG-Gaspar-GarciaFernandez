const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');

const todosRoles = [auth, roles('administrador', 'operador')];

// GET /api/movimientos  (?item_id=&tipo=&desde=&hasta=)
router.get('/', ...todosRoles, async (req, res) => {
  const { item_id, tipo, desde, hasta } = req.query;
  const conditions = [];
  const params = [];

  if (item_id) {
    params.push(item_id);
    conditions.push(`ms.item_id = $${params.length}`);
  }
  if (tipo) {
    params.push(tipo);
    conditions.push(`ms.tipo = $${params.length}`);
  }
  if (desde) {
    params.push(desde);
    conditions.push(`ms.fecha >= $${params.length}`);
  }
  if (hasta) {
    params.push(hasta);
    conditions.push(`ms.fecha <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const { rows } = await pool.query(
      `SELECT ms.*, i.nombre AS item_nombre, u.nombre AS usuario_nombre
       FROM movimiento_stock ms
       JOIN item_inventario i ON i.id = ms.item_id
       JOIN usuario u ON u.id = ms.usuario_id
       ${where}
       ORDER BY ms.fecha DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/movimientos/:id
router.get('/:id', ...todosRoles, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ms.*, i.nombre AS item_nombre, u.nombre AS usuario_nombre
       FROM movimiento_stock ms
       JOIN item_inventario i ON i.id = ms.item_id
       JOIN usuario u ON u.id = ms.usuario_id
       WHERE ms.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/movimientos  (ambos roles)
router.post('/', ...todosRoles, async (req, res) => {
  const { item_id, tipo, cantidad, observacion } = req.body;
  if (!item_id || !tipo || !cantidad) {
    return res.status(400).json({ error: 'item_id, tipo y cantidad son requeridos' });
  }
  if (!['entrada', 'salida'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo debe ser entrada o salida' });
  }
  if (Number(cantidad) <= 0) {
    return res.status(400).json({ error: 'cantidad debe ser mayor a 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: items } = await client.query(
      'SELECT id, stock_actual FROM item_inventario WHERE id=$1 FOR UPDATE',
      [item_id]
    );
    if (!items[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const stockActual = parseFloat(items[0].stock_actual);
    const cant = parseFloat(cantidad);

    if (tipo === 'salida' && stockActual < cant) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Stock insuficiente. Disponible: ${stockActual}`,
      });
    }

    const nuevoStock = tipo === 'entrada' ? stockActual + cant : stockActual - cant;

    await client.query(
      'UPDATE item_inventario SET stock_actual=$1 WHERE id=$2',
      [nuevoStock, item_id]
    );

    const { rows } = await client.query(
      `INSERT INTO movimiento_stock (item_id, usuario_id, tipo, cantidad, observacion)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [item_id, req.user.id, tipo, cant, observacion ?? null]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...rows[0], stock_nuevo: nuevoStock });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
