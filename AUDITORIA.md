# AUDITORIA.md — Auditoría no destructiva del microservicio NestJS + gRPC

## 0. Alcance y metodología

- **Perímetro:** aplicación NestJS (TypeScript) + gRPC del proyecto `nestjs-productos-grpc` (`src/`, `test/`, `cliente.js`, configuraciones).
- **Método:** auditoría estática del código + ejecución real de procesos no destructivos (`npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`). No se modificó ningún archivo de código.
- **Fecha:** 23/09/2026.

### Evidencia ejecutada el día de la auditoría

| Proceso | Resultado | Evidencia |
|---|---|---|
| `npm run lint` (oxlint, 96 reglas) | ✅ 0 warnings, 0 errores | 6 archivos en 56ms |
| `npm run build` (nest build) | ✅ Compila correctamente | `tsconfig` strict habilitado |
| `npm run test` (unit) | ❌ **1/1 falla** | `TypeError: appController.getHello is not a function` (`src/app.controller.spec.ts:19`) |
| `npm run test:e2e` | ❌ **1/1 falla** | `expected 200 "OK", got 404 "Not Found"` (`test/app.e2e-spec.ts:22`) |
| Arranque de `AppModule` (vía e2e) | ⚠️ Boot con errores de telemetría | `ERROR [ObserveAgentWorker] Worker stopped with exit code 1. Restarting worker...` |

---

## 1. Resumen ejecutivo

Nivel de madurez: **EN DESARROLLO / CON DEUDA TÉCNICA ACUMULADA.** La práctica demuestra correctamente conceptos gRPC (unary, server-streaming, manejo de errores con `RpcException`/`NOT_FOUND`), pero acumula **deuda crítica en pruebas (2/2 automáticas fallando)**, una violación arquitectónica del patrón de capas (lógica de negocio en el controlador, servicio desconectado), credenciales placeholder de telemetría que provocan errores de runtime, y ausencia de validación de entrada, configuración y seguridad de transporte.

**Resumen por severidad:** 2 críticos · 5 altos · 4 medios · 4 bajos · 6 criterios conformes.

> Los hallazgos se respaldan con `archivo:línea` y con salida real de los procesos anteriores.

---

## 2. Hallazgos por severidad

### 🔴 Críticos

**CRI-01 — Suite de pruebas automáticas 100% rota (2/2 fallan).**
- Unit: `src/app.controller.spec.ts:19` llama `appController.getHello()` pero `AppController` **no tiene** ese método (está en `AppService`). Error real: `TypeError: appController.getHello is not a function`.
- E2E: `test/app.e2e-spec.ts:19-24` espera `GET /` → `200 "Hello World!"`, pero el microservicio es **gRPC** (no HTTP), por lo que `GET /` devuelve `404`. Error real: `expected 200 "OK", got 404 "Not Found"`.
- **Impacto:** no existe red de seguridad; un cambio de comportamiento gRPC podría romperse sin detección. CI fallaría desde ya.

**CRI-02 — Cobertura nula de los métodos gRPC reales.**
- Ningún test automatizado invoca `ObtenerProducto`, `ListarProductos` ni `BuscarPorPrecioMaximo` (los únicos caminos ejecutados son `getHello`, código muerto — ver ALT-01).
- La única verificación funcional es manual (`cliente.js`), documentada en `guia-ia-semana03.md:5-6`.
- **Impacto:** el contrato gRPC (unary, streams, caso de error `NOT_FOUND`) queda sin regresión automatizada.

### 🟠 Altos

**ALT-01 — Violación de separación de capas (patrón Controller/Servicio).**
- La lógica de negocio y los datos viven íntegros en el controlador: catálogo en memoria como propiedad (`src/app.controller.ts:12-16`) y operaciones de búsqueda/streaming en el mismo archivo (`18-62`).
- `AppService` es **código muerto**: solo expone `getHello()` (`src/app.service.ts:4-7`), no está provisto en `AppModule` (`src/app.module.ts`), ni es inyectado por `AppController`. El grep confirma que solo se referencia en `app.controller.spec.ts` y en su propia definición.
- **Impacto:** acoplamiento para evolucionar (persistencia, tests unitarios de negocio), responsabilidad única difusa.

