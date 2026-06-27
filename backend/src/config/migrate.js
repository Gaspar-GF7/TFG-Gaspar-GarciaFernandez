require('dotenv').config();
const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migraciones...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS usuario (
        id            SERIAL PRIMARY KEY,
        nombre        VARCHAR(100) NOT NULL,
        email         VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol           VARCHAR(20)  NOT NULL CHECK (rol IN ('administrador', 'operador')),
        activo        BOOLEAN DEFAULT true
      );
    `);
    console.log('✓ usuario');

    await client.query(`
      CREATE TABLE IF NOT EXISTS item_inventario (
        id             SERIAL PRIMARY KEY,
        nombre         VARCHAR(150) NOT NULL,
        descripcion    TEXT,
        categoria      VARCHAR(80),
        unidad_medida  VARCHAR(20),
        stock_actual   DECIMAL(12,2) DEFAULT 0,
        punto_reorden  DECIMAL(12,2) DEFAULT 0
      );
    `);
    console.log('✓ item_inventario');

    await client.query(`
      CREATE TABLE IF NOT EXISTS movimiento_stock (
        id          SERIAL PRIMARY KEY,
        item_id     INTEGER NOT NULL REFERENCES item_inventario(id),
        usuario_id  INTEGER NOT NULL REFERENCES usuario(id),
        tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
        cantidad    DECIMAL(12,2) NOT NULL,
        fecha       TIMESTAMP DEFAULT now(),
        observacion TEXT
      );
    `);
    console.log('✓ movimiento_stock');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cliente (
        id        SERIAL PRIMARY KEY,
        nombre    VARCHAR(150) NOT NULL,
        email     VARCHAR(150),
        telefono  VARCHAR(30),
        direccion VARCHAR(200)
      );
    `);
    console.log('✓ cliente');

    await client.query(`
      CREATE TABLE IF NOT EXISTS proveedor (
        id              SERIAL PRIMARY KEY,
        nombre          VARCHAR(150) NOT NULL,
        email           VARCHAR(150),
        telefono        VARCHAR(30),
        condicion_pago  VARCHAR(100)
      );
    `);
    console.log('✓ proveedor');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cuenta_corriente_cliente (
        id          SERIAL PRIMARY KEY,
        cliente_id  INTEGER NOT NULL REFERENCES cliente(id),
        tipo        VARCHAR(20) CHECK (tipo IN ('factura', 'pago')),
        monto       DECIMAL(12,2) NOT NULL,
        saldo_actual DECIMAL(12,2) DEFAULT 0,
        fecha       DATE DEFAULT now(),
        vencimiento DATE,
        observacion TEXT
      );
    `);
    console.log('✓ cuenta_corriente_cliente');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cuenta_corriente_proveedor (
        id            SERIAL PRIMARY KEY,
        proveedor_id  INTEGER NOT NULL REFERENCES proveedor(id),
        tipo          VARCHAR(20) CHECK (tipo IN ('factura', 'pago')),
        monto         DECIMAL(12,2) NOT NULL,
        saldo_actual  DECIMAL(12,2) DEFAULT 0,
        fecha         DATE DEFAULT now(),
        vencimiento   DATE,
        observacion   TEXT
      );
    `);
    console.log('✓ cuenta_corriente_proveedor');

    await client.query(`
      CREATE TABLE IF NOT EXISTS venta (
        id           SERIAL PRIMARY KEY,
        cliente_id   INTEGER NOT NULL REFERENCES cliente(id),
        usuario_id   INTEGER NOT NULL REFERENCES usuario(id),
        fecha        TIMESTAMP DEFAULT now(),
        total_monto  DECIMAL(12,2) NOT NULL
      );
    `);
    console.log('✓ venta');

    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_venta (
        id               SERIAL PRIMARY KEY,
        venta_id         INTEGER NOT NULL REFERENCES venta(id),
        item_id          INTEGER NOT NULL REFERENCES item_inventario(id),
        cantidad         DECIMAL(12,2) NOT NULL,
        precio_unitario  DECIMAL(12,2) NOT NULL
      );
    `);
    console.log('✓ detalle_venta');

    console.log('\nMigraciones completadas exitosamente.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Error en migraciones:', err);
  process.exit(1);
});
