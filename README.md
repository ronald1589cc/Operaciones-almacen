# Almacen Control - Sistema de Gestion de Inventario

Sistema web para gestionar la operacion de un almacen de calzado deportivo. Permite administrar productos, stock, ubicaciones fisicas, movimientos de entrada/salida/ajuste, aprobaciones y trazabilidad.

El sistema esta construido para resolver una operacion donde diariamente ingresan productos de proveedores y salen pedidos hacia clientes o tiendas. La idea principal es diferenciar una operacion creada de una operacion realmente ejecutada, manteniendo el stock controlado y auditable.

## Indice

1. [Como funciona la base de datos](#1-como-funciona-la-base-de-datos)
2. [Como estan relacionadas las tablas](#2-como-estan-relacionadas-las-tablas)
3. [Como se conecta el frontend con Supabase](#3-como-se-conecta-el-frontend-con-supabase)
4. [Como funcionan las operaciones CRUD](#4-como-funcionan-las-operaciones-crud)
5. [Como se registra un movimiento](#5-como-se-registra-un-movimiento)
6. [Como se actualiza el stock](#6-como-se-actualiza-el-stock)
7. [Que medidas de seguridad se implementaron](#7-que-medidas-de-seguridad-se-implementaron)

## 1. Como funciona la base de datos

La base de datos esta implementada en **Supabase PostgreSQL**. Ahi viven las entidades principales del negocio, las reglas de integridad, las politicas de seguridad y las funciones que ejecutan los cambios criticos de stock.

### Tecnologias utilizadas en la capa de datos

- **Supabase PostgreSQL:** base de datos relacional.
- **Supabase Auth:** autenticacion de usuarios.
- **Row Level Security (RLS):** control de acceso por tabla.
- **Funciones RPC PostgreSQL:** ejecucion segura de aprobacion/rechazo de movimientos.
- **Restricciones SQL:** `unique`, `foreign key` y `check` para proteger datos importantes.

### Tablas principales

| Tabla | Funcionamiento |
|---|---|
| `profiles` | Guarda el perfil de negocio del usuario y su rol (`admin` u `operator`). |
| `inventory_items` | Catalogo de productos: SKU, nombre, categoria, proveedor, marca, talla, precio y costo. |
| `inventory` | Guarda el stock actual del articulo, su minimo/maximo y su ubicacion fisica. |
| `inventory_movements` | Registra las operaciones de Entrada, Salida y Ajuste. |
| `warehouse_locations` | Representa el mapa logico del almacen: zonas, racks y posiciones. |
| `location_reservations` | Reserva ubicaciones para operaciones INBOUND/OUTBOUND pendientes. |
| `movement_audit_log` | Registra cambios de estado de movimientos. |
| `brands` | Catalogo de marcas. |
| `categories` | Catalogo de categorias. |
| `suppliers` | Catalogo de proveedores. |

### Funcionamiento general

La base de datos no solo almacena informacion. Tambien aplica reglas de negocio:

- Un movimiento siempre nace como `Pendiente`.
- El stock no se modifica cuando se crea el movimiento.
- El stock solo cambia cuando un administrador aprueba el movimiento.
- Una salida no puede aprobarse si no hay stock suficiente.
- Una ubicacion fisica no puede ser asignada a dos productos al mismo tiempo.
- Las aprobaciones y rechazos quedan registrados para trazabilidad.

## 2. Como estan relacionadas las tablas

El modelo se organiza alrededor de productos, stock, ubicaciones y movimientos.

### Relaciones principales

```text
inventory_items 1 -> 1 inventory
inventory 1 -> N inventory_movements
inventory.location_id -> warehouse_locations.id
inventory_movements 1 -> N location_reservations
inventory_movements 1 -> N movement_audit_log
profiles 1 -> N movement_audit_log
```

### Relaciones explicadas

- **`inventory_items` con `inventory`:** cada producto tiene un registro principal de stock. Esto permite separar los datos del articulo de la cantidad disponible.
- **`inventory` con `inventory_movements`:** cada movimiento afecta un registro de inventario especifico.
- **`inventory` con `warehouse_locations`:** cada stock puede estar asociado a una ubicacion fisica del almacen.
- **`inventory_movements` con `location_reservations`:** un movimiento puede reservar una ubicacion mientras esta pendiente.
- **`inventory_movements` con `movement_audit_log`:** cada aprobacion o rechazo deja rastro historico.
- **`profiles` con auditoria:** permite saber que usuario realizo una accion administrativa.

### Reglas de integridad importantes

- `inventory.item_id` es unico, evitando duplicar el registro principal de stock de un articulo.
- `inventory.location_id` apunta a `warehouse_locations.id`.
- `inventory.location_id` tiene restriccion unica para evitar que dos productos ocupen la misma ubicacion.
- `inventory_movements.movement_type` solo permite `Entrada`, `Salida` o `Ajuste`.
- `inventory_movements.status` solo permite `Pendiente`, `Aprobado` o `Rechazado`.
- `location_reservations.reservation_type` diferencia `INBOUND` y `OUTBOUND`.

## 3. Como se conecta el frontend con Supabase

El frontend esta construido con **Vite + JavaScript vanilla usando ES Modules**. La app funciona como una SPA: cambia de pantalla sin recargar todo el navegador.

### Arquitectura del frontend

```text
src/
|-- main.js                 # Inicializa tema, router, sidebar, modal y toast
|-- router.js               # Maneja la navegacion interna
|-- supabaseClient.js       # Crea el cliente unico de Supabase
|-- guards/
|   `-- authGuard.js        # Protege rutas por sesion y rol
|-- services/               # Acceso a datos
|   |-- authService.js
|   |-- inventoryService.js
|   |-- itemsService.js
|   |-- movementsService.js
|   |-- locationsService.js
|   |-- auditService.js
|   `-- dashboardService.js
|-- pages/                  # Pantallas
|   |-- dashboard.js
|   |-- inventory.js
|   |-- movements.js
|   |-- locations.js
|   |-- movementsAudit.js
|   `-- itemsAudit.js
`-- components/             # UI reutilizable
    |-- button.js
    |-- datatable.js
    |-- modal.js
    |-- sidebar.js
    `-- toast.js
```

### Tecnologias utilizadas en el frontend

- **Vite:** entorno de desarrollo y build.
- **JavaScript ES Modules:** organizacion por modulos sin framework pesado.
- **Supabase JS Client:** conexion con Auth, tablas y RPC.
- **HTML:** forma ordenada de la pagina.
- **CSS propio:** estilos de layout, tablas, modales y responsive.
- **Lucide:** iconos para mejorar la interfaz.

### Funcionamiento de la conexion

La conexion esta centralizada en `src/supabaseClient.js`:

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
```

Las variables sensibles se leen desde `.env`:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Las paginas no llaman directamente a Supabase en todos lados. En su lugar usan archivos de `services/`, por ejemplo:

- `inventoryService.js` para inventario.
- `itemsService.js` para articulos.
- `movementsService.js` para movimientos.
- `locationsService.js` para ubicaciones.
- `auditService.js` para auditorias.

## 4. Como funcionan las operaciones CRUD

El sistema implementa CRUD sobre las entidades operativas principales, pero con algunas decisiones de negocio para proteger trazabilidad y stock.

### Funcionalidades implementadas en Inventario

- Listar articulos con SKU, nombre, categoria, proveedor, precio, costo, stock y estado.
- Buscar por articulo o SKU.
- Filtrar por categoria, proveedor y estado de stock.
- Crear nuevos articulos.
- Editar datos del articulo.
- Crear automaticamente el registro de inventario al crear un articulo.
- Editar informacion de stock: ubicacion, stock minimo y stock maximo.
- Desactivar/reactivar articulos en vez de eliminarlos definitivamente.

### Articulos

Cuando se crea un articulo, se inserta primero en `inventory_items`. Luego se crea su registro relacionado en `inventory` con stock inicial `0`.

Esto evita que exista un producto sin registro de stock.

### Inventario

La cantidad (`quantity`) no se edita libremente desde el formulario de inventario. Esa decision es importante: el stock debe cambiar mediante movimientos aprobados, no por cambios manuales sin trazabilidad.

Desde inventario se puede editar informacion administrativa como:

- Ubicacion.
- Stock minimo.
- Stock maximo.

### Ubicaciones

La pantalla de almacen permite registrar ubicaciones fisicas con:

- Codigo.
- Zona.
- Rack.
- Posicion.
- Capacidad.
- Estado de ocupacion.

Esto cubre la necesidad de representar el almacen y saber que espacios estan disponibles u ocupados.

### Movimientos

Los movimientos pueden crearse, aprobarse o rechazarse. No se eliminan como flujo principal, porque representan historial operativo.

## 5. Como se registra un movimiento

Un movimiento representa una solicitud operativa que todavia no necesariamente fue ejecutada fisicamente.

### Workflow de registro

1. El usuario entra a **Movimientos**.
2. Presiona **Nuevo movimiento**.
3. Selecciona el articulo.
4. Escoge el tipo: `Entrada`, `Salida` o `Ajuste`.
5. Ingresa cantidad, motivo y notas.
6. El sistema crea el registro en `inventory_movements` con estado `Pendiente`.
7. Si corresponde, se registra una reserva en `location_reservations`.

### Tipos de movimiento

| Tipo | Equivalencia operativa | Funcionamiento |
|---|---|---|
| `Entrada` | INBOUND | Mercaderia que llega o llegara de un proveedor. |
| `Salida` | OUTBOUND | Producto que debe prepararse y despacharse. |
| `Ajuste` | Correccion interna | Correccion de stock por conteo fisico. |

### Reserva de ubicacion

- Una **Entrada** puede reservar una ubicacion destino para preparar espacio antes de recibir mercaderia.
- Una **Salida** puede reservar la ubicacion origen para preparar el picking.
- Un **Ajuste** no necesita reserva porque no representa llegada ni despacho.

### Diferencia entre orden creada y movimiento ejecutado

Cuando el movimiento esta `Pendiente`, solo existe la solicitud. El stock sigue igual.

Cuando el movimiento pasa a `Aprobado`, la operacion se considera ejecutada y recien ahi se modifica el stock.

## 6. Como se actualiza el stock

El stock se actualiza mediante la funcion RPC `approve_movement(p_movement_id)`. El frontend no calcula ni modifica directamente la cantidad final.

### Workflow de actualizacion

1. Un administrador presiona **Aprobar** sobre un movimiento pendiente.
2. El frontend llama a `approveMovement()` en `movementsService.js`.
3. Ese servicio ejecuta la RPC `approve_movement` en Supabase.
4. La funcion valida que el usuario sea administrador.
5. La funcion verifica que el movimiento exista y siga pendiente.
6. La funcion bloquea el movimiento y el inventario afectado para evitar aprobaciones simultaneas.
7. Se aplica el cambio de stock segun el tipo de movimiento.
8. Se marca el movimiento como `Aprobado`.
9. Se registra auditoria.
10. Se confirma o actualiza la reserva de ubicacion si existia.

### Reglas de stock

| Tipo | Efecto sobre stock |
|---|---|
| `Entrada` | Suma la cantidad al stock actual. |
| `Salida` | Resta la cantidad del stock actual, solo si hay stock suficiente. |
| `Ajuste` | Reemplaza el stock por la cantidad indicada. |

Ejemplo de entrada:

```text
Stock actual: 50
Entrada aprobada: 20
Stock final: 70
```

Ejemplo de salida:

```text
Stock actual: 50
Salida aprobada: 15
Stock final: 35
```

Ejemplo de salida invalida:

```text
Stock actual: 8
Salida solicitada: 20
Resultado: error por stock insuficiente, no se modifica nada
```

### Rechazo de movimiento

Si el administrador rechaza un movimiento:

- El estado cambia a `Rechazado`.
- No se modifica `inventory.quantity`.
- Se libera la reserva pendiente, si existia.
- Se registra auditoria.

## 7. Que medidas de seguridad se implementaron

La seguridad principal esta en Supabase/PostgreSQL, no solamente en botones ocultos del frontend.

### Autenticacion

- El sistema usa Supabase Auth.
- Las rutas privadas requieren sesion activa.
- `authGuard.js` redirige al login si no hay usuario autenticado.
- El sidebar puede ocultar rutas administrativas segun el rol.

### Roles

El sistema usa dos roles de negocio:

```text
admin
operator
```

El rol se guarda en `profiles`. La funcion `is_admin()` verifica si el usuario autenticado tiene permisos administrativos.

### Row Level Security

Las tablas principales tienen RLS activado para que las reglas se apliquen incluso si alguien intenta llamar la API directamente.

Medidas implementadas:

- Los movimientos solo pueden crearse como `Pendiente`.
- Solo usuarios administradores pueden aprobar o rechazar movimientos.
- Las auditorias se conservan para trazabilidad.
- Las operaciones criticas se validan en base de datos.

### Funciones RPC seguras

Las funciones `approve_movement` y `reject_movement` ejecutan el flujo critico desde la base de datos.

Validan:

- Que el usuario sea administrador.
- Que el movimiento exista.
- Que el movimiento siga pendiente.
- Que una salida tenga stock suficiente.
- Que el mismo movimiento no se apruebe dos veces.

### Integridad de datos

- `inventory.location_id` evita asignar dos productos al mismo espacio.
- `inventory_movements.quantity` debe ser mayor a cero.
- `inventory_movements.status` solo permite estados definidos.
- `location_reservations` mantiene la relacion entre ubicacion reservada y movimiento.
- La actualizacion de stock ocurre en una sola transaccion de base de datos.

## Scripts disponibles

Instalar dependencias:

```bash
npm install
```

Ejecutar en desarrollo:

```bash
npm run dev
```

Compilar para produccion:

```bash
npm run build
```

Previsualizar build:

```bash
npm run preview
```