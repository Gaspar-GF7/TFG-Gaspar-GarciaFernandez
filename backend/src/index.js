require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ── Rutas ──────────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/usuarios',    require('./routes/usuarios.routes'));
app.use('/api/inventario',  require('./routes/inventario.routes'));
app.use('/api/movimientos', require('./routes/movimientos.routes'));
app.use('/api/clientes',    require('./routes/clientes.routes'));
app.use('/api/proveedores', require('./routes/proveedores.routes'));
app.use('/api/cuentas',     require('./routes/cuentas.routes'));
app.use('/api/ventas',      require('./routes/ventas.routes'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
