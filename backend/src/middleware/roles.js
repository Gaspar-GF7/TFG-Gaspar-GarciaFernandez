// roles(...allowedRoles) → middleware que verifica el rol del usuario autenticado
module.exports = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user?.rol)) {
    return res.status(403).json({ error: 'Acceso denegado: permiso insuficiente' });
  }
  next();
};
