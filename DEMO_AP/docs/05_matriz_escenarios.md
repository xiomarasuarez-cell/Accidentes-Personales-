# 05 · Matriz de escenarios (64)

Cada escenario es ejecutable (`POST /api/escenarios/{id}/ejecutar` o pantalla *Escenarios*). Atributos: 1 ID · 2 Nombre · 3 Descripción · 4 Condiciones iniciales · 5 Datos de entrada · 6 Reglas · 7 Flujo · 8 Resultado esperado · 9 Estado final · 10 Impacto en póliza · 11 Impacto en facturación · 12 Mensajes/validaciones al usuario (más HU y tipo).

## ES-01 · Emisión exitosa AP Colectivo nominada e intermediada
- **Grupo / tipo / HU:** Emisión · Exitoso · HU187, HU191, HU189, HU192, HU194, HU647, HU207
- **Descripción:** Camino feliz: solicitud completa → radicación → estudio técnico sin políticas pendientes → emisión.
- **Condiciones iniciales:** Usuario suscriptor y usuario de emisión; producto AP Colectivo; 5 asegurados; comisión 10 %.
- **Datos de entrada:** Plan Oro con amparo básico 402 y adicional 702 (prima 120.000 por asegurado), periodicidad mensual, vigencia anual.
- **Reglas:** RN-EM-01, RN-EM-11, RN-EM-23, RN-EM-27
- **Flujo:** 1) Crear solicitud 2) Completar secciones 3) Radicar 4) Estudio técnico 5) Emitir
- **Resultado esperado:** Póliza VIGENTE con movimiento 1 «Emisión» y carátula versión 1.
- **Estado final:** Solicitud EMITIDA · Póliza VIGENTE
- **Impacto póliza:** Nace la póliza con 5 asegurados y cronograma de 12 períodos pendientes.
- **Impacto facturación:** No factura automáticamente: la facturación del primer período se ejecuta desde el módulo de Facturación (HU764-767 no disponibles).
- **Mensajes:** Póliza emitida con éxito.

## ES-02 · Emisión AP Individual (un asegurado, prima del plan)
- **Grupo / tipo / HU:** Emisión · Exitoso · HU255, HU647
- **Descripción:** Producto individual: un único plan con prima del plan y un asegurado identificado.
- **Condiciones iniciales:** Producto AP Individual.
- **Datos de entrada:** Plan individual con prima 120.000.
- **Reglas:** RN-EM-11
- **Flujo:** 1) Crear 2) Completar 3) Radicar 4) Emitir
- **Resultado esperado:** Póliza vigente con un asegurado; prima = prima del plan.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Un asegurado y un plan.
- **Impacto facturación:** Se factura una sola factura por período.
- **Mensajes:** Póliza emitida con éxito.

## ES-03 · AP Generación Positiva exige rama y tipo de institución
- **Grupo / tipo / HU:** Emisión · Validación · HU255
- **Descripción:** El producto de institución educativa añade campos obligatorios.
- **Condiciones iniciales:** Producto AP Generación Positiva.
- **Datos de entrada:** Sin rama/tipo de institución, luego con ellos.
- **Reglas:** RN-EM-11
- **Flujo:** 1) Guardar productos sin institución 2) Corregir 3) Emitir
- **Resultado esperado:** Rechaza sin rama/tipo; emite al completarlos.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Guarda los datos de la institución.
- **Impacto facturación:** Sin impacto
- **Mensajes:** La rama de la institución educativa es obligatoria.

## ES-04 · AP Viajero exige origen y destino del viaje
- **Grupo / tipo / HU:** Emisión · Validación · HU255
- **Descripción:** Campos obligatorios exclusivos de AP Viajero.
- **Condiciones iniciales:** Producto AP Individual Viajero.
- **Datos de entrada:** Sin origen/destino, luego con ellos.
- **Reglas:** RN-EM-11
- **Flujo:** 1) Guardar sin origen 2) Corregir 3) Emitir
- **Resultado esperado:** Rechaza sin origen/destino.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Guarda origen y destino.
- **Impacto facturación:** Sin impacto
- **Mensajes:** El origen del viaje es obligatorio (AP Viajero).

## ES-05 · Emisión innominada (número de asegurados por plan)
- **Grupo / tipo / HU:** Emisión · Alterno · HU255, HU577
- **Descripción:** Póliza sin listado de asegurados; la prima total es n × prima por asegurado.
- **Condiciones iniciales:** Estructura Innominada.
- **Datos de entrada:** Plan Oro para 40 asegurados.
- **Reglas:** RN-EM-11, RN-FA-15
- **Flujo:** 1) Crear 2) Plan con n asegurados 3) Radicar 4) Emitir
- **Resultado esperado:** Prima total = 40 × 120.000 = 4.800.000.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Sin asegurados individualizados.
- **Impacto facturación:** Se factura a nivel póliza (una factura por período).
- **Mensajes:** Póliza emitida con éxito.

## ES-06 · Coaseguro cedido con gastos por aseguradora (0 % permitido)
- **Grupo / tipo / HU:** Emisión · Exitoso · HU188
- **Descripción:** Coaseguro cedido: participación local + aceptantes = 100 %, % de gastos por aceptante.
- **Condiciones iniciales:** Datos generales con coaseguro.
- **Datos de entrada:** Local 60 %; Alfa 25 % (gastos 5 %); Beta 15 % (gastos 0 %).
- **Reglas:** RN-EM-12
- **Flujo:** 1) Registrar coaseguro 2) Radicar 3) Emitir
- **Resultado esperado:** Se acepta el gasto 0 % y se guarda por aseguradora.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Guarda el coaseguro.
- **Impacto facturación:** Sin impacto
- **Mensajes:** —

## ES-07 · Coaseguro: la participación no suma 100 % o falta el gasto
- **Grupo / tipo / HU:** Emisión · Validación · HU188
- **Descripción:** Validaciones del coaseguro cedido.
- **Condiciones iniciales:** Coaseguro cedido.
- **Datos de entrada:** Suma 70 %; aceptante sin % de gastos.
- **Reglas:** RN-EM-12
- **Flujo:** 1) Guardar coaseguro inválido
- **Resultado esperado:** Rechaza ambos casos con mensaje.
- **Estado final:** Solicitud BORRADOR
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** La suma de participaciones (local + aceptantes) debe ser exactamente 100 %.

