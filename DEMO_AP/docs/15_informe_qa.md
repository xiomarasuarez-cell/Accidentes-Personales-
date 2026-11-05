# 15 · Informe de QA (probar → corregir → regresión)

## 1. Resumen ejecutivo
Se ejecutaron **129 verificaciones reales** (129 correctas, 0 con falla) en tres capas: escenarios de negocio sobre el backend (64/64), API/seguridad/robustez (31/31) e interfaz real en Chrome (34/34). Se encontraron **7 defectos, todos corregidos y revalidados**; no quedan defectos críticos ni altos abiertos entre los detectados. **Esto no equivale a «sin defectos»:** hay alcance sin probar y funcionalidades no implementadas (secciones 9 y 10).

## 2. Alcance y método
Servidor propio y base temporal para la batería de API (no afecta la demo); Chrome headless controlado por CDP para la UI (Playwright no está instalado: se usó el protocolo de Chrome directamente). Cada corrección se validó con su caso y con la regresión completa.

## 3. Pruebas ejecutadas (resultado real)
| Capa | Comando | Resultado |
|---|---|---|
| Escenarios de negocio | node --test tests/escenarios.test.mjs | 64/64 |
| API, seguridad y robustez | node tests/qa-api.mjs | 31/31 |
| Interfaz E2E real | node tests/ui-e2e.mjs | 34/34 |

### Casos de API/seguridad
| ID | Módulo | Caso | Resultado |
|---|---|---|---|
| QA-S01 | Seguridad | POST sin usuario → 401 | OK |
| QA-S02 | Seguridad | Usuario inexistente en la cabecera → 401 | OK |
| QA-S03 | Seguridad | Reiniciar la demo sin usuario → 401 | OK |
| QA-S04 | Seguridad | Reiniciar la demo con un rol no administrador → 403 | OK |
| QA-S05 | Seguridad | Recargar datos de ejemplo con datos existentes y rol no administrador → 403 | OK |
| QA-S06 | Seguridad | Cambiar parámetros / simulación / reloj sin ser administrador → 403 | OK |
| QA-S07 | Seguridad | JSON mal formado → 400 sin detalles técnicos | OK |
| QA-S08 | Seguridad | Ruta inexistente → 404 en JSON | OK |
| QA-S09 | Seguridad | Path traversal en estáticos no expone código fuente | OK |
| QA-S10 | Seguridad | Entradas hostiles en rutas no producen 500 con información técnica | OK |
| QA-S11 | Seguridad | Prototype pollution en el cuerpo no contamina Object.prototype | OK |
| QA-E01 | Emisión | Crear solicitud con producto inexistente → 400 | OK |
| QA-E02 | Emisión | Radicar una solicitud vacía se rechaza con la lista de pendientes | OK |
| QA-E03 | Emisión | Emitir una solicitud en borrador se rechaza y no crea póliza | OK |
| QA-E04 | Emisión | Primas negativas, texto, nulas o absurdas son rechazadas por el backend (no solo por el front) | OK |
| QA-E05 | Emisión | Emitir dos veces la misma solicitud no genera una segunda póliza | OK |
| QA-E06 | Emisión | Emitir con rol sin permiso (usuario tercero) → 403 | OK |
| QA-F01 | Facturación | Facturar el período 1 genera factura + recibo por asegurado (5) | OK |
| QA-F02 | Facturación | Facturar otra vez el mismo período no duplica facturas | OK |
| QA-F03 | Facturación | Cinco solicitudes de facturar en paralelo no generan duplicados | OK |
| QA-F04 | Facturación | Pagos mayores al saldo, negativos, cero o no numéricos se rechazan | OK |
| QA-F05 | Facturación | Pago exacto legaliza el recibo y un pago posterior se rechaza | OK |
| QA-F06 | Facturación | DIAN en falla: facturar es atómico (nada se factura) y el reproceso funciona | OK |
| QA-F07 | Facturación | Facturar con un usuario sin permiso → 403 | OK |
| QA-M01 | Movimientos | Novedad con usuario sin permiso → 403 y la póliza queda intacta | OK |
| QA-M02 | Movimientos | Tipo de novedad inexistente → 4xx | OK |
| QA-M03 | Movimientos | Anular una póliza facturada: queda ANULADA y una segunda anulación se rechaza | OK |
| QA-M04 | Movimientos | Una póliza anulada no admite facturar ni nuevas novedades | OK |
| QA-I01 | Integridad | Cada recibo pertenece a una factura existente y total = pagado + saldo | OK |
| QA-I02 | Integridad | La auditoría registra las acciones críticas | OK |
| QA-X01 | Entrada | Texto con HTML/script no provoca error del servidor | OK |

### Casos de interfaz
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


