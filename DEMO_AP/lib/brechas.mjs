// Contradicciones documentales, brechas, supuestos y decisiones de la demo. Cada ítem propone cómo resolverlo.
const c = (id, titulo, detalle, fuentes, decision, propuesta) => ({ id, titulo, detalle, fuentes, decision, propuesta });
export const CONTRADICCIONES = [
  c('C-01', 'Estados del recibo', 'HU091 define 3 estados (pendiente, pagado, en mora); HU577 V5 define 5 (Pendiente, Legalizado, Parcial, En mora, Anulado); HU558 lista Cobrado / pendiente / parcial / Sin recibo.', 'HU091, HU577, HU558', 'D-06: se adoptó el superconjunto de HU577 V5 y «Sin recibo» solo en el histórico.', 'Recaudo y Cartera debe publicar el catálogo único de estados.'),
  c('C-02', 'Plazo de pago del recibo', 'HU091: «fecha de emisión + 30 días» y «plazo máximo de un mes»; HU577: «días establecidos para cada producto o los registrados en la póliza (acuerdo de pago)».', 'HU091, HU577', 'Parámetro con 30 días por defecto, sobrescribible por póliza (acuerdo de pago).', 'Confirmar si el plazo es por producto, por póliza o fijo.'),
  c('C-03', 'Alcance de «Ajuste de planes»', 'HU387 dice que aplica solo a Vida Grupo y Colectivo vigilante y que «no se puede realizar a pólizas vigentes»; la carpeta de AP la incluye y HU647 la menciona para AP.', 'HU387, HU647', 'D-05: se permite en AP sobre pólizas vigentes (de lo contrario la novedad no tendría sentido).', 'Negocio debe confirmar el alcance y el significado de «no vigentes» (¿vencidas?).'),
  c('C-04', 'Cambio de comisión: fecha de aplicación', 'HU296: «a inicio de vigencia o en la renovación, nunca a mitad de vigencia» frente a «aplica a recibos futuros pendientes de recaudo».', 'HU296', 'D-04: se concilia como inicio de período de facturación; configurable a lectura estricta.', 'Definir cuál criterio prevalece.'),
  c('C-05', 'Cambio de sucursal con intermediario no habilitado', 'El cuerpo de HU294 deja abierta la alternativa; el criterio de aceptación y el código existente bloquean el cambio.', 'HU294, NovedadCambioSucursalServiceImpl', 'D-03: bloqueo duro.', 'Si negocio quiere pedir una nueva clave de intermediación, es desarrollo nuevo.'),
  c('C-06', 'Cambio de tomador: regla fuera de lugar', 'HU309 condiciona la visibilidad de los campos a «Requiere Honorarios (Retorno) = Sí» (texto de otra HU) y exige nombre comercial a la persona natural.', 'HU309', 'Se ignora la regla de visibilidad; el nombre comercial de persona natural no es obligatorio.', 'Corregir la HU.'),
  c('C-07', 'Numeración de pasos de la solicitud', 'HU188 ubica coaseguro en el módulo 2; HU195 describe 5 pasos sin coaseguro ni licitación y HU647 llama «paso 4» a Productos.', 'HU188, HU195, HU647', 'La demo organiza la solicitud en secciones sin numerar pasos.', 'Publicar el flujo oficial de pasos con las secciones condicionales.'),
  c('C-08', 'Ciclo de vida de la solicitud', 'HU251: «Guardado/Borrador y pendiente»; HU207: «en estudio»; HU195: «radicada». No hay diagrama de estados.', 'HU251, HU207, HU195', 'Estados de la demo: BORRADOR → RADICADA → EN_ESTUDIO → EMITIDA o RECHAZADA.', 'Formalizar el diagrama de estados de la solicitud.'),
  c('C-09', 'Escala de la tasa comercial', 'HU647 la define como «Milaje»; HU577 escribe «Prima = Valor asegurado × Tasa» sin escala.', 'HU647, HU577', 'S-01: tasa por mil.', 'Confirmar la unidad de la tasa.'),
  c('C-10', 'Prorrata: ÷365 o fracción de periodicidad', 'HU577 menciona «prorrateo a 365 días o prima diaria»; el documento de control de cambios HU728 mezcla ambas y el motor actual usa fracción de periodicidad.', 'HU577, HU728 (Q-004)', 'D-01 y D-02: fracción de periodicidad para períodos completos y prima diaria del período para parciales.', 'Decidir una única regla y reescribir los ejemplos.'),
  c('C-11', 'Recibo al cambiar de sucursal', 'HU294 pide generar «carátula, recibo, certificado individual y listado de asegurados»; HU558 define «Sin recibo» cuando el movimiento no tiene prima.', 'HU294, HU558', 'No se genera recibo sin prima; sí carátula, certificado y listado.', 'Aclarar si se reimprime el próximo recibo pendiente.'),
  c('C-12', 'Prima cero', 'HU577 permite procesar sin factura ni recibo; el código actual lanza «No se permite facturar con prima en cero».', 'HU577, ReciboPagoServiceImpl:506 (HU728 Q-006)', 'La demo sigue la HU.', 'Alinear el código con la HU.'),
  c('C-13', 'Emisión en línea', 'El flujo end-to-end sugiere generar factura al emitir; HU764-767 (emisión en línea) no estaban disponibles y HU577 factura desde el módulo de Facturación.', 'Flujo end-to-end, HU577', 'La emisión no factura automáticamente.', 'Entregar HU764-767.'),
  c('C-14', 'Edad de ingreso: error o política', 'HU647 usa la edad del amparo básico para validar el cargue; HU207 lista «edad de ingreso inferior a la permitida» como política autorizable.', 'HU647, HU207', 'A-03: por encima del máximo se rechaza; por debajo del mínimo exige política.', 'Definir qué casos rechazan y cuáles se autorizan.'),
  c('C-15', '% siniestralidad: subtotal', 'HU207 dice que el subtotal es la suma de todos los porcentajes anteriores, incluidos IVA de comisión y de retorno (19 %), lo que sumaría puntos porcentuales sin sentido.', 'HU207', 'S-04: los IVA se aplican sobre la comisión y el retorno.', 'Entregar la fórmula actuarial.'),
  c('C-16', 'Duplicidad de la regla «facturación diferente a anual»', 'HU577 enuncia la regla de ingreso retroactivo como «diferente a anual» y «diferente a mensual» en el mismo párrafo y la ejemplifica con mensual.', 'HU577', 'Se implementó para cualquier periodicidad menor que anual.', 'Corregir el texto.'),
];