## ES-08 · Coaseguro aceptado con compañía líder
- **Grupo / tipo / HU:** Emisión · Alterno · HU188
- **Descripción:** En coaseguro aceptado la líder factura y el gasto es único para Positiva.
- **Condiciones iniciales:** Coaseguro aceptado.
- **Datos de entrada:** Local 40 %, líder 60 % con póliza LP-123, gastos 3 %.
- **Reglas:** RN-EM-12
- **Flujo:** 1) Registrar 2) Radicar 3) Emitir
- **Resultado esperado:** Exige líder y póliza de la líder.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Guarda líder.
- **Impacto facturación:** Sin impacto
- **Mensajes:** La compañía líder es obligatoria en coaseguro aceptado.

## ES-09 · Licitación con estampillas
- **Grupo / tipo / HU:** Emisión · Exitoso · HU251
- **Descripción:** Solicitud de tipo Licitación en producto masivo.
- **Condiciones iniciales:** AP Colectivo, tipo Licitación.
- **Datos de entrada:** Presupuesto 800 M, estampillas 2,5 %, NIT 900555444.
- **Reglas:** RN-EM-13
- **Flujo:** 1) Completar licitación 2) Radicar 3) Emitir
- **Resultado esperado:** Emite y conserva los datos de licitación.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Guarda la licitación.
- **Impacto facturación:** Sin impacto
- **Mensajes:** —

## ES-10 · Licitación: producto individual o estampillas sin porcentaje
- **Grupo / tipo / HU:** Emisión · Validación · HU251
- **Descripción:** La licitación solo aplica a masivos y exige % si aplican estampillas.
- **Condiciones iniciales:** —
- **Datos de entrada:** AP Individual con licitación; estampillas sin %.
- **Reglas:** RN-EM-13
- **Flujo:** 1) Guardar generales 2) Guardar licitación
- **Resultado esperado:** Rechaza ambos.
- **Estado final:** Solicitud BORRADOR
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** La licitación aplica solo a productos masivos; se deshabilita para los individuales (HU251).

## ES-11 · Radicar con datos incompletos
- **Grupo / tipo / HU:** Emisión · Validación · HU195, HU191
- **Descripción:** Una solicitud vacía no puede radicarse; el sistema indica cada sección faltante.
- **Condiciones iniciales:** Solicitud en borrador sin completar.
- **Datos de entrada:** Solicitud recién creada.
- **Reglas:** RN-EM-15, RN-EM-23
- **Flujo:** 1) Crear 2) Radicar
- **Resultado esperado:** Rechazo con detalle por sección.
- **Estado final:** Solicitud BORRADOR
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** La solicitud tiene secciones incompletas o inválidas; no se puede radicar.

## ES-12 · Validaciones de amparos (tasa/prima, SMMLV, asistencia, carencia, deducible…)
- **Grupo / tipo / HU:** Emisión · Validación · HU647
- **Descripción:** Batería de reglas de la HU647 sobre amparos.
- **Condiciones iniciales:** Solicitud con producto AP Colectivo.
- **Datos de entrada:** Amparos con cada incumplimiento.
- **Reglas:** RN-EM-01, RN-EM-02, RN-EM-03, RN-EM-04, RN-EM-06, RN-EM-07, RN-EM-08, RN-EM-09
- **Flujo:** 1) Guardar plan con amparo inválido (×9) 2) Guardar plan válido
- **Resultado esperado:** Cada incumplimiento se rechaza con su mensaje; la tasa y los SMMLV calculan prima y valor asegurado.
- **Estado final:** Solicitud BORRADOR
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** Ver cada mensaje de la HU647.

## ES-13 · Amparo de asistencia: la carátula muestra «Asistencia Incluida»
- **Grupo / tipo / HU:** Emisión · Alterno · HU647
- **Descripción:** Internamente el valor asegurado puede ser $0; en la carátula se muestra el texto.
- **Condiciones iniciales:** Plan con amparo tipo Asistencia y proveedor.
- **Datos de entrada:** Asistencia odontológica (9067), proveedor E-Dental, VA $0.
- **Reglas:** RN-EM-06
- **Flujo:** 1) Plan con asistencia 2) Emitir 3) Ver carátula
- **Resultado esperado:** Carátula con «Asistencia Incluida».
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Carátula v1 con el texto.
- **Impacto facturación:** Sin impacto
- **Mensajes:** Asistencia Incluida

## ES-14 · Siniestralidad (vida y riesgos laborales)
- **Grupo / tipo / HU:** Emisión · Validación · HU195
- **Descripción:** Reglas de habilitación y obligatoriedad de la siniestralidad.
- **Condiciones iniciales:** Solicitud completa.
- **Datos de entrada:** Reclamaciones «Sí» sin siniestro; ARL sin afiliación; adjunto PDF.
- **Reglas:** RN-EM-14
- **Flujo:** 1) Guardar siniestralidad (×3) 2) Guardar válida
- **Resultado esperado:** Rechaza los tres casos; acepta la válida.
- **Estado final:** Solicitud BORRADOR
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** Con reclamaciones en los últimos 5 años debe registrar al menos un siniestro de vida.

## ES-15 · Edad del asegurado: superior a la máxima se rechaza; inferior a la mínima exige política
- **Grupo / tipo / HU:** Emisión · Alterno · HU647, HU207
- **Descripción:** La edad del amparo básico valida el cargue; una edad menor dispara la política «edad de ingreso inferior a la permitida».
- **Condiciones iniciales:** Amparo básico con edades 18-65.
- **Datos de entrada:** Asegurado de 70 años; asegurado de 9 años.
- **Reglas:** RN-EM-10, RN-EM-20, RN-EM-17
- **Flujo:** 1) Cargar asegurados 2) Radicar 3) Emitir (bloqueado) 4) Autorizar política 5) Emitir
- **Resultado esperado:** El de 70 se rechaza; el de 9 se acepta pero exige política; emite tras autorizar.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Incluye al asegurado menor tras la autorización.
- **Impacto facturación:** Sin impacto
- **Mensajes:** Edad de 70 años por encima de la edad máxima de ingreso (65) del amparo básico.

## ES-16 · Comisión por encima del límite: autoriza solo el nivel requerido
- **Grupo / tipo / HU:** Emisión · Alterno · HU207
- **Descripción:** Política de % de comisión: el usuario Básico no puede autorizar; el Intermedio sí.
- **Condiciones iniciales:** Comisión 30 % (límite 25 %).
- **Datos de entrada:** Intermediario con 30 %.
- **Reglas:** RN-EM-17, RN-EM-22
- **Flujo:** 1) Radicar 2) Autorizar con Básico (rechazado) 3) Autorizar con Intermedio 4) Emitir
- **Resultado esperado:** El Básico recibe «nivel insuficiente»; el Intermedio autoriza.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** La comisión se registra por asegurado en cada factura.
- **Mensajes:** Solicitud de Póliza No. SOL-xxxxxx requiere aprobación de Política(s) de Suscripción

