# Guía IA Semana 03

### Declaración de uso de IA
- **Herramienta(s):** Antigravity (Gemini 3.1 Pro)
- **Nivel de uso:** Nivel 2-3 (Borrador / Revisor)
- **Qué se le pidió:** Asistencia para interpretar y resolver errores de compatibilidad con ECMAScript Modules (uso de `__dirname` y `require` vs `import`), implementación del código base para el método `BuscarPorPrecioMaximo` usando Server Streaming en gRPC, y explicaciones teóricas sobre el uso de Observables (`subscriber.next`/`complete`).
- **Qué se modificó/verificó manualmente:** Se tomó la decisión arquitectónica de usar Server Streaming para los filtros de búsqueda. Se estructuró y ejecutó manualmente el cliente (`node cliente.js`) y el servidor (`npm run start`) paso a paso. Se validó visualmente en consola que los eventos emitidos por el stream llegaran correctamente y que los errores fueran capturados adecuadamente (ej. ID inexistente).