**ALT-02 — Credenciales de telemetría placeholder provocan error de runtime.**
- `src/app.module.ts:12-13`: `appKey: 'YOUR_APP_KEY'` y `appSecret: 'YOUR_APP_SECRET'`.
- Evidencia de runtime capturada durante el boot del módulo (e2e): `ERROR [ObserveAgentWorker] Worker stopped with exit code 1. Restarting worker...`.
- **Impacto:** ruido de errores en logs, telemetría no operativa, y riesgo de exposición de secretos si algún día se insertan reales y se versionan.
- *(Nota: el `README.md:73-87` promociona Observe como solución estándar, por lo que conviene decidir: configurarla con env vars reales o desactivarla en este microservicio.)*

**ALT-03 — Sin validación de entrada en los métodos gRPC.**
- `src/app.controller.ts:18-25` acepta `data.id` sin verificar (un `id` ≤ 0 da `NOT_FOUND`; un `id` no entero queda descartado por proto pero sin semántica de negocio).
- `src/app.controller.ts:42-62`: `precioMaximo` sin restricción; un valor negativo devuelve vacío silenciosamente.
- No hay DTO con `class-validator`/`zod` ni pipes de validación.
- **Impacto:** comportamiento indefinido/ambigüedad de dominio para entradas fuera de rango.

**ALT-04 — Sin seguridad de transporte ni límites.**
- Servidor escucha HTTP/2 **sin TLS** (`src/main.ts:16`, `0.0.0.0:5000`).
- Cliente usa `grpc.credentials.createInsecure()` (`cliente.js:13`).
- **Impacto:** aceptable para práctica de aula; inaceptable para producción (datos en claro, sin autenticación/autorización/rate-limit en el servicio).

**ALT-05 — Configuración hardcodeada y sin manejo de entorno.**
- `src/main.ts:14-16`: `package`, `protoPath`, `url` fijos; el puerto 5000 no es parametrizable.
- No existe `ConfigModule`, `.env` ni `process.env.*`.
- **Impacto:** imposible desplegar en dos entornos (dev/staging/prod) sin editar código; puerto compartido causa conflictos.

### 🟡 Medios

**MED-01 — Streaming sin teardown explícito ante cancelación del suscriptor.**
- `setInterval` en `src/app.controller.ts:31-38` y `53-60` sin manejo de `unsubscribe`/`finalize`: si el cliente se desconecta a mitad del stream, el temporizador **no se limpiaría** si no alcanza a completar.
- *(Honestidad del hallazgo: en streams finitos que siempre iteran hasta completar, el impacto actual es bajo; se vuelve relevante si los datos crecen o el cliente cancela.)*

**MED-02 — Latencia artificial y throughput no parametrizado.**
- Retardo fijo de 300ms por elemento (`src/app.controller.ts:38,60`): 3 productos ⇒ ~600ms por listado; escala linealmente mal con más datos.
- No hay configuración del intervalo ni medición de rendimiento.

**MED-03 — Nombres de servicio/método en strings frágiles.**
- `@GrpcMethod('ProductoService', 'ObtenerProducto')` (`src/app.controller.ts:18,27,42`): un typo o renombrado del `.proto` solo falla en tiempo de conexión gRPC, no en compilación.

**MED-04 — Documentación del proyecto ausente (README por defecto).**
- `README.md` es la plantilla de NestJS: no documenta el arranque real, el proto, los métodos gRPC, el uso de `cliente.js`, ni los códigos de error.
- El contrato `.proto` (`src/productos.proto:3`) no define versión (`package productos;`) ⇒ sin política de versionado/retrocompatibilidad (SemVer).

### 🟢 Bajos