## ES-17 · Retroactividad mayor de 30 días exige nivel Superior
- **Grupo / tipo / HU:** Emisión · Alterno · HU207
- **Descripción:** Código existente: 0-30 días Básico; más de 30 días Superior.
- **Condiciones iniciales:** Fecha del sistema 01/03/2026; vigencia desde 01/01/2026 (59 días).
- **Datos de entrada:** Vigencia retroactiva.
- **Reglas:** RN-EM-18, RN-EM-17
- **Flujo:** 1) Radicar 2) Autorizar con Avanzado (rechazado) 3) Autorizar con Superior 4) Emitir
- **Resultado esperado:** Solo Superior autoriza.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Póliza con vigencia retroactiva.
- **Impacto facturación:** Los períodos anteriores a hoy quedan pendientes de facturar (retroactividad).
- **Mensajes:** Su nivel de autorización no alcanza el nivel requerido.

## ES-18 · SARLAFT incompleto: solo el Oficial de Cumplimiento autoriza
- **Grupo / tipo / HU:** Emisión · Alterno · HU207, HU487
- **Descripción:** La política «Faltan datos SARLAFT» exige al Oficial de Cumplimiento.
- **Condiciones iniciales:** Formulario SARLAFT incompleto.
- **Datos de entrada:** sarlaft.completo = false
- **Reglas:** RN-EM-19, RN-EM-17
- **Flujo:** 1) Radicar 2) Intentar con Superior 3) Autorizar con Oficial 4) Emitir
- **Resultado esperado:** Solo el Oficial de Cumplimiento autoriza.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** Su nivel de autorización no alcanza el nivel requerido (Oficial Cumplimiento).

## ES-19 · Política rechazada: la solicitud queda rechazada
- **Grupo / tipo / HU:** Emisión · Rechazo · HU207
- **Descripción:** Si el autorizador rechaza una política, no hay emisión.
- **Condiciones iniciales:** Política pendiente.
- **Datos de entrada:** Rechazar P05.
- **Reglas:** RN-EM-17
- **Flujo:** 1) Radicar 2) Rechazar política 3) Intentar emitir
- **Resultado esperado:** Solicitud RECHAZADA; no se emite.
- **Estado final:** Solicitud RECHAZADA
- **Impacto póliza:** No se crea la póliza.
- **Impacto facturación:** Sin impacto
- **Mensajes:** La solicitud está rechazada y ya no puede editarse.

## ES-20 · Tomador en listas restrictivas: rechazo por SARLAFT
- **Grupo / tipo / HU:** Emisión · Rechazo · HU207
- **Descripción:** La consulta de listas restrictivas (simulada) encuentra coincidencia.
- **Condiciones iniciales:** Tomador con documento terminado en 666.
- **Datos de entrada:** CC 3000000666
- **Reglas:** RN-EM-21
- **Flujo:** 1) Radicar 2) Emitir 3) Rechazo SARLAFT
- **Resultado esperado:** Solicitud RECHAZADA con motivo SARLAFT.
- **Estado final:** Solicitud RECHAZADA
- **Impacto póliza:** No se crea la póliza.
- **Impacto facturación:** Sin impacto
- **Mensajes:** Rechazada por SARLAFT: el tomador coincide con listas restrictivas.

## ES-21 · Servicio de listas restrictivas caído: la emisión se bloquea sin perder la solicitud
- **Grupo / tipo / HU:** Emisión · Error · HU207
- **Descripción:** Error de integración bloqueante; la operación es atómica.
- **Condiciones iniciales:** Listas restrictivas en modo «falla» (simulado).
- **Datos de entrada:** Emitir con el servicio caído.
- **Reglas:** RN-FA-16
- **Flujo:** 1) Apagar servicio 2) Emitir 3) Reactivar 4) Emitir
- **Resultado esperado:** Error claro; la solicitud sigue radicada; emite al restablecer.
- **Estado final:** Solicitud EMITIDA (tras reintento)
- **Impacto póliza:** Sin cambios mientras falla.
- **Impacto facturación:** Sin impacto
- **Mensajes:** Listas restrictivas / SARLAFT (vía ESB) no disponible (simulado).

## ES-22 · Permisos por rol
- **Grupo / tipo / HU:** Emisión · Seguridad · HU077, HU309, HU577
- **Descripción:** Un rol sin permiso no puede ejecutar la acción (matriz simulada).
- **Condiciones iniciales:** —
- **Datos de entrada:** Usuario tercero emite; intermediario anula; funcionario anula.
- **Reglas:** RN-AD-22
- **Flujo:** 1) Intentar acciones no permitidas
- **Resultado esperado:** SIN_PERMISO en los tres casos.
- **Estado final:** —
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** El rol «Usuario tercero» no tiene permiso para esta acción.

## ES-23 · Eliminar solicitud: solo en borrador
- **Grupo / tipo / HU:** Emisión · Validación · HU197
- **Descripción:** Una solicitud radicada no se elimina.
- **Condiciones iniciales:** —
- **Datos de entrada:** Eliminar borrador y eliminar radicada.
- **Reglas:** RN-EM-24
- **Flujo:** 1) Eliminar borrador 2) Eliminar radicada
- **Resultado esperado:** El borrador se elimina; la radicada no.
- **Estado final:** —
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** Solo se pueden eliminar solicitudes en estado Guardado/Borrador (HU197).

## ES-24 · Registraduría completa nombres del asegurado
- **Grupo / tipo / HU:** Emisión · Alterno · HU404, HU193
- **Descripción:** Con CC y sin nombres el servicio simulado de Registraduría los completa.
- **Condiciones iniciales:** Registraduría en modo OK.
- **Datos de entrada:** CC 1020202020 sin nombres.
- **Reglas:** RN-EM-26
- **Flujo:** 1) Cargar asegurado solo con documento
- **Resultado esperado:** Nombre «Juan», apellido «Pérez».
- **Estado final:** —
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** —

