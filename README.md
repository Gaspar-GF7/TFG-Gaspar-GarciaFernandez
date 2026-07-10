# TFG-Gaspar-GarciaFernandez

## Descripción

Este proyecto es una aplicación web desarrollada como trabajo final de grado (TFG) que permite a las PyMEs gestionar su **stock**, **ventas**, **cuentas corrientes** de clientes y proveedores, y visualizar **reportes financieros y operativos** en tiempo real.

## 🚀 Características Principales

- **Gestión de Inventario**: alta, edición y baja de ítems, con punto de reorden y estados automáticos (normal / bajo / crítico)
- **Movimientos de Stock**: registro de entradas y salidas con trazabilidad por usuario
- **Ventas**: registro de ventas con detalle de ítems, actualizando el stock automáticamente
- **Cuentas Corrientes**: seguimiento de facturas y pagos de clientes y proveedores, con vencimientos
- **Reportes y Analítica**: aging de cuentas por cobrar, riesgo de mora, concentración de cartera, rotación de inventario y ventas por mes
- **Exportación a Excel**: descarga de ventas, stock y cuentas en formato `.xlsx`
- **Tiempo real**: el dashboard y los reportes se actualizan solos vía WebSockets, sin recargar la página
- **Autenticación segura**: JWT + contraseñas hasheadas con bcrypt, con roles diferenciados (administrador / operador)

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI)
- **Datos y estado**: TanStack Query, React Router
- **Gráficos**: Recharts
- **Backend**: Node.js, Express
- **Tiempo real**: Socket.IO
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT + bcrypt
- **Testing**: Vitest, Testing Library, Playwright
- **Infraestructura local**: Docker Compose (PostgreSQL)

## 📖 Instalación Rápida

### Requisitos Previos

- Node.js 18 o superior
- npm
- Docker (para levantar PostgreSQL localmente) o una instancia propia de PostgreSQL

### Pasos Básicos

```bash
# 1. Clonar repositorio
git clone https://github.com/Gaspar-GF7/TFG-Gaspar-GarciaFernandez.git
cd TFG-Gaspar-GarciaFernandez

# 2. Instalar dependencias (frontend y backend)
npm install
cd backend && npm install && cd ..

# 3. Configurar variables de entorno del backend
cd backend
cp .env.example .env
# completar DB_*, JWT_SECRET y FRONTEND_URL en .env

# 4. Levantar PostgreSQL
docker-compose up -d

# 5. Aplicar migraciones y datos de prueba
npm run db:migrate
npm run db:seed

# 6. Ejecutar el backend
npm run dev

# 7. En otra terminal, ejecutar el frontend (desde la raíz del proyecto)
cd ..
npm run dev
```

El frontend queda disponible en `http://localhost:5173` y la API en `http://localhost:3000`.

**Credenciales de prueba** (creadas por `db:seed`):

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@crunchsnacks.com.ar | admin123 |
| Operador | operador@crunchsnacks.com.ar | operador123 |

## 🔌 API - Endpoints Principales

| Módulo | Endpoint | Operaciones |
|---|---|---|
| Autenticación | `/api/auth` | login, sesión actual (`/me`) |
| Usuarios | `/api/usuarios` | CRUD (solo administrador) |
| Inventario | `/api/inventario` | CRUD + categorías (lectura: todos los roles) |
| Movimientos de Stock | `/api/movimientos` | Alta y listado |
| Clientes | `/api/clientes` | CRUD (lectura: todos, escritura: solo administrador) |
| Proveedores | `/api/proveedores` | CRUD (lectura: todos, escritura: solo administrador) |
| Cuentas Corrientes | `/api/cuentas` | Movimientos de clientes y proveedores |
| Ventas | `/api/ventas` | Alta, listado, detalle y detalle agregado para reportes |

## 🆕 Tiempo Real con Socket.IO

### Funcionalidad

- El servidor emite eventos cuando se registran ventas, movimientos de stock o cambios en cuentas corrientes
- El Dashboard y los Reportes escuchan esos eventos y se refrescan automáticamente
- No hace falta recargar la página para ver los datos que carga otro usuario conectado

### Cómo probarlo

- Abrí dos sesiones (por ejemplo, una ventana normal y una de incógnito) logueadas con usuarios distintos
- Registrá una venta o un movimiento de stock en una de las dos
- La otra ventana refleja el cambio sola, sin recargar