const g = (id, titulo, detalle, impacto, propuesta) => ({ id, titulo, detalle, impacto, propuesta });
export const BRECHAS = [
  g('G-01', 'Google Drive de documentación no accesible', 'La carpeta pide inicio de sesión: no se pudo leer. La demo se apoya en las 15 HU de AP y en los documentos del repositorio local.', 'Alto', 'Descargar la carpeta como ZIP al proyecto o compartirla con acceso de lector; luego repetir el inventario.'),
  g('G-02', 'Tabla «Edades por amparo y producto»', 'Referenciada en HU647 (Drive). La demo exige capturar las edades de cada amparo.', 'Alto', 'Cargar la tabla como parametrización por producto/amparo.'),
  g('G-03', 'Amparos básicos por producto y dependencias entre amparos', 'HU647 cita los Excel «Lista amparos AP CRM y GAIA V2» y «Amparos (sale.protection)». Hoy cualquier amparo activo es seleccionable y no hay dependencias.', 'Alto', 'Cargar el catálogo por producto y la tabla de dependencias.'),
  g('G-04', 'Umbrales y delegaciones de políticas para AP', 'El Excel «NewCore Políticas Controles AP EMI-NOV» no estaba disponible. En el código, prima mínima y utilidad son stubs y las comisiones solo existen para VG/Exequias.', 'Alto', 'Parametrizar umbrales por ramo en base de datos (hoy están en el código).'),
  g('G-05', 'Eventos por vigencia en Bicibles y Viajero', 'HU647 define 1, 2 e ilimitado solo para algunos productos.', 'Medio', 'Definir el límite por producto.'),
  g('G-06', 'Catálogo de sucursales e intermediarios por sucursal', 'El Excel de sucursales de HU558 no estaba disponible; los de la demo son de prueba.', 'Medio', 'Integrar el catálogo oficial.'),
  g('G-07', 'Fuente y vigencia del SMMLV', 'La HU exige parametrizarlo; el valor de la demo es de 2025.', 'Medio', 'Definir quién carga el valor anual.'),
  g('G-08', 'IVA aplicable a las primas de AP', 'HU577 dice «si corresponde»; el sistema actual factura IVA 0 % fuera de Salud (cadena de IVA rota, hallazgo D-4).', 'Alto', 'Definición tributaria y reparación de la cadena de IVA.'),
  g('G-09', 'Código de barras de Banco de Bogotá', 'HU091 documenta solo la estructura de Bancolombia.', 'Bajo', 'Entregar la especificación del convenio.'),
  g('G-10', 'HU187, HU189, HU191, HU192, HU193, HU487 no disponibles', 'Datos generales, intermediación, tomador, grupo asegurable, cargue de asegurados y formulario SARLAFT: se dedujeron campos mínimos.', 'Alto', 'Entregar las HU y reemplazar los supuestos.'),
  g('G-11', 'HU561 — anulación de movimiento', 'Acción del histórico sin especificación local. No implementada.', 'Medio', 'Entregar la HU.'),
  g('G-12', 'Periodicidad: cambio desde Semestral ya facturada', 'HU675 no define este caso; la demo lo permite.', 'Bajo', 'Completar la tabla de transiciones.'),
  g('G-13', 'Prórroga, renovación y rehabilitación en AP', 'No hay HU de AP disponibles (existen en otros ramos). No implementadas.', 'Alto', 'Entregar las HU de AP.'),
  g('G-14', 'Fórmula del ajuste de prima por modificación de gastos', 'HU300 exige ajuste de prima sin definir la fórmula.', 'Medio', 'Entregar la nota técnica de recálculo.'),
  g('G-15', 'Devolución de prima facturada después de un retiro', 'No hay regla para periodos ya facturados posteriores a la fecha de retiro.', 'Medio', 'Definir nota crédito por retiro.'),
  g('G-16', 'Facturación a nivel póliza (HU087) y emisión en línea (HU764-767)', 'No disponibles; la innominada usa una factura simple a nombre del tomador.', 'Medio', 'Entregar las HU.'),
  g('G-17', 'Roles y permisos oficiales (HU380 / HU531)', 'La matriz de la demo es simulada. Además, en el código existente solo el microservicio core evalúa @PreAuthorize (hallazgo de seguridad).', 'Alto', 'Entregar la matriz oficial y habilitar seguridad por método en todos los servicios.'),
  g('G-18', 'Diseño oficial de la carátula (HU559 / HU563)', 'La carátula de la demo es una representación funcional versionada.', 'Medio', 'Entregar el formato oficial.'),
  g('G-19', 'Siniestros: carencia, límites de eventos y restablecimiento', 'Las reglas de HU647 se capturan pero su efecto pertenece al módulo de Siniestros (fuera del alcance «hasta facturación»).', 'Medio', 'Implementar con el módulo de Siniestros.'),
  g('G-20', 'Procesos posteriores a la facturación', 'Recaudo avanzado (aplicación de pagos, conciliación), comisiones (liquidación), reservas, reaseguro y coaseguro están fuera de alcance. Solo se registra el pago simple para demostrar estados de recibo.', 'Medio', 'Ampliar el alcance de la demo en una segunda fase.'),
];

