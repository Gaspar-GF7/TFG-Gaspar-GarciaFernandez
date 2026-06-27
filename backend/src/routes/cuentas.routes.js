const router    = require('express').Router();
const pool      = require('../config/db');
const auth      = require('../middleware/auth');
const roles     = require('../middleware/roles');
const { getIo } = require('../socket');

const todosRoles = [auth, roles('administrador', 'operador')];
const soloAdmin  = [auth, roles('administrador')];

// ── CUENTAS CORRIENTES DE CLIENTES ────────────────────────────────────────────

// GET /api/cuentas/clientes
router.get('/clientes', ...todosRoles, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ccc.*, c.nombre AS cliente_nombre
       FROM cuenta_corriente_cliente ccc
       JOIN cliente c ON c.id = ccc.cliente_id
       ORDER BY ccc.fecha DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/cuentas/clientes/:clienteId
router.get('/clientes/:clienteId', ...todosRoles, async (req, res) => {
  try {
    const { rows: cliente } = await pool.query(
      'SELECT * FROM cliente WHERE id=$1', [req.params.clienteId]
    );
    if (!cliente[0]) return res.status(404).json({ error: 'Cliente no encontrado' });

    const { rows: movimientos } = await pool.query(
      `SELECT * FROM cuenta_corriente_cliente
       WHERE cliente_id=$1 ORDER BY fecha DESC`,
      [req.params.clienteId]
    );

    const saldo = movimientos.length ? parseFloat(movimientos[0].saldo_actual) : 0;
    res.json({ cliente: cliente[0], saldo_actual: saldo, movimientos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cuentas/clientes  (admin)
router.post('/clientes', ...soloAdmin, async (req, res) => {
  const { cliente_id, tipo, monto, vencimiento, observacion } = req.body;
  if (!cliente_id || !tipo || !monto) {
    return res.status(400).json({ error: 'cliente_id, tipo y monto son requeridos' });
  }
  if (!['factura', 'pago'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo debe ser factura o pago' });
  }
  if (Number(monto) <= 0) {
    return res.status(400).json({ error: 'monto debe ser mayor a 0' });
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

    // Saldo anterior
    const { rows: prev } = await client.query(
      `SELECT saldo_actual FROM cuenta_corriente_cliente
       WHERE cliente_id=$1 ORDER BY fecha DESC, id DESC LIMIT 1`,
      [cliente_id]
    );
    const saldoPrev = prev[0] ? parseFloat(prev[0].saldo_actual) : 0;
    const montoNum  = parseFloat(monto);
    const saldoNuevo = tipo === 'factura' ? saldoPrev + montoNum : saldoPrev - montoNum;

    const { rows } = await client.query(
      `INSERT INTO cuenta_corriente_cliente
         (cliente_id, tipo, monto, saldo_actual, vencimiento, observacion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [cliente_id, tipo, montoNum, saldoNuevo, vencimiento ?? null, observacion ?? null]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
    getIo()?.emit('cuenta:actualizada', {
      tipo: 'cliente',
      id: rows[0].id,
      cliente_id: Number(cliente_id),
      saldo_actual: saldoNuevo,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

// ── CUENTAS CORRIENTES DE PROVEEDORES ────────────────────────────────────────

// GET /api/cuentas/proveedores
router.get('/proveedores', ...todosRoles, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ccp.*, p.nombre AS proveedor_nombre
       FROM cuenta_corriente_proveedor ccp
       JOIN proveedor p ON p.id = ccp.proveedor_id
       ORDER BY ccp.fecha DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/cuentas/proveedores/:proveedorId
router.get('/proveedores/:proveedorId', ...todosRoles, async (req, res) => {
  try {
    const { rows: prov } = await pool.query(
      'SELECT * FROM proveedor WHERE id=$1', [req.params.proveedorId]
    );
    if (!prov[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });

    const { rows: movimientos } = await pool.query(
      `SELECT * FROM cuenta_corriente_proveedor
       WHERE proveedor_id=$1 ORDER BY fecha DESC`,
      [req.params.proveedorId]
    );

    const saldo = movimientos.length ? parseFloat(movimientos[0].saldo_actual) : 0;
    res.json({ proveedor: prov[0], saldo_actual: saldo, movimientos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cuentas/proveedores  (admin)
router.post('/proveedores', ...soloAdmin, async (req, res) => {
  const { proveedor_id, tipo, monto, vencimiento, observacion } = req.body;
  if (!proveedor_id || !tipo || !monto) {
    return res.status(400).json({ error: 'proveedor_id, tipo y monto son requeridos' });
  }
  if (!['factura', 'pago'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo debe ser factura o pago' });
  }
  if (Number(monto) <= 0) {
    return res.status(400).json({ error: 'monto debe ser mayor a 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: provRows } = await client.query(
      'SELECT id FROM proveedor WHERE id=$1', [proveedor_id]
    );
    if (!provRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const { rows: prev } = await client.query(
      `SELECT saldo_actual FROM cuenta_corriente_proveedor
       WHERE proveedor_id=$1 ORDER BY fecha DESC, id DESC LIMIT 1`,
      [proveedor_id]
    );
    const saldoPrev  = prev[0] ? parseFloat(prev[0].saldo_actual) : 0;
    const montoNum   = parseFloat(monto);
    const saldoNuevo = tipo === 'factura' ? saldoPrev + montoNum : saldoPrev - montoNum;

    const { rows } = await client.query(
      `INSERT INTO cuenta_corriente_proveedor
         (proveedor_id, tipo, monto, saldo_actual, vencimiento, observacion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [proveedor_id, tipo, montoNum, saldoNuevo, vencimiento ?? null, observacion ?? null]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
    getIo()?.emit('cuenta:actualizada', {
      tipo: 'proveedor',
      id: rows[0].id,
      proveedor_id: Number(proveedor_id),
      saldo_actual: saldoNuevo,
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
