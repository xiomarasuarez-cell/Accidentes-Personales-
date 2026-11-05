// Escenarios de FACTURACIÓN y RECIBOS (HU577, HU091, HU846).
import { E } from './emision.mjs';
const ok = 'Sin impacto';
const facts = (H, id, f = {}) => H.core.fact.listarFacturas({ polizaId: id, ...f });

export const facturacion = [
  E('ES-60', 'Facturación', 'Primer período sin novedades: una factura y un recibo por asegurado', ['HU577', 'HU091'], 'Exitoso', {
    descripcion: 'La facturación individual genera factura electrónica y recibo para cada asegurado; la prima del plan no se multiplica por el número de asegurados.', condiciones: 'Póliza nominada mensual con 5 asegurados y datos DIAN completos.', entrada: 'Facturar el período 1, modalidad sin novedades.',
    reglas: ['RN-FA-01', 'RN-FA-02', 'RN-FA-03', 'RN-FA-10', 'RN-FA-11', 'RN-FA-12'], flujo: ['Facturar período 1'], esperado: '5 facturas de 10.000 (120.000/12) con CUFE, comisión del 10 % por asegurado y recibos pendientes.', estadoFinal: 'Período 1 FACTURADO',
    impactoPoliza: 'Cronograma: período 1 facturado; el siguiente es 01/02/2026.', impactoFacturacion: 'Total facturado 50.000 = 600.000/12.', mensajes: '—' },
    H => { const p = H.emitirPoliza(); const r = H.facturar(p.id); H.igual('facturas', r.facturas.length, 5); const fs = facts(H, p.id); H.paso('cada factura vale 10.000 y no se multiplica por n', fs.every(f => f.valorNeto === 10000 && f.total === 10000)); H.paso('CUFE simulado de 96 caracteres', fs.every(f => f.cufe.length === 96));
      H.paso('comisión del 10 % por asegurado', fs.every(f => f.comisiones[0].pct === 10 && f.comisiones[0].valor === 1000)); const rc = H.core.fact.listarRecibos({ polizaId: p.id }); H.paso('5 recibos pendientes con plazo de 30 días', rc.length === 5 && rc.every(x => x.estado === 'PENDIENTE' && x.fechaLimite === '2026-01-31'));
      const d = H.poliza(p.id); H.igual('siguiente período', d.facturacionEstado.siguiente.inicio, '2026-02-01'); H.igual('total facturado', fs.reduce((s, f) => s + f.total, 0), 50000); H.paso('cada factura queda asociada al asegurado', fs.every(f => f.asegurado?.numDoc)); }),

  E('ES-61', 'Facturación', 'Pre-validación DIAN: faltan campos y no se factura nada', ['HU577'], 'Validación', {
    descripcion: 'Si a algún asegurado le faltan campos exigidos por la DIAN se bloquea toda la facturación y se listan los faltantes.', condiciones: 'Un asegurado sin correo y otro sin dirección.', entrada: 'Facturar período 1.', reglas: ['RN-FA-08'], flujo: ['Validar', 'Facturar (bloqueado)', 'Corregir', 'Facturar'],
    esperado: 'Rechazo que lista asegurado y campo; cero facturas; el período sigue pendiente.', estadoFinal: 'Período pendiente', impactoPoliza: ok, impactoFacturacion: 'Ninguna factura se genera.', mensajes: 'No se puede facturar: 2 validación(es) previa(s) fallaron. No se generó ninguna factura.' },
    H => { const a = [1, 2, 3, 4, 5].map(i => H.asegurado(i, i === 2 ? { correo: '' } : i === 4 ? { direccion: '' } : {})); const p = H.emitirPoliza({ asegurados: a }); const v = H.core.fact.validar(p.id, {}); H.paso('la pre-validación lista 2 faltantes', v.ok === false && v.errores.length === 2, v.errores);
      const e = H.espera('facturar con datos DIAN incompletos', () => H.facturar(p.id), { code: 'VALIDACION_FACTURACION' }); H.paso('el detalle nombra campo y asegurado', e.detalle.some(x => x.campo === 'correo' && x.asegurado === '2000000002') && e.detalle.some(x => x.campo === 'direccion' && x.asegurado === '2000000004'));
      H.igual('cero facturas', facts(H, p.id).length, 0); H.igual('período 1 sigue pendiente', H.poliza(p.id).facturacionEstado.siguiente.idx, 0); }),

  E('ES-62', 'Facturación', 'Prima cero: se registra el proceso sin factura ni recibo', ['HU577'], 'Alterno', {
    descripcion: 'Con valor de prima cero el sistema procesa el período sin generar factura electrónica ni recibo.', condiciones: 'Prima por asegurado de 0,01 (el período mensual redondea a 0,00).', entrada: 'Facturar período 1.', reglas: ['RN-FA-07'], flujo: ['Facturar período 1'], esperado: '0 facturas, 5 registros «sin factura», período facturado.', estadoFinal: 'Período 1 FACTURADO',
    impactoPoliza: 'El período queda cerrado.', impactoFacturacion: 'Sin factura ni recibo (el código actual lo bloquea con «No se permite facturar con prima en cero»).', mensajes: 'Prima cero: se registra el proceso sin factura electrónica ni recibo (HU577).' },
    H => { const p = H.emitirPoliza({ planes: [H.plan('AP_COLECTIVO', { prima: 0.01, amparos: [H.amparo('402', 'Básico', { primaComercial: undefined })] })] }, { autoriza: [['P04', 'u-suscriptor-inter']] }); const r = H.facturar(p.id); H.igual('facturas', r.facturas.length, 0); H.igual('registros sin factura', r.sinFactura.length, 5);
      H.igual('período cerrado', H.poliza(p.id).facturacionEstado.cronograma[0].estado, 'FACTURADO'); H.igual('recibos', H.core.fact.listarRecibos({ polizaId: p.id }).length, 0); }),

  E('ES-63', 'Facturación', 'Facturar toda la vigencia y no refacturar', ['HU577'], 'Alterno', {
    descripcion: 'Los 12 períodos se facturan en orden cronológico; después no queda nada por facturar.', condiciones: 'Póliza mensual.', entrada: '12 facturaciones y una más.', reglas: ['RN-FA-03', 'RN-FA-09'], flujo: ['Facturar ×12', 'Facturar una vez más'], esperado: 'Total facturado por asegurado = prima de vigencia; la 13.ª se rechaza.', estadoFinal: 'Vigencia 100 % facturada',
    impactoPoliza: ok, impactoFacturacion: '60 facturas; 600.000 en total.', mensajes: 'La vigencia ya está facturada por completo.' },
    H => { const p = H.emitirPoliza(); for (let i = 0; i < 12; i++) H.facturar(p.id); H.igual('facturas emitidas', facts(H, p.id).length, 60); H.igual('total facturado = prima de vigencia', facts(H, p.id).reduce((s, f) => s + f.total, 0), 600000); H.espera('facturar de nuevo', () => H.facturar(p.id), { code: 'SIN_ITEMS' });
      H.igual('pendientes', H.core.dashboard().porFacturar, 0); }),

  E('ES-64', 'Facturación', 'Facturación pendiente identificada', ['HU577'], 'Consulta', {
    descripcion: 'El sistema indica qué pólizas tienen período por facturar y cuál es el siguiente.', condiciones: 'Póliza recién emitida.', entrada: 'Consultar estado de facturación.', reglas: ['RN-FA-06'], flujo: ['Consultar'], esperado: 'Siguiente período 01/01→01/02; contador del panel = 1.', estadoFinal: '—', impactoPoliza: ok, impactoFacturacion: ok, mensajes: '—' },
    H => { const p = H.emitirPoliza(); const e = H.core.fact.estado(p.id); H.igual('siguiente período', [e.siguiente.inicio, e.siguiente.fin], ['2026-01-01', '2026-02-01']); H.igual('pólizas por facturar en el panel', H.core.dashboard().porFacturar, 1); H.paso('modalidades de la nominada', e.modos.length === 3); }),

  E('ES-65', 'Facturación', 'Ingreso a mitad de período: prorrata con novedades', ['HU577'], 'Alterno', {
    descripcion: 'El asegurado que ingresa el 10/02 se factura a prorrata en la modalidad «con novedades».', condiciones: 'Inclusión de un asegurado con ingreso 10/02/2026; período 1 facturado.', entrada: 'Facturar período 2 con novedades.', reglas: ['RN-FA-04', 'RN-FA-06'], flujo: ['Incluir asegurado', 'Facturar período 1', 'Facturar período 2 con novedades'],
    esperado: 'Factura de novedad de 19/28 × 10.000 = 6.785,71; las demás de 10.000.', estadoFinal: 'Novedad facturada', impactoPoliza: ok, impactoFacturacion: 'Prorrata sobre la prima diaria del período.', mensajes: '—' },
    H => { const p = H.emitirPoliza(); H.clock('2026-02-10'); H.novedad(p.id, 'inclusion', { asegurados: [H.asegurado(6, { planId: p.planes[0].id, fechaIngreso: '2026-02-10' })] }); H.facturar(p.id);
      const r = H.facturar(p.id, 'CON_NOVEDADES'); H.igual('facturas del período 2', r.facturas.length, 6); const f6 = facts(H, p.id).find(f => f.asegurado?.numDoc === '2000000006'); H.igual('prorrata 19/28', f6.valorNeto, 6785.71); H.igual('origen de la factura', f6.origen, 'NOVEDAD');
      H.igual('novedad ya no pendiente', H.poliza(p.id).asegurados.find(a => a.numDoc === '2000000006').novedadPendiente, false); }),

  E('ES-66', 'Facturación', 'Ingreso retroactivo: dos facturas del mismo asegurado (solo novedades)', ['HU577'], 'Alterno', {
    descripcion: 'Con facturación mensual y un ingreso retroactivo se generan facturas por cada período pendiente del mismo asegurado.', condiciones: 'Períodos 1 y 2 facturados; ingreso real 20/02/2026 registrado el 10/03/2026.', entrada: 'Facturar «solo novedades».', reglas: ['RN-FA-05', 'RN-FA-06', 'RN-FA-09'],
    flujo: ['Facturar 2 períodos', 'Incluir asegurado retroactivo', 'Facturar solo novedades', 'Facturar período 3'], esperado: '2 facturas del asegurado nuevo (3.214,29 y 10.000); el período 3 sigue pendiente; luego el período 3 no lo duplica.', estadoFinal: 'Sin duplicidad',
    impactoPoliza: ok, impactoFacturacion: 'Facturas retroactivas por período.', mensajes: '—' },
    H => { const p = H.emitirPoliza(); H.facturar(p.id); H.facturar(p.id); H.clock('2026-03-10'); H.novedad(p.id, 'inclusion', { asegurados: [H.asegurado(6, { planId: p.planes[0].id, fechaIngreso: '2026-02-20' })] });
      const r = H.facturar(p.id, 'SOLO_NOVEDADES'); H.igual('facturas del asegurado nuevo', r.facturas.length, 2); const f6 = facts(H, p.id).filter(f => f.asegurado?.numDoc === '2000000006').sort((a, b) => a.periodo.inicio.localeCompare(b.periodo.inicio)); H.igual('valores', f6.map(f => f.valorNeto), [3214.29, 10000]);
      H.igual('el período 3 sigue pendiente', H.poliza(p.id).facturacionEstado.siguiente.idx, 2); const r3 = H.facturar(p.id); H.igual('período 3 sin duplicar al asegurado 6', r3.facturas.length, 5); H.igual('total de facturas del asegurado 6', facts(H, p.id).filter(f => f.asegurado?.numDoc === '2000000006').length, 2); }),

  E('ES-67', 'Facturación', 'Error de la facturación electrónica: la operación es atómica', ['HU577'], 'Error', {
    descripcion: 'Si la DIAN/OPEN no responde no se genera ninguna factura y el período sigue pendiente.', condiciones: 'Servicio DIAN_OPEN en modo «falla» (simulado).', entrada: 'Facturar período 1.', reglas: ['RN-FA-16'], flujo: ['Apagar servicio', 'Facturar', 'Reactivar', 'Facturar'], esperado: 'Error claro; cero facturas; al restablecer factura bien.',
    estadoFinal: 'Período 1 FACTURADO (tras reintento)', impactoPoliza: ok, impactoFacturacion: 'Ninguna factura parcial.', mensajes: 'Facturación electrónica (OPEN / DIAN) no disponible (simulado).' },
    H => { const p = H.emitirPoliza(); H.core.ctx.sim.setModo('DIAN_OPEN', 'falla'); H.espera('facturar con la DIAN caída', () => H.facturar(p.id), { code: 'INTEGRACION_NO_DISPONIBLE' }); H.igual('cero facturas', facts(H, p.id).length, 0); H.igual('período pendiente', H.poliza(p.id).facturacionEstado.siguiente.idx, 0);
      H.core.ctx.sim.setModo('DIAN_OPEN', 'ok'); H.igual('al restablecer', H.facturar(p.id).facturas.length, 5); const log = H.core.ctx.sim.bitacora().filter(x => x.servicio === 'DIAN_OPEN' && !x.exitoso); H.paso('la bitácora registra el fallo', log.length >= 1); }),

  E('ES-68', 'Facturación', 'SAP caído: la factura se emite y el asiento queda pendiente de reintento', ['HU577'], 'Error', {
    descripcion: 'SAP no es bloqueante (tiene reintento programado en el sistema real).', condiciones: 'SAP en modo «falla» (simulado).', entrada: 'Facturar período 1.', reglas: ['RN-FA-16'], flujo: ['Apagar SAP', 'Facturar'], esperado: 'Facturas emitidas con asiento pendiente.', estadoFinal: 'Período 1 FACTURADO',
    impactoPoliza: ok, impactoFacturacion: 'Contabilización pendiente.', mensajes: '—' },
    H => { const p = H.emitirPoliza(); H.core.ctx.sim.setModo('SAP', 'falla'); const r = H.facturar(p.id); H.igual('facturas', r.facturas.length, 5); H.paso('asientos pendientes de reintento', facts(H, p.id).every(f => f.sap.pendiente === true)); }),

  E('ES-69', 'Facturación', 'Póliza innominada: factura única a nombre del tomador', ['HU577'], 'Alterno', {
    descripcion: 'Sin asegurados individualizados se factura a nivel póliza (supuesto S-06).', condiciones: 'Innominada con 40 asegurados.', entrada: 'Facturar período 1; intentar «con novedades».', reglas: ['RN-FA-15'], flujo: ['Facturar', 'Intentar con novedades'], esperado: 'Una factura de 400.000; las novedades no aplican.', estadoFinal: 'Período 1 FACTURADO',
    impactoPoliza: ok, impactoFacturacion: 'Factura única a nombre del tomador.', mensajes: 'En pólizas innominadas no hay facturación por asegurado ni por novedades.' },
    H => { const p = H.emitirPoliza({ estructura: 'Innominada', n: 40 }); const r = H.facturar(p.id); H.igual('facturas', r.facturas.length, 1); H.igual('total', facts(H, p.id)[0].total, 400000); H.igual('receptor', facts(H, p.id)[0].destinatario.numDoc, '1010101010'); H.espera('modalidad con novedades', () => H.facturar(p.id, 'CON_NOVEDADES'), { contiene: 'innominadas' }); }),

  E('ES-70', 'Facturación', 'Recibo: estados Pendiente → Parcial → Legalizado y En mora', ['HU091', 'HU577'], 'Alterno', {
    descripcion: 'El estado del recibo evoluciona con los pagos y con la fecha.', condiciones: 'Póliza individual (un recibo).', entrada: 'Pagos de 4.000 y 6.000; reloj al 15/02.', reglas: ['RN-FA-13', 'RN-FA-14'], flujo: ['Pagar parcial', 'Pagar de más (rechazo)', 'Completar', 'Mora'],
    esperado: 'PENDIENTE → PARCIAL → LEGALIZADO; EN_MORA pasado el plazo; «sin recibos pendientes» al final.', estadoFinal: 'Recibos legalizados', impactoPoliza: ok, impactoFacturacion: 'Cartera por asegurado.', mensajes: 'Esta póliza no tiene recibos de pago pendientes' },
    H => { const p = H.emitirPoliza({ producto: 'AP_INDIVIDUAL', n: 1 }); H.facturar(p.id); const rc = H.core.fact.listarRecibos({ polizaId: p.id })[0]; H.igual('estado inicial', rc.estado, 'PENDIENTE'); H.igual('tras pagar 4.000', H.pagar(rc.id, 4000).estado, 'PARCIAL'); H.espera('pagar más que el saldo', () => H.pagar(rc.id, 7000), { code: 'VALIDACION' });
      H.clock('2026-02-15'); H.igual('vencido el plazo', H.core.fact.listarRecibos({ polizaId: p.id })[0].estado, 'EN_MORA'); H.igual('al completar el pago', H.pagar(rc.id, 6000).estado, 'LEGALIZADO'); H.espera('pagar un recibo legalizado', () => H.pagar(rc.id, 1), { code: 'ESTADO_INVALIDO' });
      H.espera('sin recibos pendientes', () => H.core.fact.reciboPendientePoliza(H.U('u-novedades'), p.id), { code: 'SIN_RECIBOS' }); H.espera('usuario sin permiso de pago', () => H.pagar(rc.id, 1, 'u-tercero'), { code: 'SIN_PERMISO' }); }),

  E('ES-71', 'Facturación', 'Contenido del recibo de pago (HU091)', ['HU091'], 'Consulta', {
    descripcion: 'El recibo trae referencia, tomador, póliza, vigencia, periodicidad, medios de pago y código de barras.', condiciones: 'Acuerdo de pago de 45 días.', entrada: 'Consultar recibo.', reglas: ['RN-FA-12', 'RN-FA-11'], flujo: ['Facturar', 'Consultar recibo'], esperado: 'Pague antes de = emisión + 45 días; código Bancolombia con la estructura documentada; auditoría de la consulta.',
    estadoFinal: '—', impactoPoliza: ok, impactoFacturacion: ok, mensajes: '—' },
    H => { const p = H.emitirPoliza({ generales: { plazoPagoDias: 45 } }); H.facturar(p.id); const rc0 = H.core.fact.listarRecibos({ polizaId: p.id })[0]; const rc = H.core.fact.obtenerRecibo(H.U('u-novedades'), rc0.id);
      H.igual('pague antes de', rc.fechaLimite, '2026-02-15'); H.paso('código Bancolombia con la estructura de HU091', /^8888J4157700000000000R\d{14}V\d{10}F20260215$/.test(rc.codigoBarras.bancolombia), rc.codigoBarras.bancolombia); H.paso('4 medios de pago', rc.medioPago.length === 4);
      H.paso('datos del recibo', rc.polizaNumero === p.numero && rc.vigenciaDesde === '2026-01-01' && rc.periodicidad === 'Mensual' && rc.sucursal === 'Bogotá' && rc.tomador.numDoc === '1010101010'); H.paso('auditoría de la consulta', H.core.store.col('auditoria').all().some(a => a.accion === 'CONSULTAR_RECIBO' && a.entidadId === rc.id)); }),

  E('ES-72', 'Facturación', 'Delegación del intermediario y permisos para facturar', ['HU577'], 'Seguridad', {
    descripcion: 'El intermediario factura solo sus pólizas; el usuario tercero no factura.', condiciones: 'Pólizas de INT-1001 e INT-1002.', entrada: 'Facturar con el usuario intermediario INT-1001.', reglas: ['RN-FA-18', 'RN-AD-22'], flujo: ['Facturar póliza propia', 'Facturar ajena', 'Tercero factura'],
    esperado: 'Permite la propia; rechaza la ajena y al tercero.', estadoFinal: '—', impactoPoliza: ok, impactoFacturacion: ok, mensajes: 'El intermediario no tiene delegación sobre esta póliza (HU577).' },
    H => { const propia = H.emitirPoliza(), ajena = H.emitirPoliza({ clave: 'INT-1002', sucursal: 'Barranquilla' }); H.igual('factura la propia', H.facturar(propia.id, 'SIN_NOVEDADES', 'u-intermediario').facturas.length, 5); H.espera('factura una póliza ajena', () => H.facturar(ajena.id, 'SIN_NOVEDADES', 'u-intermediario'), { code: 'SIN_PERMISO' }); H.espera('usuario tercero factura', () => H.facturar(propia.id, 'SIN_NOVEDADES', 'u-tercero'), { code: 'SIN_PERMISO' }); }),

  E('ES-73', 'Facturación', 'Historial de facturación por asegurado', ['HU846'], 'Consulta', {
    descripcion: 'Consulta de todas las facturas de un asegurado.', condiciones: 'Tres períodos facturados.', entrada: 'Historial del asegurado 2000000003.', reglas: ['RN-FA-17'], flujo: ['Facturar ×3', 'Consultar historial'], esperado: '3 facturas consecutivas.', estadoFinal: '—', impactoPoliza: ok, impactoFacturacion: ok, mensajes: '—' },
    H => { const p = H.emitirPoliza(); for (let i = 0; i < 3; i++) H.facturar(p.id); const a = H.poliza(p.id).asegurados.find(x => x.numDoc === '2000000003'); const h = facts(H, p.id, { aseguradoId: a.id }).sort((x, y) => x.periodo.inicio.localeCompare(y.periodo.inicio));
      H.igual('facturas del asegurado', h.length, 3); H.igual('períodos consecutivos', h.map(f => f.periodo.inicio), ['2026-01-01', '2026-02-01', '2026-03-01']); }),

  E('ES-74', 'Facturación', 'IVA parametrizado', ['HU577'], 'Alterno', {
    descripcion: 'La HU dice «IVA si corresponde»; el IVA es un parámetro (por defecto 0 %, como el sistema actual fuera de Salud).', condiciones: 'IVA = 19 % en Configuración.', entrada: 'Facturar período 1.', reglas: ['RN-FA-02'], flujo: ['Configurar IVA', 'Facturar'], esperado: 'Neto 10.000, IVA 1.900, total 11.900.', estadoFinal: '—', impactoPoliza: ok,
    impactoFacturacion: 'El IVA se discrimina en la factura y en el recibo.', mensajes: '—' },
    H => { H.params({ ivaPorProducto: 19 }); const p = H.emitirPoliza(); H.facturar(p.id); const f = facts(H, p.id)[0]; H.igual('neto/IVA/total', [f.valorNeto, f.iva, f.total], [10000, 1900, 11900]); }),

  E('ES-75', 'Facturación', 'Pago por Wompi (simulado) y trazabilidad de integraciones', ['HU091'], 'Alterno', {
    descripcion: 'El pago por pasarela deja registro en la bitácora de integraciones.', condiciones: 'Wompi simulado.', entrada: 'Pagar un recibo por «Pagos en línea (Wompi)».', reglas: ['RN-FA-16'], flujo: ['Facturar', 'Pagar por Wompi'], esperado: 'Recibo legalizado y fila WOMPI en la bitácora.', estadoFinal: 'Recibo LEGALIZADO', impactoPoliza: ok, impactoFacturacion: ok, mensajes: '—' },
    H => { const p = H.emitirPoliza({ producto: 'AP_INDIVIDUAL', n: 1 }); H.facturar(p.id); const rc = H.core.fact.listarRecibos({ polizaId: p.id })[0]; H.igual('legalizado', H.pagar(rc.id, 10000, 'u-novedades', 'Pagos en línea (Wompi)').estado, 'LEGALIZADO'); const b = H.core.ctx.sim.bitacora().filter(x => x.servicio === 'WOMPI'); H.paso('bitácora Wompi', b.length === 1 && b[0].simulado === true); }),
];