## ES-25 · Estudio técnico: «en estudio», secciones bloqueadas y subtotal de costos
- **Grupo / tipo / HU:** Emisión · Alterno · HU207
- **Descripción:** Tras radicar solo se editan las secciones del estudio técnico; guardar deja la solicitud en estudio; % siniestralidad = subtotal.
- **Condiciones iniciales:** Solicitud radicada.
- **Datos de entrada:** Editar costos; intentar editar el tomador.
- **Reglas:** RN-EM-16, RN-EM-25
- **Flujo:** 1) Radicar 2) Guardar costos 3) Editar tomador (bloqueado)
- **Resultado esperado:** Estado EN_ESTUDIO; subtotal 31,9 %.
- **Estado final:** Solicitud EN_ESTUDIO
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** Tras radicar solo se editan las secciones del estudio técnico.

## ES-26 · Guardar borrador sin validar vs. continuar validando
- **Grupo / tipo / HU:** Emisión · Validación · HU251
- **Descripción:** «Guardar» permite datos parciales; «Continuar» exige los obligatorios.
- **Condiciones iniciales:** —
- **Datos de entrada:** Tomador incompleto.
- **Reglas:** RN-EM-15
- **Flujo:** 1) Guardar parcial 2) Continuar
- **Resultado esperado:** Guardar OK con avisos; Continuar rechaza.
- **Estado final:** Solicitud BORRADOR
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** Corrija los campos obligatorios o inválidos antes de continuar.

## ES-27 · La suma de primas de los amparos prevalece sobre la prima del plan
- **Grupo / tipo / HU:** Emisión · Alterno · HU647, HU577
- **Descripción:** Si la suma de primas de los amparos no coincide con la del plan se respeta la suma de amparos para facturar; sin prima en amparos se usa la del plan.
- **Condiciones iniciales:** Plan con prima registrada 150.000 y amparos que suman 120.000.
- **Datos de entrada:** Plan A con amparos con prima; plan B sin prima en amparos.
- **Reglas:** RN-EM-05
- **Flujo:** 1) Registrar planes 2) Emitir 3) Consultar prima
- **Resultado esperado:** Plan A factura 120.000 (diferencia −30.000 informada); plan B usa su prima de 90.000.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Prima de vigencia según suma de amparos.
- **Impacto facturación:** La facturación usa la suma de amparos.
- **Mensajes:** —

## ES-30 · Cambio de sucursal con fecha de aplicación
- **Grupo / tipo / HU:** Administración · Exitoso · HU294
- **Descripción:** La nueva sucursal rige desde la fecha de aplicación; los recibos anteriores conservan la sucursal.
- **Condiciones iniciales:** Póliza vigente en Bogotá, primer período facturado.
- **Datos de entrada:** Medellín, fecha de aplicación 01/02/2026.
- **Reglas:** RN-AD-05, RN-AD-20, RN-AD-21
- **Flujo:** 1) Facturar período 1 2) Cambio de sucursal 3) Facturar período 2
- **Resultado esperado:** Movimiento 2, carátula v2; recibo 1 en Bogotá y recibo 2 en Medellín.
- **Estado final:** Póliza VIGENTE (sucursal Medellín)
- **Impacto póliza:** Sucursal actualizada; carátula versionada.
- **Impacto facturación:** Solo los recibos posteriores a la fecha de aplicación reflejan la nueva sucursal.
- **Mensajes:** Los cambios se han guardado correctamente.

## ES-31 · Cambio de sucursal: intermediario no habilitado (bloqueo)
- **Grupo / tipo / HU:** Administración · Rechazo · HU294
- **Descripción:** El intermediario no comercializa en la sucursal destino; el cambio se bloquea.
- **Condiciones iniciales:** Intermediario INT-1001 (Bogotá, Medellín, Cali).
- **Datos de entrada:** Sucursal destino Barranquilla.
- **Reglas:** RN-AD-06
- **Flujo:** 1) Cambio de sucursal
- **Resultado esperado:** Bloqueo sin cambios; si la póliza es directa sí se permite.
- **Estado final:** Póliza sin cambios
- **Impacto póliza:** Ninguno.
- **Impacto facturación:** Sin impacto
- **Mensajes:** El intermediario no se encuentra disponible para esta sucursal nueva.

## ES-32 · Cambio de sucursal no aplica a AP Viajero
- **Grupo / tipo / HU:** Administración · Validación · HU294
- **Descripción:** La HU excluye AP Viajero y AP Bicibles.
- **Condiciones iniciales:** Póliza AP Viajero.
- **Datos de entrada:** Cambio a Cali.
- **Reglas:** RN-AD-05
- **Flujo:** 1) Cambio de sucursal
- **Resultado esperado:** Rechazo.
- **Estado final:** Póliza sin cambios
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** El cambio de sucursal no aplica para pólizas AP Viajero ni AP Bicibles (HU294).

## ES-33 · Cambio de % de comisión: reglas de fecha, tipo de póliza y autorización
- **Grupo / tipo / HU:** Administración · Alterno · HU296
- **Descripción:** Solo intermediadas, no retroactivo, al inicio de un período; por encima del límite requiere autorización.
- **Condiciones iniciales:** Póliza intermediada con 10 %.
- **Datos de entrada:** 15 % desde 01/02; 30 % desde 01/03 (excede el límite de 25 %).
- **Reglas:** RN-AD-07, RN-AD-08
- **Flujo:** 1) Cambiar a 15 % 2) Intentar fechas inválidas 3) Cambiar a 30 % (autorización) 4) Aprobar 5) Facturar 3 períodos
- **Resultado esperado:** Cada factura usa la comisión vigente al inicio de su período: 10 %, 15 %, 30 %.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Historial de comisión.
- **Impacto facturación:** No afecta facturas ya emitidas; aplica a recibos futuros.
- **Mensajes:** El cambio de comisión no puede ser retroactivo: aplica a recibos futuros (HU296).

## ES-34 · Modificación de gastos con usuario autorizador
- **Grupo / tipo / HU:** Administración · Alterno · HU300
- **Descripción:** El cambio de % de gastos se solicita a un autorizador de nivel superior y solo se aplica al aprobarse.
- **Condiciones iniciales:** Autorizador nivel Superior distinto del solicitante.
- **Datos de entrada:** Gastos de administración 18 %, utilidad 6 %.
- **Reglas:** RN-AD-09, RN-AD-21
- **Flujo:** 1) Solicitar 2) Aprobar / rechazar
- **Resultado esperado:** Sin cambios hasta aprobar; luego movimiento con anterior/actual; el rechazo no cambia nada.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Costos actualizados tras la aprobación.
- **Impacto facturación:** Requiere ajuste de prima posterior (fórmula no documentada: brecha G-14).
- **Mensajes:** Seleccione un usuario autorizador de nivel Superior o mayor distinto de usted (HU300).