- **BAJ-01 —** `console.log` en `src/main.ts:20` en lugar del `Logger` de Nest (no estructurado).
- **BAJ-02 —** Interfaces de dominio duplicadas: `ProductoResponse` en `src/app.controller.ts:7` y en `src/productos.proto:11-15` (dos fuentes de verdad del contrato; riesgo de divergencia).
- **BAJ-03 —** Metadatos de `package.json` pendientes: `description`, `author` vacíos, `license: "UNLICENSED"` (`package.json:4-7`).
- **BAJ-04 —** Warning de tooling: vitest recomienda `resolve.tsconfigPaths: true` en vez del plugin `vite-tsconfig-paths` (`vitest.config.ts:7`, visible en la salida de los tests).

---

## 3. Evidencia concreta (archivo · elemento · línea)

| ID | Archivo | Elemento afectado | Línea(s) |
|---|---|---|---|
| CRI-01 | `src/app.controller.spec.ts` | Test unitario roto (`getHello` inexistente en el controlador) | 19 |
| CRI-01 | `test/app.e2e-spec.ts` | Test e2e asume transporte HTTP (`GET /` → 200) | 19–24 |
| CRI-02 | `src/app.controller.ts` | Métodos gRPC sin cobertura automatizada | 18–62 |
| ALT-01 | `src/app.controller.ts` | Datos y lógica de negocio en el controlador | 12–16, 18–62 |
| ALT-01 | `src/app.service.ts` / `src/app.module.ts` | `AppService` desconectado (código muerto) | 4–7 / — |
| ALT-02 | `src/app.module.ts` | `appKey`/`appSecret` placeholder de Observe | 12–13 |
| ALT-03 | `src/app.controller.ts` | Entradas sin validación de dominio (`id`, `precioMaximo`) | 18–25, 42–62 |
| ALT-04 | `src/main.ts` / `cliente.js` | gRPC sin TLS / credenciales insecure | 16 / 13 |
| ALT-05 | `src/main.ts` | URL/puerto hardcodeados (`0.0.0.0:5000`) | 14–16 |
| MED-01 | `src/app.controller.ts` | `setInterval` sin `finalize`/teardown en streams | 29–39, 46–61 |
| MED-02 | `src/app.controller.ts` | Retardo fijo 300ms por ítem | 38, 60 |
| MED-03 | `src/app.controller.ts` | Strings de servicio/método en decorador | 18, 27, 42 |
| MED-04 | `README.md` / `src/productos.proto` | Doc por defecto / contrato sin versión | — / 3 |
| BAJ-01 | `src/main.ts` | `console.log` directo | 20 |
| BAJ-02 | `src/app.controller.ts` + `src/productos.proto` | Contrato de dominio duplicado | 7 / 11–15 |
| BAJ-03 | `package.json` | Metadatos incompletos | 4–7 |
| BAJ-04 | `vitest.config.ts` / `vitest.config.e2e.ts` | Plugin legado de tsconfig paths | 7 / 5 |

---

## 4. Criterios conformes (verificados, no inventados)

- ✅ **Compilación estricta:** `tsconfig.json:18` (`strict: true`) y build exitoso.
- ✅ **Lint limpio:** oxlint con 96 reglas, 0 hallazgos (config `oxlint.json`).
- ✅ **Mapeo gRPC correcto:** `Observable<ProductoResponse>` retornado por los métodos streaming coincide con `stream ProductoResponse` del proto (`src/productos.proto:23-24`).
- ✅ **Manejo de errores:** `RpcException` con `status.NOT_FOUND` para producto inexistente (`src/app.controller.ts:22`) — patrón correcto en Nest gRPC.
- ✅ **Caso borde:** `buscarPorPrecioMaximo` completa el stream inmediatamente cuando no hay resultados (`src/app.controller.ts:48-51`), sin colgar al cliente.
- ✅ **Contrato proto3 bien formado:** mensajes claros, `google.protobuf.Empty`, streams declarados (`src/productos.proto`).
- ✅ **Empaquetado del `.proto`:** `nest-cli.json:6-11` copia `**/*.proto` a `dist/` (necesario para `start:prod`).

---

## 5. Recomendaciones de corrección por hallazgo

> Sin implementación de código (la construcción la realiza otro agente); se indica la dirección técnica.

