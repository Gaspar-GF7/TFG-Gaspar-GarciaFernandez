const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');

const todosRoles = [auth, roles('administrador', 'operador')];
const soloAdmin  = [auth, roles('administrador')];

// GET /api/clientes
router.get('/', ...todosRoles, async (req, res) => {
  const { search } = req.query;
  try {
    let query = 'SELECT * FROM cliente';
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

// GET /api/clientes/:id
router.get('/:id', ...todosRoles, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM cliente WHERE id=$1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/clientes  (admin)
router.post('/', ...soloAdmin, async (req, res) => {
  const { nombre, email, telefono, direccion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO cliente (nombre, email, telefono, direccion)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre, email ?? null, telefono ?? null, direccion ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/clientes/:id  (admin)
router.put('/:id', ...soloAdmin, async (req, res) => {
  const { nombre, email, telefono, direccion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    const { rows } = await pool.query(
      `UPDATE cliente SET nombre=$1, email=$2, telefono=$3, direccion=$4
       WHERE id=$5 RETURNING *`,
      [nombre, email ?? null, telefono ?? null, direccion ?? null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/clientes/:id  (admin)
router.delete('/:id', ...soloAdmin, async (req, res) => {
  try {
    const { rows: dep } = await pool.query(
      'SELECT id FROM venta WHERE cliente_id=$1 LIMIT 1',
      [req.params.id]
    );
    if (dep.length) {
      return res.status(409).json({ error: 'No se puede eliminar: el cliente tiene ventas asociadas' });
    }
    const { rows } = await pool.query(
      'DELETE FROM cliente WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
