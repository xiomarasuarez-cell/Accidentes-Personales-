# 01 · Diagnóstico de arquitectura y código existente

**Alcance honesto:** inspección estructural del paquete «3. Versión actual (Código y BD)» (Backend QA, Frontend, esquema BD). **No** se auditó línea a línea ni se ejecutó el sistema existente; los hallazgos son de estructura.

| Capa | Hallazgo verificado |
|---|---|
| Backend | 15 microservicios Java/Gradle (paquete `co.linktic.*`): cartera, coaseguros, core, cotizacion, emisiones, facturacion, integraciones, login, novedades, politicas, producto, reaseguros, reporteria, reservas, siniestros. Facturación tiene ~1200 archivos Java, controladores de anulación de póliza/movimiento, facturación retroactiva, banco. |
| Políticas | `dev-ms-core-politicas` expone solo `PolizaSaludController` (paquete `salud`): no se encontró lógica de políticas de suscripción de AP (P01–P08 de las HU). |
| Frontend | `dev-web-front-core`: Vue 3 + Quasar + TypeScript + Pinia, Vitest, pipelines Azure. |
| BD | PostgreSQL 16, esquema `dbo`, 345 tablas, 156 FK (ver `3_extracted/DB_analisis.md`); tablas de emisión, facturación, recaudo, cesión de reaseguro, bitácora de cambios, constantes DIAN/SAP. |

## Decisión de reutilización
- **Reutilizado como referencia (no como código):** nombres de dominio, catálogos (productos, amparos), estados, estructura de integraciones DIAN/SAP/SGDEA, tablas objetivo.
- **No reutilizado como código:** conectar el demo a los microservicios exigiría BD, credenciales y despliegue de 15 servicios; además el requisito exige **no impactar producción**. Por eso el demo es autónomo (Node + SQLite) con reglas implementadas desde las HU.
- **Riesgo:** la lógica del demo debe reconciliarse con la de los microservicios antes de migrar; cada regla indica su fuente `[DOC]/[COD]/[TEST]` en `lib/reglas.mjs`.
- **Pendiente:** contrastar regla por regla con `dev-ms-core-emisiones/novedades/facturacion` (no hecho en esta fase).
