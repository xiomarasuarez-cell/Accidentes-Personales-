# 12 · Evidencia de pruebas

## 1) Escenarios de negocio (backend real, base temporal aislada) — `node --test tests/escenarios.test.mjs`
```
ℹ tests 64
ℹ suites 0
ℹ pass 64
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 15233.1055
```
Salida completa: `docs/evidencia/node_test_salida.txt`.

## 2) Recorrido de interfaz real (Chrome headless + CDP) — `node tests/ui-e2e.mjs`
34/34 verificaciones correctas (2026-11-04T21:59:35.663Z).

| Verificación | Resultado |
|---|---|
| Ruta #/ se muestra | OK |
| Ruta #/solicitudes se muestra | OK |
| Ruta #/solicitud/SOL-000006 se muestra | OK |
| Ruta #/polizas se muestra | OK |
| Ruta #/poliza/1000001 se muestra | OK |
| Ruta #/poliza/1000001/movimientos se muestra | OK |
| Ruta #/poliza/1000001/facturacion se muestra | OK |
| Ruta #/novedades se muestra | OK |
| Ruta #/facturacion se muestra | OK |
| Ruta #/facturacion/1000001 se muestra | OK |
| Ruta #/recibos se muestra | OK |
| Ruta #/recibo/RC-000005 se muestra | OK |
| Ruta #/autorizaciones se muestra | OK |
| Ruta #/auditoria se muestra | OK |
| Ruta #/integraciones se muestra | OK |
| Ruta #/escenarios se muestra | OK |
| Ruta #/trazabilidad se muestra | OK |
| Ruta #/config se muestra | OK |
| Se abre el modal «Cambio de sucursal» | OK |
| El cambio de sucursal se persiste (movimiento nuevo + carátula nueva versión) | OK |
| La UI muestra el rechazo «intermediario no disponible para esta sucursal» | OK |
| Pre-validación mostrada | OK |
| Facturar genera 5 facturas (una por asegurado) | OK |
| El pago parcial deja el recibo en PARCIAL | OK |
| Política autorizada desde la UI | OK |
| La solicitud se emite desde la UI y genera póliza | OK |
| La UI navega a la nueva póliza | OK |
| Se crea una solicitud y se abre su formulario | OK |
| «Guardar y continuar» valida y guarda la sección Datos generales | OK |
| El amparo de la tabla coincide con el del editor | OK |
| Al editar, el código del amparo no se puede cambiar | OK |
| Reiniciar la demo sin usuario está bloqueado (401) | OK |
| Todos los escenarios se ejecutan desde la UI y pasan | OK |
| No hubo excepciones JavaScript en el navegador | OK |


Captura: `docs/evidencia/ui_escenarios.png`.

## Qué NO está probado
- Navegadores distintos de Chrome; dispositivos móviles; carga/concurrencia; accesibilidad formal; seguridad (la autenticación es simulada por cabecera).
- Los flujos de prórroga, renovación, rehabilitación y anulación de movimiento **no existen** (ver doc 14).

