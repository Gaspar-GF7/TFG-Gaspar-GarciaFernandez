const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, nombre, email, rol, activo FROM usuario WHERE id = $1',
      [payload.id]
    );
    const user = rows[0];
    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo o no encontrado' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