## ES-35 · Cambio de tomador (natural → jurídica)
- **Grupo / tipo / HU:** Administración · Alterno · HU309
- **Descripción:** El tomador cambia de tipo de persona con sus campos obligatorios.
- **Condiciones iniciales:** Póliza con tomador persona natural.
- **Datos de entrada:** Persona jurídica con representante legal y correo de facturación.
- **Reglas:** RN-AD-10, RN-AD-20
- **Flujo:** 1) Cambio de tomador incompleto 2) Cambio completo
- **Resultado esperado:** Rechaza incompleto; acepta completo; carátula v2.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Nuevo tomador; carátula versionada.
- **Impacto facturación:** Sin impacto
- **Mensajes:** El correo para facturación electrónica es obligatorio y debe ser válido.

## ES-36 · Modificación de periodicidad según el estado de facturación
- **Grupo / tipo / HU:** Administración · Alterno · HU675
- **Descripción:** Reglas de transición de HU675: libre sin facturar; con facturas, restricciones por periodicidad; recorte de períodos sobre los cortes de la vigencia.
- **Condiciones iniciales:** Pólizas con distinta periodicidad.
- **Datos de entrada:** Anual→Mensual (facturada), Mensual→Anual, Trimestral→Semestral/Mensual.
- **Reglas:** RN-AD-11, RN-AD-12
- **Flujo:** 1) Cambiar sin facturar 2) Facturar un período 3) Cambiar según regla
- **Resultado esperado:** Las fechas de los períodos siguientes coinciden con los ejemplos de la HU.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Cronograma reorganizado; carátula versionada.
- **Impacto facturación:** No afecta facturas anteriores.
- **Mensajes:** La póliza ya fue facturada con periodicidad Anual: no se puede modificar en la vigencia en curso.

## ES-37 · Ajuste de planes: reglas de amparos y facturación de la diferencia
- **Grupo / tipo / HU:** Administración · Alterno · HU387, HU647
- **Descripción:** Editar prima de un amparo, agregar y eliminar amparos de la novedad; la diferencia sobre lo ya facturado genera ajuste o nota crédito.
- **Condiciones iniciales:** Póliza con período 1 facturado (5 facturas de 10.000).
- **Datos de entrada:** Prima del básico +10.000; agregar 785; eliminar 785; eliminar básico/amparo de emisión.
- **Reglas:** RN-AD-13, RN-AD-14, RN-AD-20
- **Flujo:** 1) Editar prima 2) Eliminar básico (rechazo) 3) Eliminar amparo de emisión (rechazo) 4) Agregar amparo 5) Eliminar amparo de la novedad
- **Resultado esperado:** Ajuste +833,33 por asegurado; luego +1.666,67; luego nota crédito −1.666,67; carátula versionada.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Plan modificado; carátula nueva versión.
- **Impacto facturación:** Facturas de ajuste y notas crédito sobre el período ya facturado; los períodos futuros usan la nueva prima.
- **Mensajes:** No se pueden eliminar los amparos creados al momento de la radicación de la póliza.

## ES-38 · Ajuste de planes con siniestros en curso requiere autorización y alerta
- **Grupo / tipo / HU:** Administración · Alterno · HU387
- **Descripción:** Si el cambio puede afectar siniestros en curso, queda pendiente de autorización Superior y se alerta al responsable.
- **Condiciones iniciales:** Póliza con 2 siniestros en curso (dato de prueba; el módulo de Siniestros no está en la demo).
- **Datos de entrada:** Cambiar prima del básico con fecha de hoy.
- **Reglas:** RN-AD-15
- **Flujo:** 1) Solicitar ajuste 2) Autorizar con Avanzado (rechazo) 3) Autorizar con Superior
- **Resultado esperado:** Pendiente de autorización; aplica al aprobar y alerta.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Ajuste aplicado tras autorización.
- **Impacto facturación:** Ajuste de prima sobre lo facturado.
- **Mensajes:** Hay 2 siniestro(s) en curso que el cambio puede afectar.

## ES-39 · Cargue masivo de beneficiarios
- **Grupo / tipo / HU:** Administración · Alterno · HU404
- **Descripción:** Validaciones del cargue; solo se sobrescriben los asegurados incluidos en el archivo.
- **Condiciones iniciales:** Póliza nominada con 3 asegurados.
- **Datos de entrada:** Archivo con casos correctos e incorrectos.
- **Reglas:** RN-AD-16, RN-EM-26
- **Flujo:** 1) Cargue mixto 2) Cargue de otro asegurado 3) Cargue que reemplaza
- **Resultado esperado:** Registros «Correcto/Incorrecto» con observaciones; el grupo se carga solo si suma 100 % sin errores.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Beneficiarios por asegurado; movimiento sin recibo.
- **Impacto facturación:** Sin impacto
- **Mensajes:** El % de designación no suma el 100%

## ES-40 · Inclusión de asegurados: edad, duplicados y retroactividad
- **Grupo / tipo / HU:** Administración · Alterno · HU577
- **Descripción:** La inclusión valida edad por amparo básico y duplicidad; más de 30 días de retroactividad exige autorización Superior.
- **Condiciones iniciales:** Póliza vigente.
- **Datos de entrada:** Asegurado nuevo; asegurado de 70 años; ingreso retroactivo de 64 días.
- **Reglas:** RN-AD-17, RN-EM-10
- **Flujo:** 1) Incluir 2) Incluir inválido 3) Incluir retroactivo 4) Autorizar
- **Resultado esperado:** El asegurado queda vigente con novedad pendiente de facturar; el retroactivo espera autorización.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Nuevo asegurado y movimiento de inclusión.
- **Impacto facturación:** Novedad facturable (prorrata) en el módulo de Facturación.
- **Mensajes:** La retroactividad de 64 días supera el límite.

## ES-41 · Retiro de asegurado
- **Grupo / tipo / HU:** Administración · Alterno · HU577
- **Descripción:** El retiro conserva las condiciones comerciales y detiene la facturación posterior.
- **Condiciones iniciales:** Póliza mensual con 5 asegurados.
- **Datos de entrada:** Retirar al asegurado 5 con fecha 01/02/2026.
- **Reglas:** RN-AD-18, RN-FA-19
- **Flujo:** 1) Retirar 2) Facturar períodos 1 y 2
- **Resultado esperado:** Período 1: 5 facturas; período 2: 4 facturas.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Asegurado RETIRADO.
- **Impacto facturación:** No se factura después del retiro.
- **Mensajes:** —

