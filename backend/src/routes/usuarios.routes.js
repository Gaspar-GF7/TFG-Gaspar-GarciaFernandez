const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool   = require('../config/db');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');

const soloAdmin = [auth, roles('administrador')];

// GET /api/usuarios
router.get('/', ...soloAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, email, rol, activo FROM usuario ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/usuarios/:id
router.get('/:id', ...soloAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, email, rol, activo FROM usuario WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/usuarios
router.post('/', ...soloAdmin, async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ error: 'nombre, email, password y rol son requeridos' });
  }
  if (!['administrador', 'operador'].includes(rol)) {
    return res.status(400).json({ error: 'rol debe ser administrador u operador' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuario (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, activo`,
      [nombre, email.toLowerCase().trim(), hash, rol]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', ...soloAdmin, async (req, res) => {
  const { nombre, email, rol } = req.body;
  if (!nombre || !email || !rol) {
    return res.status(400).json({ error: 'nombre, email y rol son requeridos' });
  }
  if (!['administrador', 'operador'].includes(rol)) {
    return res.status(400).json({ error: 'rol debe ser administrador u operador' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE usuario SET nombre=$1, email=$2, rol=$3
       WHERE id=$4
       RETURNING id, nombre, email, rol, activo`,
      [nombre, email.toLowerCase().trim(), rol, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está en uso' });
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PATCH /api/usuarios/:id/activo  → activar / desactivar
router.patch('/:id/activo', ...soloAdmin, async (req, res) => {
  const { activo } = req.body;
  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'activo debe ser true o false' });
  }
  // Impedir que el admin se desactive a sí mismo
  if (Number(req.params.id) === req.user.id && !activo) {
    return res.status(400).json({ error: 'No podés desactivarte a vos mismo' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE usuario SET activo=$1 WHERE id=$2
       RETURNING id, nombre, email, rol, activo`,
      [activo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PATCH /api/usuarios/:id/password
router.patch('/:id/password', ...soloAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `UPDATE usuario SET password_hash=$1 WHERE id=$2 RETURNING id`,
      [hash, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
