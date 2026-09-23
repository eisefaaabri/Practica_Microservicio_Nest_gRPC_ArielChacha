# nestjs-productos-grpc

Microservicio de **catálogo de productos** basado en **NestJS + gRPC** (Nest.js Microservices con `@grpc/grpc-js`). Expone un servicio de productos (`ProductoService`) definido en un contrato [Protocol Buffers](https://protobuf.dev/) (`src/productos.proto`), con operaciones *unary* y *server-streaming*.

Es la práctica de la **semana 3** del curso de microservicios (gRPC), continuación de la semana 2 (REST).

---

## Características

| Operación | Tipo | Descripción |
|---|---|---|
| `ObtenerProducto` | Unary (1→1) | Devuelve un producto por `id`. Lanza error gRPC `NOT_FOUND` si no existe. |
| `ListarProductos` | Server-streaming (1→N) | Emite todos los productos como un flujo de mensajes. |
| `BuscarPorPrecioMaximo` | Server-streaming (1→N) | Emite los productos cuyo `precio` sea `≤ precioMaximo`. Cierra el stream inmediatamente si no hay coincidencias. |

Los datos son una **lista en memoria** (3 productos de ejemplo) que se sustituirá por una fuente de datos persistente en una iteración futura.

---

## Requisitos de preparación

| Requisito | Versión mínima | Nota |
|---|---|---|
| [Node.js](https://nodejs.org/) | **≥ 20** (`engines` de `@nestjs/core@12`) | Se recomienda la versión LTS actual |
| npm | ≥ 10 | Incluido con Node.js |
| Registro npm | — | Dependencias públicas estándar |

> No se requiere base de datos ni contenedor: el servicio es autocontenido en memoria.

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repositorio>
cd nestjs-productos-grpc
npm install
```

### 2. (Opcional) Configurar telemetría [NestJS Observe]

El módulo `AppModule` incluye `ObserveModule.forRoot()` en `src/app.module.ts:11-15` con claves *placeholder* (`YOUR_APP_KEY` / `YOUR_APP_SECRET`).

- **Si NO usas Observe:** retira el bloque `ObserveModule` del arranque (ver `AUDITORIA.md`, hallazgo **ALT-02**). El servicio funciona sin él.
- **Si SÍ lo usas:** sustituye las claves por tus valores reales y **no las versiones**; idealmente inyéctalas desde variables de entorno (`.env`, excluido por `.gitignore`).

---

## Compilar y ejecutar

```bash
# desarrollo (hot reload)
npm run start:dev

# modo producción (previa compilación)
npm run build
npm run start:prod
```

El microservicio escucha por defecto en **`0.0.0.0:5000`** (configurado en `src/main.ts:16`).

> Todos los puertos/parámetros están hardcodeados en `src/main.ts`. Si necesitas parallelism o entornos múltiples, parametrízalos con variables de entorno (ver **ALT-05** en `AUDITORIA.md`).

---

## Probando el servicio con el cliente de ejemplo

Con el servidor en ejecución, abre otra terminal y ejecuta:

```bash
node cliente.js
```

El cliente (`cliente.js`) usa `@grpc/grpc-js` + `@grpc/proto-loader` y demuestra:

1. Llamada **unary** `obtenerProducto({ id: 1 })`.
2. **Server-streaming** de `listarProductos`.
3. Manejo del **error** gRPC `NOT_FOUND` (`id` inexistente).
4. **Server-streaming** con filtro `buscarPorPrecioMaximo({ precioMaximo: 50 })`.

> El cliente usa credenciales inseguras (`createInsecure()`) aptas para desarrollo local; para producción habilita TLS y autenticación (ver **ALT-04**).

---

## Contrato gRPC (`src/productos.proto`)

```proto
syntax = "proto3";
package productos;

message ProductoRequest   { int32  id = 1; }
message ProductoResponse  { int32 id = 1; string nombre = 2; double precio = 3; }
message FiltroPrecioRequest { double precioMaximo = 1; }

service ProductoService {
  rpc ObtenerProducto(ProductoRequest) returns (ProductoResponse);
  rpc ListarProductos(google.protobuf.Empty) returns (stream ProductoResponse);
  rpc BuscarPorPrecioMaximo(FiltroPrecioRequest) returns (stream ProductoResponse);
}
```

El archivo `.proto` se copia automáticamente a `dist/` al compilar (`nest-cli.json`), por lo que `start:prod` encuentra el contrato.

---

## Scripts útiles

| Comando | Descripción |
|---|---|
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run start:dev` | Ejecuta con recarga automática |
| `npm run start:prod` | Ejecuta la compilación de producción |
| `npm run lint` | Análisis estático con oxlint |
| `npm run test` | Pruebas unitarias (Vitest) |
| `npm run test:e2e` | Pruebas de extremo a extremo |
| `npm run test:cov` | Reporte de cobertura |

---

## Estructura del proyecto

```
nestjs-productos-grpc/
├── src/
│   ├── main.ts                  # Bootstrap del microservicio gRPC
│   ├── app.module.ts            # Módulo raíz + Observe
│   ├── app.controller.ts        # Métodos gRPC (ProductoService)
│   ├── app.service.ts           # Servicio (sin uso real, ver AUDITORIA.md ALT-01)
│   └── productos.proto          # Contrato gRPC (fuente de verdad)
├── test/
│   └── app.e2e-spec.ts          # Test e2e (transporte erroneo, ver AUDITORIA.md)
├── cliente.js                   # Cliente gRPC de prueba (consola)
├── AUDITORIA.md                 # Informe de auditoría y hallazgos
├── BITACORA.md                  # Bitácora de desarrollo
└── guia-ia-semana03.md          # Declaración de uso de IA (semana 3)
```

---

## Estado y hallazgos conocidos

El informe `AUDITORIA.md` documenta la auditoría técnica (fecha 23/09/2026). Resumen relevante:

- ⚠️ **Tests automáticos rotos** (CRI-01/CRI-02): `npm run test` y `npm run test:e2e` fallan actualmente; no cubren los métodos gRPC reales.
- ⚠️ **Credenciales placeholder de Observe** (ALT-02) provocan errores de worker al arrancar el módulo.
- ⚠️ **`AppService` desconectado** (ALT-01): la lógica vive en el controlador.
- ✅ Compilación estricta (`strict: true`) y lint limpio (oxlint).

---

## Declaración de uso de IA

Restricción a los lineamientos de la práctica: la asistencia de IA utilizada en esta semana se documenta en [`guia-ia-semana03.md`](./guia-ia-semana03.md).

---

## Licencia

`UNLICENSED` — proyecto académico privado. Ver `package.json`.