| ID | Recomendación |
|---|---|
| CRI-01 | Reescribir el unit test para probar los métodos gRPC reales del controlador (ver §6, P-01) y el e2e arrancando el microservicio con `Transport.GRPC` (no HTTP). Eliminar el supuesto `GET /` `Hello World!`. |
| CRI-02 | Añadir cobertura automatizada para los 3 métodos gRPC + caso `NOT_FOUND` + stream vacío + cancelación de suscriptor. Meta de cobertura ≥ 80% sobre lógica de negocio. |
| ALT-01 | Mover el catálogo y las operaciones a `AppService` (capa de servicio) e inyectarlo en el controlador; el controlador solo orquesta transporte. Eliminar/barrer `getHello`. |
| ALT-02 | Mover credenciales a variables de entorno (`.env` vía `ConfigModule`), sin versionarlas (`.gitignore:33-39` ya excluye `.env*`); o retirar `ObserveModule` del microservicio. |
| ALT-03 | Agregar validación de dominio en la capa de servicio (ej. `id ≥ 1`, `precioMaximo ≥ 0`) y reaccionar con `RpcException INVALID_ARGUMENT`; usar DTOs tipados con `class-validator` si se desea. |
| ALT-04 | Para producción, habilitar TLS en gRPC y autenticación/rate-limit; dejar `createInsecure()` solo en desarrollo (guiarse de `NODE_ENV`). |
| ALT-05 | Parametrizar host/puerto/protoPath vía `process.env` o `ConfigModule` con valores por defecto de desarrollo. |
| MED-01 | Añadir teardown al `Observable` (ej. `finalize(() => clearInterval(interval))` o usar `from`/rango) para limpiar temporizadores en cancelación. |
| MED-02 | Hacer configurable el intervalo o eliminarlo para catálogos en memoria; medir latencia real con el cliente de prueba. |
| MED-03 | Centralizar nombres de servicio/método en constantes tipadas derivadas del proto. |
| MED-04 | Documentar README real (arranque, proto, métodos, cliente, errores) y versionar el contrato (ej. `package productos.v1` + política de evolución/retrocompatibilidad). |
| BAJ-01..04 | Usar `Logger` de Nest; generar tipos del contrato desde el `.proto` (una sola fuente de verdad); completar metadatos de `package.json`; migrar a `resolve.tsconfigPaths`. |

---

## 6. Pruebas que deberían repetirse después de corregir

1. **P-01 GPRC unit:** instanciar `AppController` con `AppService` real (o stub) y validar los 3 métodos, incluyendo: producto existente, `id` inexistente → `RpcException NOT_FOUND`, filtro con resultados, filtro sin resultados (stream completa vacío).
2. **P-02 gRPC e2e:** arrancar el microservicio real (`createMicroservice` con `Transport.GRPC`, puerto efímero) y ejecutar las llamadas por el cliente gRPC (`@grpc/grpc-js` + `proto-loader`) esperando mensajes y errores correctos.
3. **P-03 Config/telemetría:** verificar que `npm start` inicia **sin** el error `ObserveAgentWorker ... exit code 1` (env vars correctas o módulo retirado).
4. **P-04 Regresión de procesos:** repetir `npm run lint`, `npm run build`, `npm run test`, `npm run test:e2e` — los 4 deben pasar (hoy 2 fallan).
5. **P-05 Cobertura:** `npm run test:cov` con meta ≥ 80% sobre la lógica de negocio.
6. **P-06 Teardown:** con un cliente que cancele el stream a mitad (gRPC cancel), verificar en el servidor que no quedan temporizadores activos (sin fuga de memoria).
7. **P-07 Validación:** probar `id ≤ 0` y `precioMaximo < 0` y confirmar una respuesta de error de dominio clara (`INVALID_ARGUMENT`), no un vacío/404 ambiguo.
8. **P-08 Interoperabilidad manual:** mantener la verificación manual de `cliente.js` contra el servidor como prueba de humo final.

---

*Auditoría no destructiva — no se modificó ningún archivo de código. Repositorio: `nestjs-productos-grpc`.*