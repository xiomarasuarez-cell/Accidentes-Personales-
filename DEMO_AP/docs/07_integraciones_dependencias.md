# 07 · Integraciones y dependencias

Todas **simuladas** y marcadas como tales en la UI (pantalla *Integraciones*). Modos configurables por el Administrador: ok / falla / timeout. Cada llamada queda en la bitácora (forma LT-TI-INT-002).

| Servicio | Rol | Bloqueante | Comportamiento simulado |
|---|---|---|---|
| Registraduría | Validar identidad | Sí (emisión) | Documento válido; modos falla/timeout |
| Listas restrictivas (SARLAFT) | Cotejo | Sí | Documentos terminados en 666, 999999999, 800800800 → coincidencia |
| SGDEA | Gestión documental | No | Devuelve radicado simulado |
| CRM | Cliente/intermediario | No | Eco simulado |
| DIAN / OPEN (facturación electrónica) | CUFE/resolución | Sí, atómico | Falla → no se factura nada |
| SAP | Asiento contable | No | Falla → asiento pendiente de reintento |
| Wompi | Pago en línea | No | Pago simulado |

Dependencias de código: ninguna (Node ≥ 24, sin paquetes). Para producción se reemplazan los adaptadores de `lib/sim.mjs` por los reales (microservicio de integraciones existente).

