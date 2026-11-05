# Demo funcional · Accidentes Personales (AP) end-to-end

Demo **independiente**: no toca producción, ni BD, ni servicios del core. Integraciones **simuladas** y marcadas como tales.

## Ejecutar
```
node --version        # ≥ 24
node --disable-warning=ExperimentalWarning server.mjs          # http://127.0.0.1:4300  (PORT=xxxx para otro)
node --disable-warning=ExperimentalWarning --test tests/escenarios.test.mjs   # 64 escenarios de negocio
node tests/ui-e2e.mjs                                          # recorrido de UI en Chrome (servidor activo)
node --disable-warning=ExperimentalWarning tools/gen_docs.mjs  # regenera docs/
```
Primera vez: botón *Cargar datos de ejemplo* (o `POST /api/seed`). Cambiar de usuario en la barra superior (permisos simulados).

## Frontend (doc 08)
SPA vanilla-JS (sin build): dashboard, solicitudes (wizard por secciones, estudio técnico, políticas, emisión), pólizas (resumen, carátulas, asegurados, movimientos, facturación, histórico, documentos), novedades, facturación (pre-validación, facturar por período), recibos/pago, autorizaciones, auditoría, integraciones, parámetros, escenarios y trazabilidad. Tema claro/oscuro.

## Backend (doc 09)
`lib/`: `rules` (cálculo y validación), `solicitudes`, `polizas` (movimientos, novedades, carátulas), `facturacion`, `sim` (adaptadores simulados), `store` (SQLite con transacción atómica), `api` (REST `/api/*`, usuario por cabecera `X-Demo-User`).

## Despliegue (doc 10)
Estado actual: **local** (`127.0.0.1:4300`). Una URL pública independiente (p. ej. túnel Cloudflare o Railway) **no se ha creado**: publica el demo en Internet y requiere tu confirmación. La autenticación es simulada, por lo que no debe exponerse con datos reales.

## Documentos
`docs/01…14` (diagnóstico, inventario, flujo, reglas, escenarios, dominio, integraciones, datos de prueba, evidencia, cobertura, brechas) y `docs/evidencia/`.
