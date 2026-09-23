# BITACORA.md — Bitácora de Desarrollo

> Bitácora estructurada del proyecto `nestjs-productos-grpc` (NestJS + gRPC).
> Criterios de la guía "Demostración Desarrollo Web": evolución controlada, flujos de integración, métricas clave y mejoras continuas.

---

## Semana 03 — Microservicio gRPC (NestJS + `@grpc/grpc-js`)

### Entrada E03-01 — Comparación de experiencia: gRPC (semana 3) vs REST (semana 2)

> Reflejo de la experiencia personal en 3–4 líneas.

Escribir con gRPC resultó más rápido que con REST: en la semana 2 sentí que la implementación REST exigía más pasos (verbos, rutas, DTOs, serialización) y me demoré más, incluyendo tiempos de depuración. Con gRPC el código fue más directo (métodos del servicio definidos por el `.proto`, streaming incluido) y corregir los errores de ejecución resultó más sencillo. En total, la curva de depuración fue menor en gRPC, aunque la velocidad de escritura es perceptiblemente superior frente a REST.

### Contexto técnico de la semana

- **Transporte:** `Transport.GRPC` (`src/main.ts:11-18`), contrato `src/productos.proto`.
- **Operaciones implementadas:** unary (`ObtenerProducto`), server-streaming (`ListarProductos`, `BuscarPorPrecioMaximo`).
- **Verificación:** ejecución manual `cliente.js` + servidor (`guia-ia-semana03.md`).

### Métricas de proceso (semana 3)

| Métrica | Observación |
|---|---|
| Compilación | `npm run build` ✅ sin errores |
| Lint | `npm run lint` ✅ 0 warnings/errores |
| Tests unitarios | ❌ 1 fallo (`app.controller.spec.ts`) |
| Tests e2e | ❌ 1 fallo (`app.e2e-spec.ts`) |
| Tiempo de escritura percibido | gRPC < REST (ver E03-01) |
| Dificultad de depuración percibida | gRPC < REST (ver E03-01) |

### Pendientes / mejora continua

- Corregir CRI-01/CRI-02 de `AUDITORIA.md` (suite de tests rota y cobertura gRPC nula).
- Resolver credenciales placeholder de Observe (`src/app.module.ts:12-13`) para evitar el error de worker en boot.

---

*Bitácora mantenida por agente de auditoría/documentación. Repositorio: `nestjs-productos-grpc`.*