## 4. Matriz de defectos
| ID | Módulo | Severidad | Defecto | Causa raíz | Archivo | Corrección | Evidencia | Estado |
|---|---|---|---|---|---|---|---|---|
| DEF-01 | Seguridad | Alta | POST /api/reset y /api/seed borraban toda la base sin usuario ni permiso (cualquiera con el enlace podía vaciar la demo). | Las rutas figuraban como públicas y el handler no validaba rol. | lib/api.mjs, server.mjs | reset exige rol Administrador; seed exige Administrador si ya hay datos; ambas salen de la lista pública. | QA-S03/S04/S05 + UI «Reiniciar sin usuario → 401» | Validado |
| DEF-02 | Backend | Media | Guardar una sección sin «data» o con el nombre de sección __proto__ devolvía 500. | guardarSeccion no validaba el cuerpo y usaba SECCIONES[seccion] (hereda del prototipo); clone(undefined) lanzaba excepción. | lib/solicitudes.mjs, lib/util.mjs | Validación de cuerpo (400) y Object.hasOwn (404); clone tolera undefined. | QA-E04, QA-S10, QA-X01 | Validado |
| DEF-03 | Emisión | Media | Se podía crear una solicitud con un producto inexistente. | Sin validación de productoId al crear. | lib/solicitudes.mjs | Rechazo 400 «Producto inexistente». | QA-E01 | Validado |
| DEF-04 | Emisión | Media | Primas y valores asegurados absurdos (1e20) eran aceptados. | Sin cota numérica. | lib/rules.mjs, lib/brechas.mjs (A-06) | Límite técnico 1e12 (no es regla de negocio: supuesto A-06). | QA-E04 | Validado |
| DEF-05 | Backend | Baja | Los errores 500 devolvían el mensaje interno de la excepción. | Concatenaba e.message en la respuesta. | server.mjs | Mensaje genérico; el detalle queda solo en el log del servidor. | QA-S07, QA-S10 | Validado |
| DEF-06 | Frontend | Baja | Editor de amparos: el código del amparo se podía cambiar al editar (la fila de la tabla dejaba de coincidir con lo editado), un amparo inhabilitado salía en blanco y Valor asegurado/Prima mostraban «—» sin explicación. | Select sin disabled en la edición; el filtro excluía inhabilitados; sin texto para valores aún no calculados. | public/views/solicitud.js, public/views/amparo.js | Código bloqueado al editar (con indicación), inhabilitados visibles y rotulados, «Se calcula al guardar». | UI «tabla coincide con editor» y «código no editable»; 51 amparos recorridos añadir→editar sin diferencias | Validado |
| DEF-07 | Pruebas | Baja | La prueba de UI leía la pantalla mientras decía «Cargando…» (falla intermitente). | Espera insuficiente. | tests/ui-e2e.mjs | Espera hasta que el contenido deje de decir «Cargando». | 3 corridas consecutivas | Validado |

**Reporte del usuario no reproducido:** «en un plan dice *amparo* y al editar parece otro amparo». Se recorrieron los 51 amparos del catálogo (agregar → editar) y el nombre siempre coincidió. Lo que sí podía confundir (código cambiable al editar, inhabilitados en blanco, valores «—») se corrigió (DEF-06). Falta el código del amparo concreto para confirmar si era ese caso.

## 5. Cobertura
- Reglas de negocio: **68/68** con al menos un escenario automatizado (100 %). Sin escenario: ninguna.
- Verificaciones correctas: **129/129** (100 %).
- La «cobertura funcional» frente a toda la documentación NO es 100 %: faltan HU y flujos (sección 10).

## 6. Regresión
Tras cada grupo de correcciones se repitieron las tres capas completas; el estado final es el de la sección 3.

## 7. Trazabilidad
Requerimiento → regla → escenario: docs/04 y docs/13. Defecto → corrección → prueba: sección 4.

## 8. Riesgos
- Las lecturas (GET) de la API no exigen usuario: cualquiera con la URL ve los datos. Aceptable solo con datos ficticios.
- La autenticación es una cabecera simulada (X-Demo-User); no hay sesiones ni contraseñas.
- Se pueden facturar períodos futuros sin límite de anticipación (cada llamada factura el siguiente período pendiente): **no hay regla documentada**; queda como brecha para el negocio.
- La base es SQLite de un solo proceso: no se probó concurrencia real multiproceso.

## 9. Sin probar
Navegadores distintos de Chrome, móvil/responsive, accesibilidad formal, carga, concurrencia multiproceso, seguridad más allá de lo listado (sin pruebas de penetración).

## 10. No implementado (brechas documentadas)
Prórroga, renovación, rehabilitación, reversión/anulación de movimiento, y las HU/documentos de docs/14.

## 11. Estado final
Apto para **demostración funcional controlada con datos ficticios** de emisión, administración, novedades implementadas y facturación. **No apto** para exponer en Internet sin una clave de acceso ni como sustituto del core.
