// Administración de la póliza: movimientos, carátulas versionadas y novedades (HU077, 294, 296, 300, 309, 387, 404, 558, 675 + inclusión/retiro HU577).
import { fail, clone, has, num, money, isYmd, addDays, diffDays, edadA } from './util.mjs';
import { INTERMEDIARIOS, SUCURSALES, MOTIVOS_ANULACION, TIPOS_ANULACION, PERIODICIDADES, PARENTESCOS, TIPOS_DOC, TIPOS_BENEFICIARIO, rankNivel, USUARIOS, RAMO_AP_ID } from './catalog.mjs';
import * as R from './rules.mjs';

export function createPolizas(ctx, fact) {
  const { store, hoy, params, audit, notify, perm, sim, id: nextId } = ctx;
  const polizas = () => store.col('polizas'), autz = () => store.col('autorizaciones');
  const cargar = id => { const p = polizas().get(id); if (!p) fail('Póliza inexistente.', { status: 404, code: 'NO_ENCONTRADO' }); return p; };
  const exigirVigente = p => { if (p.estado !== 'VIGENTE') fail(`La póliza está ${p.estado}: no admite novedades.`, { code: 'ESTADO_INVALIDO' }); };
  const prod = p => R.producto(p.productoId);

  /* ── carátula versionada: la anterior se conserva como soporte en el histórico ── */
  function construirCaratula(p, version, mov) {
    const pc = fact.planesCalc(p);
    return { version, movimiento: mov?.numero ?? 1, tipoMovimiento: mov?.tipo ?? 'Emisión', fecha: hoy(), poliza: p.numero, producto: prod(p).nombre, ramo: 'Accidentes Personales', estado: p.estado,
      vigencia: { desde: p.vigenciaDesde, hasta: p.vigenciaHasta }, sucursal: p.generales.sucursal, periodicidad: p.facturacion.periodicidad, tomador: clone(p.tomador), intermediarios: clone(p.intermediarios),
      coaseguro: clone(p.coaseguro), licitacion: clone(p.licitacion), estructura: p.generales.estructura, nAsegurados: p.generales.estructura === 'Nominada' ? p.asegurados.filter(a => a.estado === 'VIGENTE').length : null,
      planes: p.planes.map(pl => { const c = pc.find(x => x.id === pl.id); return { nombre: pl.nombre, nAsegurados: c.nAsegurados, primaPorAsegurado: c.primaPorAsegurado, primaTotalPlan: c.primaTotalPlan,
        amparos: c.amparos.map(a => ({ cod: a.cod, nombre: R.amparoCat(a.cod)?.nombre, tipo: a.tipoAmparo,
          valorAsegurado: a.tipoAmparo === 'Asistencia' ? 'Asistencia Incluida' : a._calc.valorAsegurado,                         // HU647
          tipoValorAsegurado: a.tipoValorAsegurado, salariosCubiertos: a.tipoValorAsegurado !== 'SUMA_INFORMADA' ? a.factorMultiplicador : null, prima: a._calc.prima, proveedor: a.proveedor || null })) }; }),
      primaTotal: fact.primaVigPoliza(p), anulacion: clone(p.anulacion) };
  }
  function registrarMovimiento(p, user, { tipo, fechaInicio = hoy(), fechaFin = null, detalle, afectaCaratula = false, impactoPrima = false }) {
    const mov = { numero: ++p.movSeq, tipo, fechaInicio, fechaFin: fechaFin || p.vigenciaHasta, fechaEmision: hoy(), usuario: user.nombre, detalle, impactoPrima, afectaCaratula };
    if (afectaCaratula || !p.caratulas.length) { p.caratulaVersion = p.caratulas.length + 1; p.caratulas.push(construirCaratula(p, p.caratulaVersion, mov)); }
    mov.caratulaVersion = p.caratulaVersion; p.movimientos.push(mov); return mov;
  }

  /* ── emisión de la póliza ── */
  function crearDesdeSolicitud(user, s) {
    const numero = String(1000000 + store.seq('poliza')); const nominada = s.generales.estructura === 'Nominada';
    const inters = (s.intermediacion.intermediarios || []);
    const p = { id: numero, numero, solicitudId: s.id, ramo: 'Accidentes Personales', ramoId: RAMO_AP_ID, productoId: s.producto.productoId, estado: 'VIGENTE', fechaEmision: hoy(), emitidaPor: user.nombre,
      vigenciaDesde: s.generales.vigenciaDesde, vigenciaHasta: s.generales.vigenciaHasta, anulacion: null,
      tomador: clone(s.tomador), generales: { tipoSolicitud: s.generales.tipoSolicitud, estructura: s.generales.estructura, sucursal: s.generales.sucursal, intermediada: s.generales.intermediada, afiliadoARL: s.generales.afiliadoARL, requiereRetorno: s.generales.requiereRetorno, plazoPagoDias: s.generales.plazoPagoDias || null },
      sucursalHistorial: [{ desde: s.generales.vigenciaDesde, sucursal: s.generales.sucursal }],
      intermediarios: inters.map(i => ({ clave: i.clave, nombre: INTERMEDIARIOS.find(x => x.clave === i.clave)?.nombre })),
      comisionHistorial: [{ desde: s.generales.vigenciaDesde, intermediarios: inters.map(i => ({ clave: i.clave, pct: num(i.comision) })), total: inters.reduce((t, i) => t + num(i.comision), 0) }],
      coaseguro: clone(s.coaseguro), licitacion: clone(s.licitacion), datosProducto: clone(s.producto), planes: clone(s.planes), costos: clone(s.costos), sarlaft: clone(s.sarlaft), politicas: clone(s.politicas), siniestralidad: clone(s.siniestralidad),
      asegurados: nominada ? s.asegurados.map(a => ({ ...clone(a), estado: 'VIGENTE', fechaIngreso: s.generales.vigenciaDesde, novedadPendiente: false, beneficiarios: [], periodosFacturados: [], movIngreso: 1 })) : [],
      facturacion: { periodicidad: s.generales.periodicidad, cronograma: R.generarPeriodos(s.generales.vigenciaDesde, s.generales.vigenciaHasta, s.generales.periodicidad) },
      movSeq: 0, movimientos: [], caratulaVersion: 0, caratulas: [], siniestrosEnCurso: 0 };
    registrarMovimiento(p, user, { tipo: 'Emisión', fechaInicio: p.vigenciaDesde, detalle: { solicitud: s.id, producto: prod(p).nombre, prima: fact.primaVigPoliza(p) }, afectaCaratula: true, impactoPrima: true });
    const rad = sim.sgdea({ tipo: 'CARATULA', poliza: numero, version: 1 }, user); p.radicadoCaratula = rad;
    sim.crm({ poliza: numero, estado: 'VIGENTE' }, user);
    polizas().put(p); audit(user, 'POLIZA_EMITIDA', 'poliza', p.id, `Póliza ${numero} emitida desde ${s.id}`, null, { prima: fact.primaVigPoliza(p) });
    notify(user.id, `Póliza ${numero} emitida con éxito.`, p.id);
    return p;
  }

  /* ── consultas ── */
  function estadoReciboMov(p, m, recibos) {
    const rs = recibos.filter(r => r.polizaId === p.id && r.movimientoNumero === m.numero);
    if (!rs.length) return m.impactoPrima ? 'Pendiente de facturar' : 'Sin recibo';
    const est = rs.map(r => r.estado); if (est.every(e => e === 'LEGALIZADO')) return 'Cobrado'; if (est.some(e => e === 'EN_MORA')) return 'En mora'; if (est.some(e => e === 'PARCIAL')) return 'Parcial'; return 'Pendiente';
  }
  function detalle(id) {
    const p = cargar(id); const facturas = fact.listarFacturas({ polizaId: id }); const recibos = fact.listarRecibos({ polizaId: id }).map(r => ({ ...r, movimientoNumero: facturas.find(f => f.id === r.facturaId)?.movimientoNumero ?? null }));
    const pc = fact.planesCalc(p);
    return { ...p, planesCalc: pc, primaVigencia: fact.primaVigPoliza(p), producto: prod(p), facturas, recibos, notasCredito: facturas.filter(f => f.tipo === 'NOTA_CREDITO'),
      movimientos: p.movimientos.map(m => ({ ...m, estadoRecibo: estadoReciboMov(p, m, recibos) })).reverse(), autorizaciones: autz().all().filter(a => a.polizaId === id).sort((a, b) => b.id.localeCompare(a.id)), facturacionEstado: fact.estado(id) };
  }
  function listar({ estado, q } = {}) {
    return polizas().all().filter(p => (!estado || p.estado === estado) && (!q || [p.numero, p.tomador.numDoc, p.tomador.razonSocial, p.tomador.primerApellido].some(v => String(v || '').toLowerCase().includes(String(q).toLowerCase())))).sort((a, b) => b.numero.localeCompare(a.numero))
      .map(p => ({ id: p.id, numero: p.numero, estado: p.estado, producto: prod(p).nombre, tomador: p.tomador.tipoPersona === 'Natural' ? [p.tomador.primerNombre, p.tomador.primerApellido].join(' ') : p.tomador.razonSocial, vigenciaDesde: p.vigenciaDesde, vigenciaHasta: p.vigenciaHasta,
        sucursal: p.generales.sucursal, periodicidad: p.facturacion.periodicidad, prima: fact.primaVigPoliza(p), estructura: p.generales.estructura, intermediada: p.generales.intermediada, movimientos: p.movimientos.length }));
  }
  function historico(filtros = {}) {
    const out = []; const recibos = fact.listarRecibos().map(r => ({ ...r, movimientoNumero: fact.listarFacturas().find(f => f.id === r.facturaId)?.movimientoNumero ?? null }));
    for (const p of polizas().all()) {
      if (filtros.numero && !p.numero.includes(filtros.numero)) continue; if (filtros.tomador && !JSON.stringify(p.tomador).toLowerCase().includes(filtros.tomador.toLowerCase())) continue;
      if (filtros.producto && p.productoId !== filtros.producto) continue; if (filtros.sucursal && p.generales.sucursal !== filtros.sucursal) continue;
      if (filtros.intermediario && !p.intermediarios.some(i => i.clave === filtros.intermediario)) continue;
      for (const m of p.movimientos) out.push({ polizaId: p.id, numeroPoliza: p.numero, numeroMovimiento: m.numero, tipoMovimiento: m.tipo, fechaInicial: m.fechaInicio, fechaFinal: m.fechaFin, fechaEmision: m.fechaEmision, usuario: m.usuario,
        estadoRecibo: estadoReciboMov(p, m, recibos), tomador: p.tomador.tipoPersona === 'Natural' ? [p.tomador.primerNombre, p.tomador.primerApellido].join(' ') : p.tomador.razonSocial, ramo: 'Accidentes Personales', producto: prod(p).nombre, sucursal: p.generales.sucursal, detalle: m.detalle, caratulaVersion: m.caratulaVersion });
    }
    return out.sort((a, b) => a.numeroPoliza === b.numeroPoliza ? b.numeroMovimiento - a.numeroMovimiento : b.numeroPoliza.localeCompare(a.numeroPoliza));   // HU558: del último al primer movimiento
  }
  function documento(user, polizaId, tipo, ref) {
    const p = cargar(polizaId);
    if (tipo === 'caratula') { const v = Number(ref) || p.caratulaVersion; const c = p.caratulas.find(x => x.version === v); if (!c) fail('Versión de carátula inexistente.', { status: 404 }); return { tipo, ...c, versionesDisponibles: p.caratulas.map(x => ({ version: x.version, movimiento: x.movimiento, tipoMovimiento: x.tipoMovimiento, fecha: x.fecha })) }; }
    if (tipo === 'listado') {   // HU446: listado de asegurados a nivel de movimiento (PDF/Excel en la interfaz)
      const refN = ref === undefined || ref === '' ? null : ref;
      const totalDias = diffDays(p.vigenciaDesde, p.vigenciaHasta);
      const primaIng = a => money(fact.primaVigAsegurado(p, a.planId) * diffDays(a.fechaIngreso, p.vigenciaHasta) / totalDias);
      const primaRet = a => -money(fact.primaVigAsegurado(p, a.planId) * diffDays(a.fechaRetiro, p.vigenciaHasta) / totalDias);
      const cert = a => p.asegurados.indexOf(a) + 1;           // el nº de certificado sigue el orden de creación en la póliza
      const fila = (a, tipoNov, fecha, valor) => ({ certificado: cert(a), tipoDoc: a.tipoDoc, numDoc: a.numDoc, nombre: fact.receptorAsegurado(a).nombre, plan: p.planes.find(x => x.id === a.planId)?.nombre, tipoNovedad: tipoNov, fechaNovedad: fecha, valorPrima: valor });
      let titulo = 'Asegurados vigentes', filas = [];
      const mov = refN && /^\d+$/.test(String(refN)) ? p.movimientos.find(m => m.numero === Number(refN)) : null;
      if (refN === 'retirados') { titulo = 'Asegurados retirados'; filas = p.asegurados.filter(a => a.estado === 'RETIRADO').map(a => fila(a, 'Retiro', a.fechaRetiro, primaRet(a))); }
      else if (mov) {
        titulo = `${mov.numero === 1 ? 'Emisión póliza' : 'Novedades'} · ${mov.tipo}`;
        filas = [...p.asegurados.filter(a => a.movIngreso === mov.numero).map(a => fila(a, 'Ingreso', a.fechaIngreso, primaIng(a))), ...p.asegurados.filter(a => a.movRetiro === mov.numero).map(a => fila(a, 'Retiro', a.fechaRetiro, primaRet(a)))];
        if (!filas.length) filas = p.asegurados.filter(a => a.estado === 'VIGENTE').map(a => fila(a, '—', null, 0));
      } else filas = p.asegurados.filter(a => a.estado === 'VIGENTE').map(a => fila(a, '—', null, 0));
      const ing = filas.filter(f => f.tipoNovedad === 'Ingreso'), ret = filas.filter(f => f.tipoNovedad === 'Retiro');
      return { tipo, encabezado: { ramo: 'Accidentes Personales', producto: prod(p).nombre, sucursal: p.generales.sucursal, tomador: fact.receptorTomador(p.tomador).nombre, poliza: p.numero, tipoMovimiento: titulo, vigenciaDesde: p.vigenciaDesde, vigenciaHasta: p.vigenciaHasta }, asegurados: filas,
        totales: { aseguradosIngresados: ing.length, primaPorIngresos: money(ing.reduce((s, f) => s + f.valorPrima, 0)), aseguradosRetirados: ret.length, primaPorRetiros: money(ret.reduce((s, f) => s + f.valorPrima, 0)), totalFacturado: money(filas.reduce((s, f) => s + f.valorPrima, 0)), cantidadTotalAsegurados: p.asegurados.filter(a => a.estado === 'VIGENTE').length },
        opcionesMovimiento: ['Asegurados vigentes', 'Asegurados retirados', ...p.movimientos.map(m => `${m.numero} · ${m.tipo}`)], fecha: hoy() };
    }
    if (tipo === 'certificado') {
      const a = p.asegurados.find(x => x.id === ref); if (!a) fail('Asegurado inexistente.', { status: 404 }); const pl = fact.planesCalc(p).find(x => x.id === a.planId);
      return { tipo, poliza: p.numero, sucursal: p.generales.sucursal, asegurado: fact.receptorAsegurado(a), vigencia: { desde: a.fechaIngreso, hasta: p.vigenciaHasta }, plan: pl?.nombre, amparos: pl?.amparos.map(x => ({ nombre: R.amparoCat(x.cod)?.nombre, tipo: x.tipoAmparo, valorAsegurado: x.tipoAmparo === 'Asistencia' ? 'Asistencia Incluida' : x._calc.valorAsegurado })), beneficiarios: a.beneficiarios };
    }
    fail('Tipo de documento inválido (caratula, listado, certificado).');
  }

  /* ── autorizaciones (novedades que requieren nivel superior) ── */
  function crearAutorizacion(user, p, tipo, nivel, payload, motivo, autorizadorId = null) {
    const a = { id: nextId('AUT'), tipo, polizaId: p.id, polizaNumero: p.numero, nivelRequerido: nivel, estado: 'PENDIENTE', payload: clone(payload), motivo, solicitadoPor: user.nombre, solicitadoPorId: user.id, autorizadorId, fecha: hoy() };
    autz().put(a); notify({ nivelMin: nivel }, `Autorización pendiente (${tipo}) para la póliza ${p.numero}: ${motivo}`, a.id); audit(user, 'SOLICITAR_AUTORIZACION', 'poliza', p.id, `${tipo}: ${motivo}`);
    return a;
  }

  /* ── NOVEDADES ── */
  const N = {};   // aplicadores: (p, payload, user, ctx) => { mov, extra }

  N.anular = (p, d, user) => {
    const errs = [];
    if (!TIPOS_ANULACION.includes(d.tipoAnulacion)) errs.push({ campo: 'tipoAnulacion', mensaje: 'El tipo de anulación es obligatorio.' });
    if (d.tipoAnulacion === 'Decisión de la aseguradora' && !MOTIVOS_ANULACION.includes(d.motivo)) errs.push({ campo: 'motivo', mensaje: 'Con decisión de la aseguradora el motivo de anulación es obligatorio.' });
    if (!isYmd(d.fechaAnulacion)) errs.push({ campo: 'fechaAnulacion', mensaje: 'La fecha de anulación es obligatoria.' });
    else if (d.fechaAnulacion < p.vigenciaDesde || d.fechaAnulacion > p.vigenciaHasta) errs.push({ campo: 'fechaAnulacion', mensaje: 'La fecha de anulación debe estar dentro de la vigencia de la póliza (puede ser retroactiva o futura).' });
    if (!has(d.razon)) errs.push({ campo: 'razon', mensaje: 'La razón de anulación es obligatoria.' });
    if (errs.length) fail('Corrija los datos de la anulación.', { code: 'VALIDACION', detalle: errs });
    const antes = { estado: p.estado };
    p.estado = 'ANULADA'; p.anulacion = { tipo: d.tipoAnulacion, motivo: d.motivo || null, fecha: d.fechaAnulacion, razon: d.razon, usuario: user.nombre, fechaRegistro: hoy() };
    p.facturacion.cronograma = p.facturacion.cronograma.map(c => c.estado === 'PENDIENTE' && c.inicio >= d.fechaAnulacion ? { ...c, estado: 'ANULADO' } : c);
    const mov = registrarMovimiento(p, user, { tipo: 'Anulación de póliza', fechaInicio: d.fechaAnulacion, detalle: { ...p.anulacion }, afectaCaratula: true });
    const notas = fact.notasPorAnulacion(user, p, d.fechaAnulacion, mov); mov.impactoPrima = notas.length > 0; mov.detalle.notasCredito = notas;
    mov.detalle.mensajeReembolso = notas.length ? (notas.some(n => n.tratamiento === 'REEMBOLSO') ? 'Hay pagos previos: procede reembolso al tomador.' : 'Sin pagos previos: basta el cruce de recibos por el proceso de Recaudo y Cartera.') : 'El período de la fecha de anulación no estaba facturado: no hay lugar a reembolsos ni nuevas facturas.';
    return { mov, antes, despues: { estado: 'ANULADA' }, extra: { notasCredito: notas } };
  };

  N.sucursal = (p, d, user) => {
    if (prod(p).sinCambioSucursal) fail('El cambio de sucursal no aplica para pólizas AP Viajero ni AP Bicibles (HU294).', { code: 'REGLA_NEGOCIO' });
    const errs = [];
    if (!SUCURSALES.includes(d.sucursal)) errs.push({ campo: 'sucursal', mensaje: 'La sucursal es obligatoria.' });
    const fa = d.fechaAplicacion || hoy(); if (!isYmd(fa)) errs.push({ campo: 'fechaAplicacion', mensaje: 'La fecha de aplicación de la novedad es obligatoria.' });
    if (errs.length) fail('Corrija los datos del cambio de sucursal.', { code: 'VALIDACION', detalle: errs });
    if (d.sucursal === p.generales.sucursal) fail('La póliza ya pertenece a esa sucursal.', { code: 'REGLA_NEGOCIO' });
    if (p.generales.intermediada) for (const i of p.intermediarios) {      // Decisión D-03: bloqueo duro ([COD] NovedadCambioSucursalServiceImpl; el cuerpo del CC dice lo contrario)
      const cat = INTERMEDIARIOS.find(x => x.clave === i.clave);
      if (!cat?.sucursales.includes(d.sucursal)) fail('El intermediario no se encuentra disponible para esta sucursal nueva. Para realizar el cambio, el intermediario debe estar autorizado para comercializar en ella; valide el procedimiento e intente posteriormente.', { code: 'INTERMEDIARIO_NO_SUCURSAL', detalle: [{ campo: 'sucursal', mensaje: `${cat?.nombre || i.clave} no comercializa en ${d.sucursal}` }] });
    }
    const antes = { sucursal: p.generales.sucursal }; p.generales.sucursal = d.sucursal; p.sucursalHistorial.push({ desde: fa, sucursal: d.sucursal });
    const mov = registrarMovimiento(p, user, { tipo: 'Cambio de sucursal', fechaInicio: fa, detalle: { anterior: antes.sucursal, actual: d.sucursal, fechaAplicacion: fa, nota: 'Los recibos emitidos antes de la fecha de aplicación conservan la sucursal anterior.' }, afectaCaratula: true });
    return { mov, antes, despues: { sucursal: d.sucursal } };
  };

  N.comision = (p, d, user) => {
    if (!p.generales.intermediada) fail('El cambio de % de comisión solo aplica a pólizas intermediadas (negocio no directo) — HU296.', { code: 'REGLA_NEGOCIO' });
    const pct = num(d.comision); if (pct == null || isNaN(pct) || pct < 0 || pct > 100) fail('El porcentaje de comisión es obligatorio y debe estar entre 0 y 100.', { code: 'VALIDACION', detalle: [{ campo: 'comision', mensaje: 'Porcentaje inválido (0-100).' }] });
    const fa = d.fechaAplicacion || hoy(); if (!isYmd(fa)) fail('La fecha de aplicación de la novedad es obligatoria.', { code: 'VALIDACION', detalle: [{ campo: 'fechaAplicacion', mensaje: 'Fecha inválida.' }] });
    if (fa < hoy()) fail('El cambio de comisión no puede ser retroactivo: aplica a recibos futuros (HU296).', { code: 'REGLA_NEGOCIO', detalle: [{ campo: 'fechaAplicacion', mensaje: 'No se admite fecha pasada.' }] });
    const modo = store.kvGet('params', {}).comisionCambioModo || 'PERIODO';
    const inicios = new Set([p.vigenciaDesde, ...p.facturacion.cronograma.map(c => c.inicio)]);
    if (modo === 'ESTRICTO' ? fa !== p.vigenciaDesde : !inicios.has(fa)) fail(modo === 'ESTRICTO' ? 'El cambio solo puede aplicarse al inicio de vigencia o en la renovación; nunca a mitad de vigencia (HU296, lectura estricta).' : 'El cambio debe aplicarse al inicio de un período de facturación: nunca a mitad de mes ni de vigencia (HU296).', { code: 'REGLA_NEGOCIO', detalle: [{ campo: 'fechaAplicacion', mensaje: 'Fecha no permitida.' }] });
    const actual = p.comisionHistorial.at(-1).total; if (pct === actual) fail('El porcentaje de comisión es igual al vigente.', { code: 'REGLA_NEGOCIO' });
    const antes = { comision: actual };
    const inter = p.comisionHistorial.at(-1).intermediarios; const total = inter.reduce((t, i) => t + i.pct, 0) || 1;
    p.comisionHistorial.push({ desde: fa, intermediarios: inter.map(i => ({ clave: i.clave, pct: money(i.pct * pct / total) })), total: pct }); p.costos.comision = pct;
    const mov = registrarMovimiento(p, user, { tipo: 'Cambio de % comisión', fechaInicio: fa, detalle: { anterior: actual, actual: pct, fechaAplicacion: fa, nota: 'No afecta comisiones liquidadas ni pagadas; alineado con Canales y Recaudo/Cartera.' } });
    return { mov, antes, despues: { comision: pct } };
  };

  N.gastos = (p, d, user) => {
    const campos = ['gastosAdmin', 'gastosReaseguro', 'gastosComerciales', 'utilidad', 'otrosGastos'];
    const nuevos = { ...p.costos }; for (const c of campos) if (c in d) nuevos[c] = d[c] === '' ? null : num(d[c]);
    const errs = R.validarCostos({ ...nuevos, comision: p.costos.comision }, p.generales, params()).filter(e => campos.includes(e.campo)); if (errs.length) fail('Corrija los porcentajes de gastos.', { code: 'VALIDACION', detalle: errs });
    const antes = Object.fromEntries(campos.map(c => [c, p.costos[c]])); const despues = Object.fromEntries(campos.map(c => [c, nuevos[c]]));
    if (JSON.stringify(antes) === JSON.stringify(despues)) fail('No hay cambios en los porcentajes de gastos.', { code: 'REGLA_NEGOCIO' });
    Object.assign(p.costos, despues);
    const mov = registrarMovimiento(p, user, { tipo: 'Modificación de gastos', fechaInicio: d.fechaAplicacion || hoy(), detalle: { anterior: antes, actual: despues, autorizadoPor: d.__autorizadoPor || null, ajustePrimaPendiente: true, nota: 'Cambia el P&G de la póliza: requiere ajuste de prima (fórmula no documentada → brecha G-14).' } });
    return { mov, antes, despues };
  };

  N.tomador = (p, d, user) => {
    const errs = R.validarTomador(d); if (errs.length) fail('Corrija los datos del tomador.', { code: 'VALIDACION', detalle: errs });
    const antes = clone(p.tomador); p.tomador = clone(d);
    const mov = registrarMovimiento(p, user, { tipo: 'Cambio de tomador', detalle: { anterior: { tipoPersona: antes.tipoPersona, doc: `${antes.tipoDoc} ${antes.numDoc}` }, actual: { tipoPersona: d.tipoPersona, doc: `${d.tipoDoc} ${d.numDoc}` } }, afectaCaratula: true });
    sim.crm({ poliza: p.numero, cambio: 'tomador' }, user);
    return { mov, antes, despues: clone(d) };
  };

  N.periodicidad = (p, d, user) => {
    const msg = R.validarCambioPeriodicidad(p, d.periodicidad); if (msg) fail(msg, { code: 'REGLA_NEGOCIO', detalle: [{ campo: 'periodicidad', mensaje: msg }] });
    if (d.confirmar !== true) fail('Debe confirmar el cambio: «¿Está seguro de cambiar la periodicidad de facturación?» (HU675).', { code: 'CONFIRMACION_REQUERIDA' });
    const cron = p.facturacion.cronograma; const fact_ = cron.filter(c => c.estado === 'FACTURADO'); const finUltimo = fact_.length ? fact_.at(-1).fin : null;
    if (d.fechaAplicacion && finUltimo && d.fechaAplicacion !== finUltimo) fail(`La fecha de aplicación debe ser igual a la fecha final del último recibo generado (${finUltimo}) — HU675.`, { code: 'REGLA_NEGOCIO', detalle: [{ campo: 'fechaAplicacion', mensaje: `Debe ser ${finUltimo}` }] });
    const fa = finUltimo || d.fechaAplicacion || hoy(); const antes = { periodicidad: p.facturacion.periodicidad };
    const completo = R.generarPeriodos(p.vigenciaDesde, p.vigenciaHasta, d.periodicidad); const base = fact_.length;
    const pendientes = completo.filter(c => c.fin > fa).map(c => ({ ...c, inicio: c.inicio < fa ? fa : c.inicio }));
    p.facturacion.cronograma = [...fact_, ...pendientes].map((c, i) => ({ ...c, idx: i, estado: c.estado || 'PENDIENTE' }));
    p.facturacion.periodicidad = d.periodicidad;
    const mov = registrarMovimiento(p, user, { tipo: 'Modificación de periodicidad de facturación', fechaInicio: fa, detalle: { anterior: antes.periodicidad, actual: d.periodicidad, fechaAplicacion: fa, periodosPendientes: pendientes.map(c => `${c.inicio} → ${c.fin}`) }, afectaCaratula: true });
    return { mov, antes, despues: { periodicidad: d.periodicidad } };
  };

  function amparoNovedad(a0, p, mov, esNuevo) { return { ...a0, id: a0.id || `AM-N${p.movSeq + 1}-${Math.random().toString(36).slice(2, 6)}`, origenEmision: esNuevo ? false : a0.origenEmision }; }
  N.ajustePlanes = (p, d, user) => {
    const fc = d.fechaCambio || hoy(); if (!isYmd(fc)) fail('La fecha del cambio es obligatoria.', { code: 'VALIDACION', detalle: [{ campo: 'fechaCambio', mensaje: 'Fecha inválida.' }] });
    if (!Array.isArray(d.planes) || !d.planes.length) fail('No se enviaron planes para ajustar.', { code: 'VALIDACION' });
    const antesPrima = Object.fromEntries(fact.planesCalc(p).map(x => [x.id, x.primaPorAsegurado]));
    const antes = clone(p.planes); const errs = [];
    const nuevos = clone(p.planes).map(pl => {
      const cambio = d.planes.find(x => x.id === pl.id); if (!cambio) return pl;
      if (has(cambio.nombre)) pl.nombre = cambio.nombre;
      if (cambio.nAsegurados != null && p.generales.estructura !== 'Nominada') pl.nAsegurados = num(cambio.nAsegurados);
      if (cambio.primaPorAsegurado != null) pl.primaPorAsegurado = num(cambio.primaPorAsegurado);
      for (const ca of cambio.amparos || []) {
        const ex = pl.amparos.find(a => a.id === ca.id);
        if (ca._eliminar) {
          if (!ex) continue;
          if (ex.tipoAmparo === 'Básico') errs.push({ campo: 'amparos', mensaje: `El amparo básico «${R.amparoCat(ex.cod)?.nombre}» no puede eliminarse del plan; solo editar sus condiciones.` });
          else if (ex.origenEmision) errs.push({ campo: 'amparos', mensaje: `No se pueden eliminar los amparos creados al momento de la radicación de la póliza («${R.amparoCat(ex.cod)?.nombre}»). Solo los creados en una novedad.` });
          else pl.amparos = pl.amparos.filter(a => a.id !== ex.id);
        } else if (ex) { const { cod, id, origenEmision, ...resto } = ca; Object.assign(ex, resto); }
        else pl.amparos.push(amparoNovedad({ ...ca }, p, null, true));
      }
      return pl;
    });
    if (errs.length) fail('El ajuste de planes incumple reglas de la HU387.', { code: 'VALIDACION', detalle: errs });
    const validar = R.validarProductos({ producto: p.datosProducto, planes: nuevos, generales: p.generales });
    if (validar.length) fail('El plan resultante no cumple las validaciones de planes/amparos.', { code: 'VALIDACION', detalle: validar });
    const sinies = p.siniestrosEnCurso > 0 && fc <= hoy();
    if (sinies && !d.__autorizada) return { requiereAutorizacion: { nivel: 'Superior', motivo: `Hay ${p.siniestrosEnCurso} siniestro(s) en curso que el cambio puede afectar` } };
    p.planes = nuevos;
    const despuesPrima = Object.fromEntries(fact.planesCalc(p).map(x => [x.id, x.primaPorAsegurado]));
    const ratio = Object.fromEntries(Object.keys(despuesPrima).map(k => [k, antesPrima[k] > 0 ? despuesPrima[k] / antesPrima[k] : 1]));
    const mov = registrarMovimiento(p, user, { tipo: 'Ajuste de planes', fechaInicio: fc, detalle: { fechaCambio: fc, primaAntes: antesPrima, primaDespues: despuesPrima, propagadoAAsegurados: p.generales.estructura === 'Nominada' ? p.asegurados.filter(a => a.estado === 'VIGENTE').length : null, alertaSiniestros: sinies }, afectaCaratula: true, impactoPrima: Object.keys(ratio).some(k => ratio[k] !== 1) });
    const ajustes = fact.ajustesPorCambioPrima(user, p, fc, ratio, mov); mov.detalle.ajustes = ajustes; mov.impactoPrima = mov.impactoPrima && true;
    if (sinies) notify({ nivelMin: 'Básico' }, `Alerta: el ajuste de planes de la póliza ${p.numero} puede afectar siniestros en curso; actualizar la información.`, p.id);
    return { mov, antes, despues: clone(nuevos), extra: { ajustes } };
  };

  N.beneficiarios = (p, d, user) => {
    if (p.generales.estructura !== 'Nominada') fail('La asignación de beneficiarios requiere asegurados identificados (póliza nominada).', { code: 'REGLA_NEGOCIO' });
    const filas = d.filas || []; if (!filas.length) fail('El archivo no contiene registros.', { code: 'VALIDACION' }); if (filas.length > 500) fail('El archivo supera el tamaño máximo permitido (500 registros por cargue).', { code: 'VALIDACION' });
    const resultado = filas.map((f, i) => ({ fila: i + 1, ...f, registro: 'Correcto', observaciones: [] }));
    const ocupa = (r, m) => { r.registro = 'Incorrecto'; r.observaciones.push(m); };
    const grupos = new Map();
    resultado.forEach(r => {
      for (const [c, n] of [['tipoDocAsegurado', 'Tipo de documento del asegurado'], ['numDocAsegurado', 'Número de documento del asegurado'], ['tipoDocBeneficiario', 'Tipo de documento del beneficiario'], ['numDocBeneficiario', 'Número de documento del beneficiario'], ['parentesco', 'Parentesco'], ['porcentaje', 'Porcentaje de designación'], ['tipoBeneficiario', 'Tipo de beneficiario']]) if (!has(r[c])) ocupa(r, `Campo «${n}» es obligatorio y aparece vacío`);
      if (has(r.tipoDocAsegurado) && !TIPOS_DOC.includes(r.tipoDocAsegurado)) ocupa(r, 'Campo «Tipo de documento del asegurado» no cumple con el formato');
      if (has(r.tipoDocBeneficiario) && !TIPOS_DOC.includes(r.tipoDocBeneficiario)) ocupa(r, 'Campo «Tipo de documento del beneficiario» no cumple con el formato');
      if (has(r.parentesco) && !PARENTESCOS[Number(r.parentesco)]) ocupa(r, 'Campo «Parentesco» no cumple con el formato');
      if (has(r.tipoBeneficiario) && !TIPOS_BENEFICIARIO.includes(r.tipoBeneficiario)) ocupa(r, 'Campo «Tipo de beneficiario» no cumple con el formato');
      if (has(r.porcentaje) && (isNaN(Number(r.porcentaje)) || Number(r.porcentaje) <= 0 || Number(r.porcentaje) > 100)) ocupa(r, 'Campo «Porcentaje de designación» no cumple con el formato');
      if (!has(r.primerNombre) && r.tipoDocBeneficiario === 'CC' && has(r.numDocBeneficiario)) {     // HU404: Registraduría completa nombres por defecto
        const rg = sim.registraduria('CC', r.numDocBeneficiario, user); if (rg.res?.encontrado) Object.assign(r, { primerNombre: rg.res.primerNombre, segundoNombre: rg.res.segundoNombre, primerApellido: rg.res.primerApellido, segundoApellido: rg.res.segundoApellido, fechaNacimiento: r.fechaNacimiento || rg.res.fechaNacimiento });
      }
      if (!has(r.primerNombre)) ocupa(r, 'Campo «Primer nombre» es obligatorio y aparece vacío'); if (!has(r.primerApellido)) ocupa(r, 'Campo «Primer apellido» es obligatorio y aparece vacío');
      const a = p.asegurados.find(x => x.tipoDoc === r.tipoDocAsegurado && x.numDoc === String(r.numDocAsegurado));
      if (has(r.numDocAsegurado) && (!a || a.estado !== 'VIGENTE')) ocupa(r, 'Asegurado no se encuentra en la póliza');
      const k = `${r.tipoDocAsegurado}|${r.numDocAsegurado}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(r);
    });
    for (const [, g] of grupos) {
      const vistos = new Set();
      g.forEach(r => { const kk = `${r.tipoDocBeneficiario}|${r.numDocBeneficiario}`; if (vistos.has(kk)) ocupa(r, 'El beneficiario tiene registro duplicado para el mismo asegurado'); vistos.add(kk); });
      const suma = money(g.reduce((s, r) => s + (Number(r.porcentaje) || 0), 0));
      if (suma !== 100) g.forEach(r => ocupa(r, 'El % de designación no suma el 100%'));
      if (g.some(r => r.registro === 'Incorrecto')) g.forEach(r => { if (r.registro === 'Correcto') ocupa(r, 'El grupo del asegurado no se carga porque otro registro del mismo asegurado tiene errores'); });
    }
    let cargados = 0; const aseguradosActualizados = [];
    for (const [k, g] of grupos) {
      if (g.some(r => r.registro === 'Incorrecto')) continue;
      const a = p.asegurados.find(x => x.tipoDoc === g[0].tipoDocAsegurado && x.numDoc === String(g[0].numDocAsegurado));
      a.beneficiarios = g.map(r => ({ tipoDoc: r.tipoDocBeneficiario, numDoc: String(r.numDocBeneficiario), primerNombre: r.primerNombre, segundoNombre: r.segundoNombre || '', primerApellido: r.primerApellido, segundoApellido: r.segundoApellido || '', fechaNacimiento: r.fechaNacimiento || null, parentesco: Number(r.parentesco), parentescoNombre: PARENTESCOS[Number(r.parentesco)], porcentaje: Number(r.porcentaje), tipo: r.tipoBeneficiario }));   // sobrescribe solo a los asegurados del archivo
      cargados += g.length; aseguradosActualizados.push(a.numDoc);
    }
    const ok = resultado.filter(r => r.registro === 'Correcto').length;
    if (!ok) return { sinCambios: true, resultado, exitosos: 0, fallidos: resultado.length };
    const mov = registrarMovimiento(p, user, { tipo: 'Asignación o modificación de beneficiarios (cargue masivo)', detalle: { registrosCargados: cargados, aseguradosActualizados, fallidos: resultado.length - ok } });
    return { mov, antes: null, despues: { cargados }, extra: { resultado, exitosos: ok, fallidos: resultado.length - ok, mensaje: `El número de beneficiarios agregados fue exitoso: ${cargados}` } };
  };

  N.inclusion = (p, d, user) => {
    if (p.generales.estructura !== 'Nominada') fail('La inclusión/retiro de asegurados aplica a pólizas nominadas.', { code: 'REGLA_NEGOCIO' });
    const filas = d.asegurados || []; if (!filas.length) fail('No se enviaron asegurados para incluir.', { code: 'VALIDACION' });
    const resultado = [], nuevos = [];
    filas.forEach((f0, i) => {
      const f = { ...f0 }; const plan = p.planes.find(x => x.id === f.planId); const fi = f.fechaIngreso || hoy(); f.fechaIngreso = fi;
      const errs = R.validarAsegurado(f, i, { fechaRef: fi, plan }).map(x => x.mensaje);
      if (!isYmd(fi) || fi < p.vigenciaDesde || fi >= p.vigenciaHasta) errs.push('La fecha de ingreso debe estar dentro de la vigencia de la póliza.');
      if (p.asegurados.some(a => a.tipoDoc === f.tipoDoc && a.numDoc === f.numDoc && a.estado === 'VIGENTE') || nuevos.some(a => a.tipoDoc === f.tipoDoc && a.numDoc === f.numDoc)) errs.push('El asegurado ya está vigente en la póliza.');
      if (errs.length) resultado.push({ fila: i + 1, registro: 'Incorrecto', observaciones: errs }); else { nuevos.push(f); resultado.push({ fila: i + 1, registro: 'Correcto', observaciones: [] }); }
    });
    if (!nuevos.length) fail('Ningún asegurado superó las validaciones.', { code: 'VALIDACION', detalle: resultado.flatMap(r => r.observaciones.map(m => ({ campo: `fila ${r.fila}`, mensaje: m }))) });
    if (resultado.some(r => r.registro === 'Incorrecto') && !d.permitirParcial) fail('Hay registros con errores. Corrija el archivo o confirme el cargue parcial.', { code: 'VALIDACION', detalle: resultado.filter(r => r.registro === 'Incorrecto').flatMap(r => r.observaciones.map(m => ({ campo: `fila ${r.fila}`, mensaje: m }))) });
    const maxRetro = Math.max(...nuevos.map(a => diffDays(a.fechaIngreso, hoy())));
    if (maxRetro > params().retroMaxBasico.valor && !d.__autorizada) return { requiereAutorizacion: { nivel: params().nivelRetroSuperior.valor, motivo: `Retroactividad de ${maxRetro} días (más de ${params().retroMaxBasico.valor})` } };
    const mov = registrarMovimiento(p, user, { tipo: nuevos.length > 1 || d.masivo ? 'Cargue masivo de asegurados' : 'Inclusión de asegurados', fechaInicio: nuevos.map(a => a.fechaIngreso).sort()[0], detalle: { incluidos: nuevos.map(a => `${a.tipoDoc} ${a.numDoc}`), fallidos: resultado.filter(r => r.registro === 'Incorrecto').length, retroactividadDias: maxRetro }, afectaCaratula: false, impactoPrima: true });
    for (const a of nuevos) p.asegurados.push({ ...a, id: has(a.id) ? a.id : `AS-${store.seq('aseg')}`, estado: 'VIGENTE', novedadPendiente: true, beneficiarios: [], periodosFacturados: [], movIngreso: mov.numero });
    return { mov, antes: null, despues: { incluidos: nuevos.length }, extra: { resultado, exitosos: nuevos.length } };
  };

  N.retiro = (p, d, user) => {
    if (p.generales.estructura !== 'Nominada') fail('El retiro de asegurados aplica a pólizas nominadas.', { code: 'REGLA_NEGOCIO' });
    const ids = d.asegurados || []; if (!ids.length) fail('Seleccione al menos un asegurado a retirar.', { code: 'VALIDACION' });
    const fr = d.fechaRetiro || hoy(); if (!isYmd(fr) || fr < p.vigenciaDesde || fr > p.vigenciaHasta) fail('La fecha de retiro debe estar dentro de la vigencia de la póliza.', { code: 'VALIDACION', detalle: [{ campo: 'fechaRetiro', mensaje: 'Fecha fuera de vigencia.' }] });
    const objetivos = ids.map(i => p.asegurados.find(a => a.id === i || a.numDoc === i)); if (objetivos.some(a => !a || a.estado !== 'VIGENTE')) fail('Alguno de los asegurados no existe o ya fue retirado.', { code: 'REGLA_NEGOCIO' });
    if (objetivos.some(a => fr < a.fechaIngreso)) fail('La fecha de retiro no puede ser anterior a la fecha de ingreso del asegurado.', { code: 'VALIDACION' });
    // HU577: el retiro conserva las condiciones comerciales de ingreso (si la facturación es anual) o las últimas vigentes (si es otra).
    const cond = p.facturacion.periodicidad === 'Anual' ? fact.comisionDe(p, objetivos[0].fechaIngreso) : fact.comisionDe(p, fr);
    const yaFacturadoPosterior = fact.listarFacturas({ polizaId: p.id }).filter(f => f.tipo === 'FACTURA' && f.asegurado && objetivos.some(a => a.id === f.asegurado.id) && f.periodo.fin > fr).length;
    for (const a of objetivos) { a.estado = 'RETIRADO'; a.fechaRetiro = fr; a.motivoRetiro = d.motivo || null; a.comisionRetiro = cond; a.movRetiro = p.movSeq + 1; }
    const mov = registrarMovimiento(p, user, { tipo: 'Retiro de asegurados', fechaInicio: fr, detalle: { retirados: objetivos.map(a => `${a.tipoDoc} ${a.numDoc}`), condicionesComerciales: cond, periodosFacturadosPosteriores: yaFacturadoPosterior, nota: yaFacturadoPosterior ? 'Hay facturas de períodos posteriores al retiro: la devolución no está especificada en las HU (brecha G-15).' : null } });
    return { mov, antes: null, despues: { retirados: objetivos.length } };
  };

  /* ── ejecución de novedades (permisos, autorizaciones, auditoría) ── */
  const PERM = { anular: 'anular', sucursal: 'novedades', comision: 'novedades', gastos: 'novedades', tomador: 'novedadTercero', periodicidad: 'novedades', ajustePlanes: 'novedades', beneficiarios: 'novedadTercero', inclusion: 'novedades', retiro: 'novedades' };
  const NOMBRE = { anular: 'Anular póliza', sucursal: 'Cambio de sucursal', comision: 'Cambio de % comisión', gastos: 'Modificación de gastos', tomador: 'Cambio de tomador', periodicidad: 'Modificación de periodicidad', ajustePlanes: 'Ajuste de planes', beneficiarios: 'Cargue masivo de beneficiarios', inclusion: 'Inclusión de asegurados', retiro: 'Retiro de asegurados' };

  function ejecutar(user, polizaId, tipo, payload = {}) {
    if (!N[tipo]) fail(`Novedad desconocida: ${tipo}.`, { status: 404 });
    perm(user, PERM[tipo]);
    return store.tx(() => {
      const p = cargar(polizaId); exigirVigente(p);
      if (tipo === 'gastos') {
        const nivel = 'Superior', aut = USUARIOS.find(u => u.id === payload.autorizadorId);
        if (!aut || rankNivel(aut.nivel) < rankNivel(nivel) || aut.id === user.id) fail('Seleccione un usuario autorizador de nivel Superior o mayor distinto de usted (HU300).', { code: 'VALIDACION', detalle: [{ campo: 'autorizadorId', mensaje: 'Autorizador inválido.' }] });
        N.gastos(clone(p), payload, user);                                    // valida sin persistir (se aplica clon)
        const a = crearAutorizacion(user, p, 'GASTOS', nivel, payload, 'Cambio de porcentajes de gastos (impacta P&G; requiere ajuste de prima)', aut.id);
        return { pendienteAutorizacion: a, poliza: detalle(polizaId) };
      }
      if (tipo === 'comision' && num(payload.comision) > params().comisionMax.valor) {
        N.comision(clone(p), payload, user);
        const a = crearAutorizacion(user, p, 'COMISION', params().nivelComisionExcede.valor, payload, `Comisión ${payload.comision} % supera el límite de ${params().comisionMax.valor} %`);
        return { pendienteAutorizacion: a, poliza: detalle(polizaId) };
      }
      const r = N[tipo](p, payload, user);
      if (r.requiereAutorizacion) {
        if (tipo === 'ajustePlanes') N.ajustePlanes(clone(p), { ...payload, __autorizada: true }, user);   // valida completo antes de pedir autorización
        const a = crearAutorizacion(user, p, tipo === 'inclusion' ? 'INCLUSION_RETROACTIVA' : 'AJUSTE_PLANES_SINIESTROS', r.requiereAutorizacion.nivel, payload, r.requiereAutorizacion.motivo);
        return { pendienteAutorizacion: a, poliza: detalle(polizaId) };
      }
      if (r.sinCambios) return { sinCambios: true, ...r };
      polizas().put(p); audit(user, `NOVEDAD_${tipo.toUpperCase()}`, 'poliza', p.id, `${NOMBRE[tipo]} · movimiento ${r.mov.numero}`, r.antes, r.despues);
      return { movimiento: r.mov, ...(r.extra || {}), poliza: detalle(polizaId) };
    });
  }

  function resolverAutorizacion(user, id, { accion, observacion = '' } = {}) {
    return store.tx(() => {
      const a = autz().get(id); if (!a) fail('Autorización inexistente.', { status: 404 }); if (a.estado !== 'PENDIENTE') fail(`La autorización ya fue ${a.estado.toLowerCase()}.`, { code: 'ESTADO_INVALIDO' });
      if (!['aprobar', 'rechazar'].includes(accion)) fail('Acción inválida (aprobar o rechazar).');
      if (a.autorizadorId && a.autorizadorId !== user.id && user.rol !== 'Administrador') fail('Esta autorización fue asignada a otro usuario autorizador.', { code: 'SIN_PERMISO', status: 403 });
      if (!R.puedeAutorizar(user.nivel, a.nivelRequerido)) fail(`Su nivel (${user.nivel}) no alcanza el requerido (${a.nivelRequerido}).`, { code: 'NIVEL_INSUFICIENTE', status: 403 });
      if (a.solicitadoPorId === user.id && user.rol !== 'Administrador') fail('El solicitante no puede autorizar su propia solicitud.', { code: 'SIN_PERMISO', status: 403 });
      a.estado = accion === 'aprobar' ? 'APROBADA' : 'RECHAZADA'; a.resueltaPor = user.nombre; a.fechaResolucion = hoy(); a.observacion = observacion;
      let resultado = null;
      if (accion === 'aprobar') {
        const p = cargar(a.polizaId); exigirVigente(p);
        const tipo = { GASTOS: 'gastos', COMISION: 'comision', INCLUSION_RETROACTIVA: 'inclusion', AJUSTE_PLANES_SINIESTROS: 'ajustePlanes' }[a.tipo];
        const solicitante = USUARIOS.find(u => u.id === a.solicitadoPorId) || user;
        const r = N[tipo](p, { ...a.payload, __autorizada: true, __autorizadoPor: user.nombre }, solicitante);
        polizas().put(p); audit(user, `NOVEDAD_${tipo.toUpperCase()}_AUTORIZADA`, 'poliza', p.id, `${NOMBRE[tipo]} autorizada por ${user.nombre} · movimiento ${r.mov.numero}`, r.antes, r.despues); resultado = r.mov;
        notify(a.solicitadoPorId, `Su solicitud ${a.tipo} para la póliza ${p.numero} fue aprobada.`, a.id);
      } else notify(a.solicitadoPorId, `Su solicitud ${a.tipo} fue rechazada: ${observacion || 'sin observación'}.`, a.id);
      autz().put(a); audit(user, 'RESOLVER_AUTORIZACION', 'autorizacion', a.id, `${a.tipo} ${a.estado}`);
      return { autorizacion: a, movimiento: resultado };
    });
  }

  return { crearDesdeSolicitud, detalle, listar, historico, documento, ejecutar, resolverAutorizacion, listarAutorizaciones: () => autz().all().sort((a, b) => b.id.localeCompare(a.id)), NOMBRE, _get: id => polizas().get(id), _put: p => polizas().put(p),
    buscarTomador(tipoDoc, numDoc) {
      for (const p of polizas().all()) if (p.tomador.tipoDoc === tipoDoc && p.tomador.numDoc === numDoc) return { encontrado: true, fuente: 'Base de tomadores del Core', tomador: p.tomador };
      return { encontrado: false };
    } };
}
