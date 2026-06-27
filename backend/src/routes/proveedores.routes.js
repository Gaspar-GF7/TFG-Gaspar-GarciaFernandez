const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');

const todosRoles = [auth, roles('administrador', 'operador')];
const soloAdmin  = [auth, roles('administrador')];

// GET /api/proveedores
router.get('/', ...todosRoles, async (req, res) => {
  const { search } = req.query;
  try {
    let query = 'SELECT * FROM proveedor';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` WHERE nombre ILIKE $1 OR email ILIKE $1`;
    }
    query += ' ORDER BY nombre';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/proveedores/:id
router.get('/:id', ...todosRoles, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM proveedor WHERE id=$1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/proveedores  (admin)
router.post('/', ...soloAdmin, async (req, res) => {
  const { nombre, email, telefono, condicion_pago } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO proveedor (nombre, email, telefono, condicion_pago)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre, email ?? null, telefono ?? null, condicion_pago ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/proveedores/:id  (admin)
router.put('/:id', ...soloAdmin, async (req, res) => {
  const { nombre, email, telefono, condicion_pago } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    const { rows } = await pool.query(
      `UPDATE proveedor SET nombre=$1, email=$2, telefono=$3, condicion_pago=$4
       WHERE id=$5 RETURNING *`,
      [nombre, email ?? null, telefono ?? null, condicion_pago ?? null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/proveedores/:id  (admin)
router.delete('/:id', ...soloAdmin, async (req, res) => {
  try {
    const { rows: dep } = await pool.query(
      'SELECT id FROM cuenta_corriente_proveedor WHERE proveedor_id=$1 LIMIT 1',
      [req.params.id]
    );
    if (dep.length) {
      return res.status(409).json({ error: 'No se puede eliminar: el proveedor tiene movimientos en cuenta corriente' });
    }
    const { rows } = await pool.query(
      'DELETE FROM proveedor WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json({ message: 'Proveedor eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
