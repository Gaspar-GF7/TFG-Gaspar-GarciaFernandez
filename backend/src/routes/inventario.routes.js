const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');

const todosRoles = [auth, roles('administrador', 'operador')];
const soloAdmin  = [auth, roles('administrador')];

// GET /api/inventario  (filtros opcionales: ?categoria=&search=&bajo_stock=1)
router.get('/', ...todosRoles, async (req, res) => {
  const { categoria, search, bajo_stock } = req.query;
  const conditions = [];
  const params = [];

  if (categoria) {
    params.push(categoria);
    conditions.push(`categoria = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(nombre ILIKE $${params.length} OR descripcion ILIKE $${params.length})`);
  }
  if (bajo_stock === '1') {
    conditions.push('stock_actual <= punto_reorden');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const { rows } = await pool.query(
      `SELECT * FROM item_inventario ${where} ORDER BY nombre`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/inventario/categorias  → lista de categorías únicas
router.get('/categorias', ...todosRoles, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT categoria FROM item_inventario
       WHERE categoria IS NOT NULL ORDER BY categoria`
    );
    res.json(rows.map(r => r.categoria));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/inventario/:id
router.get('/:id', ...todosRoles, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM item_inventario WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Item no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/inventario  (admin)
router.post('/', ...soloAdmin, async (req, res) => {
  const { nombre, descripcion, categoria, unidad_medida, stock_actual, punto_reorden } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO item_inventario (nombre, descripcion, categoria, unidad_medida, stock_actual, punto_reorden)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, descripcion ?? null, categoria ?? null, unidad_medida ?? null,
       stock_actual ?? 0, punto_reorden ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/inventario/:id  (admin)
router.put('/:id', ...soloAdmin, async (req, res) => {
  const { nombre, descripcion, categoria, unidad_medida, punto_reorden } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    const { rows } = await pool.query(
      `UPDATE item_inventario
       SET nombre=$1, descripcion=$2, categoria=$3, unidad_medida=$4, punto_reorden=$5
       WHERE id=$6
       RETURNING *`,
      [nombre, descripcion ?? null, categoria ?? null, unidad_medida ?? null,
       punto_reorden ?? 0, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Item no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/inventario/:id  (admin)
router.delete('/:id', ...soloAdmin, async (req, res) => {
  try {
    const { rows: movs } = await pool.query(
      'SELECT id FROM movimiento_stock WHERE item_id=$1 LIMIT 1',
      [req.params.id]
    );
    if (movs.length) {
      return res.status(409).json({ error: 'No se puede eliminar: el item tiene movimientos asociados' });
    }
    const { rows } = await pool.query(
      'DELETE FROM item_inventario WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Item no encontrado' });
    res.json({ message: 'Item eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