## ES-45 · Listado de asegurados por movimiento (HU446)
- **Grupo / tipo / HU:** Administración · Consulta · HU446
- **Descripción:** El listado se genera por movimiento con novedad, fecha, prima individual (positiva en ingresos y negativa en retiros) y totales.
- **Condiciones iniciales:** Póliza con un retiro.
- **Datos de entrada:** Listado del movimiento de emisión y del de retiro.
- **Reglas:** RN-AD-19
- **Flujo:** 1) Emitir 2) Retirar 3) Generar listados
- **Resultado esperado:** Emisión: 5 ingresos por 600.000; retiro: prima negativa proporcional (334/365 de 120.000).
- **Estado final:** —
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** —

## ES-42 · Histórico de novedades (HU558)
- **Grupo / tipo / HU:** Administración · Consulta · HU558
- **Descripción:** Lista el 100 % de movimientos del último al primero con tipo, fechas, usuario y estado del recibo.
- **Condiciones iniciales:** Póliza con novedades.
- **Datos de entrada:** Emisión + cambio de sucursal + cambio de comisión; facturar período 1.
- **Reglas:** RN-AD-19
- **Flujo:** 1) Consultar histórico
- **Resultado esperado:** Movimientos 3,2,1; «Sin recibo» en los que no tienen prima; el 1 pasa de «Pendiente de facturar» a «Pendiente».
- **Estado final:** —
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** —

## ES-43 · Carátulas versionadas: la anterior se conserva como soporte
- **Grupo / tipo / HU:** Administración · Alterno · HU558, HU294, HU675
- **Descripción:** Cada movimiento que afecta la carátula crea una versión nueva y la anterior permanece consultable.
- **Condiciones iniciales:** Póliza con novedades de sucursal y periodicidad.
- **Datos de entrada:** Cambio de sucursal y de periodicidad.
- **Reglas:** RN-AD-20
- **Flujo:** 1) Novedades 2) Consultar versiones
- **Resultado esperado:** 3 versiones; la v1 conserva la sucursal original.
- **Estado final:** —
- **Impacto póliza:** Histórico de carátulas.
- **Impacto facturación:** Sin impacto
- **Mensajes:** —

## ES-44 · Trazabilidad: auditoría con valores anterior y nuevo
- **Grupo / tipo / HU:** Administración · Trazabilidad · HU296, HU294, HU300
- **Descripción:** Toda novedad deja usuario, fecha y datos anterior/nuevo.
- **Condiciones iniciales:** —
- **Datos de entrada:** Cambio de comisión.
- **Reglas:** RN-AD-21
- **Flujo:** 1) Novedad 2) Consultar auditoría
- **Resultado esperado:** Registro con antes {comision:10} y después {comision:15}.
- **Estado final:** —
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** —

## ES-50 · Anulación sin período facturado: no hay reembolsos
- **Grupo / tipo / HU:** Anulación · Exitoso · HU077
- **Descripción:** Si el período de la fecha de anulación no se ha facturado, no hay facturas ni reembolsos (ejemplo 1 de la HU).
- **Condiciones iniciales:** Solo el período 1 facturado.
- **Datos de entrada:** Solicitud del tomador, anulación desde 01/02/2026.
- **Reglas:** RN-AD-01, RN-AD-02, RN-AD-04
- **Flujo:** 1) Facturar período 1 2) Anular desde 01/02
- **Resultado esperado:** Póliza ANULADA sin notas crédito.
- **Estado final:** Póliza ANULADA
- **Impacto póliza:** Estado Anulada; períodos futuros anulados; documentación accesible.
- **Impacto facturación:** Sin notas crédito. No se factura más.
- **Mensajes:** El período de la fecha de anulación no estaba facturado: no hay lugar a reembolsos ni nuevas facturas.

## ES-51 · Anulación con período facturado: nota crédito y cruce de recibos
- **Grupo / tipo / HU:** Anulación · Exitoso · HU077
- **Descripción:** Período ya facturado y sin pagos: nota crédito con recibo de prima negativa y cruce (ejemplo 2 de la HU).
- **Condiciones iniciales:** Períodos 1 y 2 facturados, sin pagos.
- **Datos de entrada:** Anulación desde 01/02/2026 por decisión de la aseguradora (falta de pago).
- **Reglas:** RN-AD-01, RN-AD-02, RN-AD-03
- **Flujo:** 1) Facturar 2 períodos 2) Anular
- **Resultado esperado:** 5 notas crédito de −10.000; recibos originales del período 2 ANULADOS por cruce.
- **Estado final:** Póliza ANULADA
- **Impacto póliza:** Póliza anulada.
- **Impacto facturación:** Notas crédito con recibo negativo; cruce por Recaudo y Cartera.
- **Mensajes:** Sin pagos previos: basta el cruce de recibos.

## ES-52 · Anulación con pago previo: reembolso
- **Grupo / tipo / HU:** Anulación · Alterno · HU077
- **Descripción:** Si el cliente alcanzó a pagar el período, procede reembolso.
- **Condiciones iniciales:** Un asegurado pagó su recibo del período 2.
- **Datos de entrada:** Anulación desde 01/02/2026.
- **Reglas:** RN-AD-03
- **Flujo:** 1) Facturar 2 períodos 2) Pagar un recibo 3) Anular 4) Registrar reembolso
- **Resultado esperado:** Una nota con REEMBOLSO; las demás con CRUCE.
- **Estado final:** Póliza ANULADA
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Nota crédito pendiente de reembolso → reembolsada.
- **Mensajes:** Hay pagos previos: procede reembolso al tomador.

## ES-53 · Validaciones de la anulación
- **Grupo / tipo / HU:** Anulación · Validación · HU077
- **Descripción:** Tipo, motivo condicional, fecha dentro de la vigencia y razón.
- **Condiciones iniciales:** Póliza vigente.
- **Datos de entrada:** Decisión de la aseguradora sin motivo; fecha fuera de vigencia; sin razón.
- **Reglas:** RN-AD-01
- **Flujo:** 1) Anular (×3)
- **Resultado esperado:** Rechazos con mensajes por campo.
- **Estado final:** Póliza VIGENTE
- **Impacto póliza:** Sin cambios.
- **Impacto facturación:** Sin impacto
- **Mensajes:** Con decisión de la aseguradora el motivo de anulación es obligatorio.

