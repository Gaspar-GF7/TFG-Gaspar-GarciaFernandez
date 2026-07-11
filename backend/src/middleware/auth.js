const pool = require('../config/db');
const { verifyToken } = require('../utils/token');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido', code: 'TOKEN_REQUIRED' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    const { rows } = await pool.query(
      'SELECT id, nombre, email, rol, activo FROM usuario WHERE id = $1',
      [payload.id]
    );
    const user = rows[0];
    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo o no encontrado', code: 'USER_INACTIVE' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'La sesión expiró. Iniciá sesión nuevamente.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID' });
  }
};