const s = (id, texto) => ({ id, texto });
export const SUPUESTOS = [
  s('S-01', 'La tasa comercial se expresa por mil («milaje»): prima = valor asegurado × tasa / 1000.'),
  s('S-02', 'La tasa es anual; con vigencia menor de 365 días la prima se proporciona por días/365.'),
  s('S-03', 'Los productos individuales son nominados, con un único plan y un asegurado.'),
  s('S-04', 'En el subtotal del estudio técnico los IVA se aplican sobre la comisión y el retorno.'),
  s('S-05', 'En pólizas nominadas el número de asegurados de cada plan es el de asegurados asignados.'),
  s('S-06', 'En pólizas innominadas se emite una factura por período a nombre del tomador con la prima total.'),
  s('A-03', 'La edad inferior a la mínima de ingreso se acepta en la solicitud y exige autorización de política; la superior a la máxima se rechaza.'),
  s('A-04', 'Un asegurado retirado a mitad de período se factura completo si estaba vigente al inicio del período.'),
  s('A-06', 'Límite técnico de 1.000.000.000.000 para primas y valores asegurados: solo evita desbordes numéricos; el negocio no documentó un tope.'),
  s('A-05', 'Los ajustes y notas crédito sobre períodos parciales se proporcionan por días sobre lo ya facturado.'),
];
export const DECISIONES = [
  s('D-01', 'La prima de cada período es la prima de vigencia × fracción de la periodicidad (meses del período / meses de la vigencia); el último período absorbe el redondeo.'),
  s('D-02', 'La prorrata de un período parcial usa la prima diaria del propio período, con días medidos [inicio, fin).'),
  s('D-03', 'El cambio de sucursal se bloquea si el intermediario no comercializa en la sucursal destino.'),
  s('D-04', 'El cambio de comisión aplica desde el inicio de un período de facturación, nunca retroactivo (configurable a «solo inicio de vigencia»).'),
  s('D-05', 'El ajuste de planes aplica a AP sobre pólizas vigentes.'),
  s('D-06', 'Estados del recibo: Pendiente, Parcial, Legalizado, En mora y Anulado (más Cruzado/Reembolso en notas crédito).'),
];
