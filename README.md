# StockPro — Plataforma de Control de Stock

Sistema empresarial para control de inventario, conciliación y neteo inteligente entre múltiples depósitos.

## Stack tecnológico

| Capa       | Tecnología                     |
|------------|-------------------------------|
| Frontend   | Next.js 14 + TypeScript        |
| Estilos    | Tailwind CSS                   |
| Gráficos   | Recharts                       |
| Backend/DB | Supabase (PostgreSQL)          |
| Auth       | Supabase Auth                  |
| Storage    | Supabase Storage (archivos)    |
| Deploy     | Vercel                         |
| Excel/CSV  | SheetJS (xlsx)                 |

---

## Instalación paso a paso

### 1. Clonar / descomprimir el proyecto

```bash
cd stockpro
npm install
```

### 2. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New project
2. Elegir nombre, contraseña de BD y región (elegí la más cercana)
3. Copiar las credenciales desde **Settings → API**

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4. Crear la base de datos

En Supabase → **SQL Editor** → pegar y ejecutar el contenido de `supabase_schema.sql`.

Esto crea:
- Todas las tablas (depositos, productos, stock, controles, etc.)
- Row Level Security
- Vistas optimizadas
- Datos de ejemplo (8 depósitos + categorías)

### 5. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

### 6. Deploy en Vercel (producción)

```bash
npm install -g vercel
vercel
```

Agregar las variables de entorno en Vercel Dashboard → Settings → Environment Variables.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── dashboard/     # Dashboard principal con KPIs y depósitos
│   ├── depositos/     # Listado y detalle de cada depósito
│   ├── neteo/         # Neteo inteligente entre depósitos
│   ├── carga/         # Carga de controles semanales (Excel/CSV)
│   ├── analisis/      # Análisis comercial e inteligencia de stock
│   └── historial/     # Trazabilidad completa
├── components/
│   └── layout/        # Sidebar, topbar
├── lib/
│   ├── supabase.ts    # Cliente Supabase
│   ├── queries.ts     # Todas las consultas a la BD
│   ├── neteo.ts       # Algoritmo de neteo inteligente
│   └── parser.ts      # Parser de Excel/CSV
└── types/
    └── index.ts       # Tipos TypeScript de toda la app
```

---

## Formato del archivo de inventario

El sistema acepta `.xlsx`, `.xls` y `.csv` con estas columnas (los nombres son flexibles):

| Columna   | Nombres aceptados                              |
|-----------|------------------------------------------------|
| Código    | codigo, code, sku, cod, código                 |
| Nombre    | nombre, name, producto, articulo, descripcion  |
| Cantidad  | cantidad, qty, stock, real, fisico, cantidad_real |

Ejemplo mínimo:

| codigo   | nombre           | cantidad |
|----------|------------------|----------|
| SKU-0001 | iPhone 16 Pro    | 22       |
| SKU-0002 | AirPods Pro 3    | 15       |

---

## Algoritmo de neteo

El módulo `src/lib/neteo.ts` implementa un algoritmo greedy de matching:

1. Agrupa diferencias por producto
2. Separa faltantes de sobrantes
3. Ordena faltantes de mayor a menor (urgencia)
4. Asigna sobrantes disponibles a faltantes compatibles
5. Calcula prioridad: **Urgente / Alta / Media / Baja**

---

## Roles y permisos

| Rol         | Acceso                                       |
|-------------|----------------------------------------------|
| Admin       | Todo — incluyendo configuración y usuarios   |
| Supervisor  | Cargar controles, aprobar transferencias      |
| Operador    | Solo cargar controles del depósito asignado  |

---

## Próximos pasos sugeridos

- [ ] Integrar notificaciones por email (Supabase Edge Functions + Resend)
- [ ] Módulo de predicción con regresión lineal simple
- [ ] Scanner QR/código de barras con cámara del celular
- [ ] Exportación PDF de reportes (react-pdf)
- [ ] App móvil con Expo (mismo backend Supabase)
