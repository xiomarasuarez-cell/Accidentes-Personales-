# 16 · Guion de prueba: de la solicitud a la facturación (10 pasos)

Datos ficticios. Las integraciones (DIAN, SAP, Wompi, Registraduría, listas restrictivas) son simuladas. El usuario se cambia en la barra superior.

| # | Usuario | Dónde | Qué hacer | Qué debe pasar |
|---|---|---|---|---|
| 1 | Administrador | Configuración | *Reiniciar y cargar datos de prueba* (opcional, para empezar limpio) | El panel muestra pólizas, solicitudes y facturas de ejemplo |
| 2 | Diana Mora (Suscriptor avanzado) | Solicitudes de póliza | *Nueva solicitud* y elegir un producto de AP | Se crea en estado BORRADOR |
| 3 | Diana Mora | Solicitud | Llenar cada sección y pulsar *Guardar y continuar*: datos generales, tomador, intermediación, productos (plan con al menos un amparo Básico), asegurados, beneficiarios | Cada sección se valida; si falta un dato, aparece el mensaje exacto |
| 4 | Diana Mora | Solicitud | Radicar | Estado RADICADA; se consultan Registraduría y listas restrictivas (simuladas) |
| 5 | Carlos Peña (Suscriptor intermedio) | Solicitud → Estudio técnico | Revisar las políticas de suscripción y *Autorizar* las pendientes que le correspondan | La política pasa a «Autorizada». Si su nivel no alcanza, el sistema lo dice |
| 6 | Eduardo Gil (Emisión) | Solicitud → Resumen y emisión | *Emitir póliza* | Estado EMITIDA; se abre la póliza con movimiento 1 y carátula v1 |
| 7 | Fabiola Ruiz (Funcionario) | Póliza | Menú *Novedades* → por ejemplo *Cambio de sucursal*; probar también Barranquilla con intermediario | Nuevo movimiento y carátula versionada; Barranquilla se rechaza con el mensaje de HU294 |
| 8 | Eduardo Gil | Póliza → Facturación | *Validar antes de facturar* y luego *Facturar* | Una factura y un recibo por asegurado (nominada) |
| 9 | Fabiola Ruiz | Recibos y recaudo | Abrir un recibo y *Registrar pago* parcial y luego el saldo | PENDIENTE → PARCIAL → LEGALIZADO |
| 10 | Fabiola Ruiz / Diana Mora | Póliza → Novedades | *Anular* la póliza facturada | Póliza ANULADA, nota crédito y cruce o reembolso |

## Pruebas de rechazo (opcionales)
- Radicar con campos vacíos: no avanza y lista lo que falta.
- Tomador con documento terminado en 666: coincidencia en listas restrictivas, la solicitud se rechaza.
- *Integraciones (simuladas)*: poner la DIAN en «falla» (Administrador), intentar facturar (no se factura nada), volverla a «ok» y reprocesar.
- *Escenarios ejecutables* → *Ejecutar todos*: corre los 64 escenarios de negocio.

## Qué no esperar
Prórroga, renovación, rehabilitación y reversión de movimientos no están implementadas (ver *Trazabilidad y brechas*).