## ES-54 · Anulación a mitad de período: nota crédito proporcional
- **Grupo / tipo / HU:** Anulación · Alterno · HU077
- **Descripción:** La HU solo ilustra períodos completos; con fecha intermedia se acredita la parte posterior a la fecha (supuesto A-05).
- **Condiciones iniciales:** Período 2 (01/02–01/03) facturado.
- **Datos de entrada:** Anulación desde 16/02/2026.
- **Reglas:** RN-AD-02
- **Flujo:** 1) Facturar 2 períodos 2) Anular desde 16/02
- **Resultado esperado:** 13/28 de 10.000 = 4.642,86 por asegurado.
- **Estado final:** Póliza ANULADA
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Nota crédito proporcional.
- **Mensajes:** —

## ES-60 · Primer período sin novedades: una factura y un recibo por asegurado
- **Grupo / tipo / HU:** Facturación · Exitoso · HU577, HU091
- **Descripción:** La facturación individual genera factura electrónica y recibo para cada asegurado; la prima del plan no se multiplica por el número de asegurados.
- **Condiciones iniciales:** Póliza nominada mensual con 5 asegurados y datos DIAN completos.
- **Datos de entrada:** Facturar el período 1, modalidad sin novedades.
- **Reglas:** RN-FA-01, RN-FA-02, RN-FA-03, RN-FA-10, RN-FA-11, RN-FA-12
- **Flujo:** 1) Facturar período 1
- **Resultado esperado:** 5 facturas de 10.000 (120.000/12) con CUFE, comisión del 10 % por asegurado y recibos pendientes.
- **Estado final:** Período 1 FACTURADO
- **Impacto póliza:** Cronograma: período 1 facturado; el siguiente es 01/02/2026.
- **Impacto facturación:** Total facturado 50.000 = 600.000/12.
- **Mensajes:** —

## ES-61 · Pre-validación DIAN: faltan campos y no se factura nada
- **Grupo / tipo / HU:** Facturación · Validación · HU577
- **Descripción:** Si a algún asegurado le faltan campos exigidos por la DIAN se bloquea toda la facturación y se listan los faltantes.
- **Condiciones iniciales:** Un asegurado sin correo y otro sin dirección.
- **Datos de entrada:** Facturar período 1.
- **Reglas:** RN-FA-08
- **Flujo:** 1) Validar 2) Facturar (bloqueado) 3) Corregir 4) Facturar
- **Resultado esperado:** Rechazo que lista asegurado y campo; cero facturas; el período sigue pendiente.
- **Estado final:** Período pendiente
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Ninguna factura se genera.
- **Mensajes:** No se puede facturar: 2 validación(es) previa(s) fallaron. No se generó ninguna factura.

## ES-62 · Prima cero: se registra el proceso sin factura ni recibo
- **Grupo / tipo / HU:** Facturación · Alterno · HU577
- **Descripción:** Con valor de prima cero el sistema procesa el período sin generar factura electrónica ni recibo.
- **Condiciones iniciales:** Prima por asegurado de 0,01 (el período mensual redondea a 0,00).
- **Datos de entrada:** Facturar período 1.
- **Reglas:** RN-FA-07
- **Flujo:** 1) Facturar período 1
- **Resultado esperado:** 0 facturas, 5 registros «sin factura», período facturado.
- **Estado final:** Período 1 FACTURADO
- **Impacto póliza:** El período queda cerrado.
- **Impacto facturación:** Sin factura ni recibo (el código actual lo bloquea con «No se permite facturar con prima en cero»).
- **Mensajes:** Prima cero: se registra el proceso sin factura electrónica ni recibo (HU577).

## ES-63 · Facturar toda la vigencia y no refacturar
- **Grupo / tipo / HU:** Facturación · Alterno · HU577
- **Descripción:** Los 12 períodos se facturan en orden cronológico; después no queda nada por facturar.
- **Condiciones iniciales:** Póliza mensual.
- **Datos de entrada:** 12 facturaciones y una más.
- **Reglas:** RN-FA-03, RN-FA-09
- **Flujo:** 1) Facturar ×12 2) Facturar una vez más
- **Resultado esperado:** Total facturado por asegurado = prima de vigencia; la 13.ª se rechaza.
- **Estado final:** Vigencia 100 % facturada
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** 60 facturas; 600.000 en total.
- **Mensajes:** La vigencia ya está facturada por completo.

## ES-64 · Facturación pendiente identificada
- **Grupo / tipo / HU:** Facturación · Consulta · HU577
- **Descripción:** El sistema indica qué pólizas tienen período por facturar y cuál es el siguiente.
- **Condiciones iniciales:** Póliza recién emitida.
- **Datos de entrada:** Consultar estado de facturación.
- **Reglas:** RN-FA-06
- **Flujo:** 1) Consultar
- **Resultado esperado:** Siguiente período 01/01→01/02; contador del panel = 1.
- **Estado final:** —
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** —

## ES-65 · Ingreso a mitad de período: prorrata con novedades
- **Grupo / tipo / HU:** Facturación · Alterno · HU577
- **Descripción:** El asegurado que ingresa el 10/02 se factura a prorrata en la modalidad «con novedades».
- **Condiciones iniciales:** Inclusión de un asegurado con ingreso 10/02/2026; período 1 facturado.
- **Datos de entrada:** Facturar período 2 con novedades.
- **Reglas:** RN-FA-04, RN-FA-06
- **Flujo:** 1) Incluir asegurado 2) Facturar período 1 3) Facturar período 2 con novedades
- **Resultado esperado:** Factura de novedad de 19/28 × 10.000 = 6.785,71; las demás de 10.000.
- **Estado final:** Novedad facturada
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Prorrata sobre la prima diaria del período.
- **Mensajes:** —

## ES-66 · Ingreso retroactivo: dos facturas del mismo asegurado (solo novedades)
- **Grupo / tipo / HU:** Facturación · Alterno · HU577
- **Descripción:** Con facturación mensual y un ingreso retroactivo se generan facturas por cada período pendiente del mismo asegurado.
- **Condiciones iniciales:** Períodos 1 y 2 facturados; ingreso real 20/02/2026 registrado el 10/03/2026.
- **Datos de entrada:** Facturar «solo novedades».
- **Reglas:** RN-FA-05, RN-FA-06, RN-FA-09
- **Flujo:** 1) Facturar 2 períodos 2) Incluir asegurado retroactivo 3) Facturar solo novedades 4) Facturar período 3
- **Resultado esperado:** 2 facturas del asegurado nuevo (3.214,29 y 10.000); el período 3 sigue pendiente; luego el período 3 no lo duplica.
- **Estado final:** Sin duplicidad
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Facturas retroactivas por período.
- **Mensajes:** —