## 🎯 Funcionalidades Clave

### Inventario y Stock

- Ítems con categoría, unidad de medida, stock actual y punto de reorden
- Estado calculado automáticamente: `ok` (normal), `bajo` o `crítico`, según el punto de reorden
- Historial de movimientos (entradas/salidas) con usuario y observación

### Ventas

- Registro de venta con múltiples ítems y precios unitarios
- Descuento automático del stock vendido
- Detalle consultable por producto, cliente y fecha (usado en Reportes)

### Cuentas Corrientes

- Movimientos de tipo `factura` o `pago`, con saldo actualizado y vencimiento
- Separadas por entidad: clientes y proveedores

### Reportes y Exportación

- Aging de cuentas por cobrar (al día / vence pronto / vencido / vencido +60 días)
- Riesgo de mora y concentración de cartera por cliente
- Rotación de inventario sobre los últimos 30 días
- Tablas de ventas, stock y cuentas con exportación directa a Excel

## 🏗️ Estructura del Proyecto

```
TFG-Gaspar-GarciaFernandez/
├── src/                      # Frontend (React + Vite)
│   ├── pages/                # Dashboard, Stock, Cuentas, Reportes, Login
│   ├── components/           # AppLayout, AppSidebar, KpiCard, ui/ (shadcn)
│   ├── context/               # AuthContext (sesión y rol del usuario)
│   ├── hooks/                 # useSocket, use-toast, use-mobile
│   ├── lib/                   # api.ts (cliente HTTP), utils.ts
│   └── test/                  # Configuración y tests con Vitest
├── backend/                   # API REST (Node.js + Express)
│   ├── src/
│   │   ├── routes/            # auth, usuarios, inventario, movimientos,
│   │   │                      # clientes, proveedores, cuentas, ventas
│   │   ├── middleware/        # auth (JWT), roles
│   │   ├── config/            # db, migrate, seed
│   │   └── socket.js          # Eventos en tiempo real (Socket.IO)
│   └── docker-compose.yml     # PostgreSQL local
├── scripts/                   # Utilidades (test-realtime.mjs)
└── public/                    # Assets estáticos
```

## 🚀 Uso Rápido

### 1. Iniciar sesión

Usá una de las credenciales de prueba, o creá un usuario nuevo desde `/api/usuarios` como administrador.

### 2. Cargar inventario

`Dashboard → Stock` → alta de ítems, categoría y punto de reorden (solo administrador puede crear/editar).

### 3. Registrar movimientos y ventas

Desde `Stock`, registrá entradas/salidas; desde el flujo de ventas, cargá una venta con sus ítems — el stock se descuenta solo.

### 4. Revisar cuentas corrientes

`Dashboard → Cuentas` → ver y cargar facturas/pagos de clientes y proveedores.

### 5. Consultar Reportes

`Dashboard → Reportes` (solo administrador) → tablas, gráficos y exportación a Excel.

## 🔍 Ejemplos de Uso

**Login**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crunchsnacks.com.ar","password":"admin123"}'
```

**Listar inventario** (requiere token JWT del login)

```bash
curl http://localhost:3000/api/inventario \
  -H "Authorization: Bearer <token>"
```

**Detalle de ventas para reportes**

```bash
curl http://localhost:3000/api/ventas/detalles \
  -H "Authorization: Bearer <token>"
```

## 📞 Soporte

- **Issues**: crear un issue en el repositorio de GitHub para reportar problemas
- **Logs**: verificar la consola del backend (`npm run dev` en `backend/`) y la consola del navegador

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama para la funcionalidad (`git checkout -b feature/NuevaFuncionalidad`)
3. Commit de los cambios (`git commit -m 'Add NuevaFuncionalidad'`)
4. Push a la rama (`git push origin feature/NuevaFuncionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Proyecto desarrollado con fines académicos (Trabajo Final de Grado). Sin licencia de código abierto definida por el momento.

## 👨‍💻 Contacto

**Gaspar García Fernández** - [@Gaspar-GF7](https://github.com/Gaspar-GF7)

Link del proyecto: [https://github.com/Gaspar-GF7/TFG-Gaspar-GarciaFernandez](https://github.com/Gaspar-GF7/TFG-Gaspar-GarciaFernandez)