## ES-67 · Error de la facturación electrónica: la operación es atómica
- **Grupo / tipo / HU:** Facturación · Error · HU577
- **Descripción:** Si la DIAN/OPEN no responde no se genera ninguna factura y el período sigue pendiente.
- **Condiciones iniciales:** Servicio DIAN_OPEN en modo «falla» (simulado).
- **Datos de entrada:** Facturar período 1.
- **Reglas:** RN-FA-16
- **Flujo:** 1) Apagar servicio 2) Facturar 3) Reactivar 4) Facturar
- **Resultado esperado:** Error claro; cero facturas; al restablecer factura bien.
- **Estado final:** Período 1 FACTURADO (tras reintento)
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Ninguna factura parcial.
- **Mensajes:** Facturación electrónica (OPEN / DIAN) no disponible (simulado).

## ES-68 · SAP caído: la factura se emite y el asiento queda pendiente de reintento
- **Grupo / tipo / HU:** Facturación · Error · HU577
- **Descripción:** SAP no es bloqueante (tiene reintento programado en el sistema real).
- **Condiciones iniciales:** SAP en modo «falla» (simulado).
- **Datos de entrada:** Facturar período 1.
- **Reglas:** RN-FA-16
- **Flujo:** 1) Apagar SAP 2) Facturar
- **Resultado esperado:** Facturas emitidas con asiento pendiente.
- **Estado final:** Período 1 FACTURADO
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Contabilización pendiente.
- **Mensajes:** —

## ES-69 · Póliza innominada: factura única a nombre del tomador
- **Grupo / tipo / HU:** Facturación · Alterno · HU577
- **Descripción:** Sin asegurados individualizados se factura a nivel póliza (supuesto S-06).
- **Condiciones iniciales:** Innominada con 40 asegurados.
- **Datos de entrada:** Facturar período 1; intentar «con novedades».
- **Reglas:** RN-FA-15
- **Flujo:** 1) Facturar 2) Intentar con novedades
- **Resultado esperado:** Una factura de 400.000; las novedades no aplican.
- **Estado final:** Período 1 FACTURADO
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Factura única a nombre del tomador.
- **Mensajes:** En pólizas innominadas no hay facturación por asegurado ni por novedades.

## ES-70 · Recibo: estados Pendiente → Parcial → Legalizado y En mora
- **Grupo / tipo / HU:** Facturación · Alterno · HU091, HU577
- **Descripción:** El estado del recibo evoluciona con los pagos y con la fecha.
- **Condiciones iniciales:** Póliza individual (un recibo).
- **Datos de entrada:** Pagos de 4.000 y 6.000; reloj al 15/02.
- **Reglas:** RN-FA-13, RN-FA-14
- **Flujo:** 1) Pagar parcial 2) Pagar de más (rechazo) 3) Completar 4) Mora
- **Resultado esperado:** PENDIENTE → PARCIAL → LEGALIZADO; EN_MORA pasado el plazo; «sin recibos pendientes» al final.
- **Estado final:** Recibos legalizados
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Cartera por asegurado.
- **Mensajes:** Esta póliza no tiene recibos de pago pendientes

## ES-71 · Contenido del recibo de pago (HU091)
- **Grupo / tipo / HU:** Facturación · Consulta · HU091
- **Descripción:** El recibo trae referencia, tomador, póliza, vigencia, periodicidad, medios de pago y código de barras.
- **Condiciones iniciales:** Acuerdo de pago de 45 días.
- **Datos de entrada:** Consultar recibo.
- **Reglas:** RN-FA-12, RN-FA-11
- **Flujo:** 1) Facturar 2) Consultar recibo
- **Resultado esperado:** Pague antes de = emisión + 45 días; código Bancolombia con la estructura documentada; auditoría de la consulta.
- **Estado final:** —
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** —

## ES-72 · Delegación del intermediario y permisos para facturar
- **Grupo / tipo / HU:** Facturación · Seguridad · HU577
- **Descripción:** El intermediario factura solo sus pólizas; el usuario tercero no factura.
- **Condiciones iniciales:** Pólizas de INT-1001 e INT-1002.
- **Datos de entrada:** Facturar con el usuario intermediario INT-1001.
- **Reglas:** RN-FA-18, RN-AD-22
- **Flujo:** 1) Facturar póliza propia 2) Facturar ajena 3) Tercero factura
- **Resultado esperado:** Permite la propia; rechaza la ajena y al tercero.
- **Estado final:** —
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** El intermediario no tiene delegación sobre esta póliza (HU577).

## ES-73 · Historial de facturación por asegurado
- **Grupo / tipo / HU:** Facturación · Consulta · HU846
- **Descripción:** Consulta de todas las facturas de un asegurado.
- **Condiciones iniciales:** Tres períodos facturados.
- **Datos de entrada:** Historial del asegurado 2000000003.
- **Reglas:** RN-FA-17
- **Flujo:** 1) Facturar ×3 2) Consultar historial
- **Resultado esperado:** 3 facturas consecutivas.
- **Estado final:** —
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** —

## ES-74 · IVA parametrizado
- **Grupo / tipo / HU:** Facturación · Alterno · HU577
- **Descripción:** La HU dice «IVA si corresponde»; el IVA es un parámetro (por defecto 0 %, como el sistema actual fuera de Salud).
- **Condiciones iniciales:** IVA = 19 % en Configuración.
- **Datos de entrada:** Facturar período 1.
- **Reglas:** RN-FA-02
- **Flujo:** 1) Configurar IVA 2) Facturar
- **Resultado esperado:** Neto 10.000, IVA 1.900, total 11.900.
- **Estado final:** —
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** El IVA se discrimina en la factura y en el recibo.
- **Mensajes:** —

## ES-75 · Pago por Wompi (simulado) y trazabilidad de integraciones
- **Grupo / tipo / HU:** Facturación · Alterno · HU091
- **Descripción:** El pago por pasarela deja registro en la bitácora de integraciones.
- **Condiciones iniciales:** Wompi simulado.
- **Datos de entrada:** Pagar un recibo por «Pagos en línea (Wompi)».
- **Reglas:** RN-FA-16
- **Flujo:** 1) Facturar 2) Pagar por Wompi
- **Resultado esperado:** Recibo legalizado y fila WOMPI en la bitácora.
- **Estado final:** Recibo LEGALIZADO
- **Impacto póliza:** Sin impacto
- **Impacto facturación:** Sin impacto
- **Mensajes:** —

