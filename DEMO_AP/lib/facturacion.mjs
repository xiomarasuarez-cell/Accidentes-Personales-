// Facturación: períodos, factura electrónica por asegurado (HU577), recibos (HU091), notas crédito (HU077) y ajustes (HU387).
import { fail, clone, money, diffDays, addDays, has, num } from './util.mjs';
import { RAMO_AP_ID } from './catalog.mjs';
import * as R from './rules.mjs';

const DIAS_MES = 30.4375;
export const mesesDe = (a, b) => Math.max(1, Math.round(diffDays(a, b) / DIAS_MES));

export function createFacturacion(ctx, acc) {
  const { store, hoy, params, audit, notify, perm, sim, id: nextId } = ctx;
  const facs = () => store.col('facturas'), recs = () => store.col('recibos'), runs = () => store.col('facturacion_runs');

  /* ── cálculo base ── */
  const prod = p => R.producto(p.productoId);
  const vigMeses = p => mesesDe(p.vigenciaDesde, p.vigenciaHasta);
  const nVigentes = (p, planId) => p.generales.estructura === 'Nominada' ? p.asegurados.filter(a => a.planId === planId && a.estado === 'VIGENTE').length : null;
  function planesCalc(p) {
    return p.planes.map(pl => {
      const plan = { ...pl }; const n = nVigentes(p, pl.id); if (n != null && prod(p).modelo !== 'individual') plan.nAsegurados = n;
      return { id: pl.id, nombre: pl.nombre, ...R.calcPlan(plan, params(), p.generales, prod(p)) };
    });
  }
  const primaVigAsegurado = (p, planId) => planesCalc(p).find(x => x.id === planId)?.primaPorAsegurado || 0;
  const primaVigPoliza = p => money(planesCalc(p).reduce((s, x) => s + x.primaTotalPlan, 0));

  /** Valor de cada período del cronograma para una prima de vigencia dada (fracción de meses; el último absorbe el redondeo). Decisión D-01. */
  function valoresCronograma(p, primaVig) {
    const vm = vigMeses(p); const out = []; let acum = 0;
    p.facturacion.cronograma.forEach((per, i, arr) => {
      const v = i === arr.length - 1 ? money(primaVig - acum) : money(primaVig * mesesDe(per.inicio, per.fin) / vm);
      out.push(v); acum = money(acum + v);
    });
    return out;
  }
  function comisionDe(p, fecha) {
    const h = [...p.comisionHistorial].filter(x => x.desde <= fecha).sort((a, b) => a.desde.localeCompare(b.desde)).pop() || p.comisionHistorial[0];
    return h?.intermediarios || [];
  }
  const sucursalDe = (p, fecha) => [...p.sucursalHistorial].filter(x => x.desde <= fecha).sort((a, b) => a.desde.localeCompare(b.desde)).pop()?.sucursal || p.generales.sucursal;

  /* ── estado de un recibo (HU091 / HU577: Pendiente, Legalizado, Parcial, En mora, Anulado) ── */
  function estadoRecibo(r) {
    if (r.estadoBase === 'ANULADO') return 'ANULADO';
    if (r.esNegativo) return r.estadoBase === 'REEMBOLSADO' ? 'REEMBOLSADO' : (r.tratamiento === 'REEMBOLSO' ? 'PENDIENTE_REEMBOLSO' : 'CRUZADO');
    const pagado = money(r.pagos.reduce((s, x) => s + x.valor, 0)), saldo = money(r.total - pagado);
    if (saldo <= 0) return 'LEGALIZADO';
    if (hoy() > r.fechaLimite) return 'EN_MORA';
    return pagado > 0 ? 'PARCIAL' : 'PENDIENTE';
  }
  const vistaRecibo = r => { const pagado = money(r.pagos.reduce((s, x) => s + x.valor, 0)); return { ...r, estado: estadoRecibo(r), pagado, saldo: money(r.total - pagado) }; };

  function codigoBarras(r) {
    const ref = String(r.referencia).padStart(14, '0'), v = String(Math.round(Math.abs(r.total))).padStart(10, '0'), f = r.fechaLimite.replaceAll('-', '');
    return { bancolombia: `8888J4157700000000000R${ref}V${v}F${f}`, bancoBogota: `(415)7700000000000(8020)${ref}(3900)${v}(96)${f}`, simulado: true, nota: 'Estructura Bancolombia según HU091; la de Banco de Bogotá no está especificada (brecha).' };
  }

  /* ── creación de factura + recibo ── */
  function emitir(user, p, d) {
    const fac = { id: nextId('FE'), tipo: d.tipo || 'FACTURA', origen: d.origen, polizaId: p.id, fecha: hoy(), usuario: user.nombre, periodo: d.periodo, asegurado: d.asegurado || null, destinatario: d.destinatario,
      lineas: d.lineas, valorNeto: money(d.neto), ivaPct: d.ivaPct, iva: money(d.neto * d.ivaPct / 100), total: money(d.neto * (1 + d.ivaPct / 100)), comisiones: d.comisiones || [], sucursal: d.sucursal,
      movimientoNumero: d.movimientoNumero ?? null, facturaOrigenId: d.facturaOrigenId || null, motivo: d.motivo || null, modo: d.modo || null, estado: 'EMITIDA' };
    const dian = sim.dian(fac, user); fac.cufe = dian.cufe; fac.resolucion = dian.resolucion;             // bloqueante: si falla, la transacción se revierte
    const sap = sim.sap({ factura: fac.id, total: fac.total, poliza: p.numero }, user); fac.sap = sap;
    const neg = fac.total < 0;
    const rec = { id: nextId('RC'), referencia: 900000000 + store.seq('refrecibo'), facturaId: fac.id, polizaId: p.id, polizaNumero: p.numero, tomador: p.tomador, producto: prod(p).nombre, ramo: 'Accidentes Personales',
      sucursal: fac.sucursal, fechaExpedicion: fac.fecha, vigenciaDesde: fac.periodo.inicio, vigenciaHasta: fac.periodo.fin, periodicidad: p.facturacion.periodicidad, aseguradoId: fac.asegurado?.id || null,
      total: fac.total, prima: fac.valorNeto, iva: fac.iva, pagos: [], estadoBase: 'ACTIVO', esNegativo: neg, tratamiento: d.tratamiento || null,
      fechaLimite: addDays(fac.fecha, Number(p.generales.plazoPagoDias) || params().plazoPagoRecibo.valor), medioPago: ['Pagos en línea (Wompi)', 'Corresponsal bancario', 'Débito automático', 'Bancos con código de barras'] };
    rec.codigoBarras = codigoBarras(rec); rec.auditoria = { creadoPor: user.nombre, fecha: hoy() };
    fac.reciboId = rec.id; facs().put(fac); recs().put(rec);
    audit(user, neg ? 'EMITIR_NOTA_CREDITO' : 'EMITIR_FACTURA', 'factura', fac.id, `${fac.tipo} ${fac.id} · recibo ${rec.id} · total ${fac.total}`);
    return { fac, rec };
  }

  const receptorAsegurado = a => ({ tipoDoc: a.tipoDoc, numDoc: a.numDoc, nombre: [a.primerNombre, a.segundoNombre, a.primerApellido, a.segundoApellido].filter(Boolean).join(' '), direccion: a.direccion, ciudad: a.ciudad, departamento: a.departamento, correo: a.correo, telefono: a.telefono });
  const receptorTomador = t => ({ tipoDoc: t.tipoDoc, numDoc: t.numDoc, nombre: t.tipoPersona === 'Natural' ? [t.primerNombre, t.segundoNombre, t.primerApellido, t.segundoApellido].filter(Boolean).join(' ') : t.razonSocial, direccion: t.direccion, ciudad: t.ciudad, departamento: t.departamento, correo: t.tipoPersona === 'Jurídica' ? t.correoFacturacion : t.correo, telefono: t.telefonoMovil || t.telefonoFijo });

  /* ── plan de facturación (ítems) ── */
  function siguientePeriodo(p) { return p.facturacion.cronograma.find(x => x.estado === 'PENDIENTE') || null; }
  const key = (a, per) => `${per.inicio}|${per.fin}`;

  function construirItems(p, modo, { novedadIds = null } = {}) {
    const nominada = p.generales.estructura === 'Nominada', sig = siguientePeriodo(p), items = [], avisos = [];
    const cron = p.facturacion.cronograma;
    if (!nominada) {
      if (!sig) return { items, avisos, sig, cierraPeriodo: false };
      if (modo !== 'SIN_NOVEDADES') fail('En pólizas innominadas no hay facturación por asegurado ni por novedades: use «sin novedades» (supuesto S-06).', { code: 'REGLA_NEGOCIO' });
      const pc = planesCalc(p); const lineas = pc.map(x => { const vals = valoresCronograma(p, x.primaTotalPlan); return { planId: x.id, valorNeto: vals[cron.indexOf(sig)] }; });
      const neto = money(lineas.reduce((s, l) => s + l.valorNeto, 0));
      items.push({ origen: 'PERIODICA', periodo: sig, asegurado: null, destinatario: receptorTomador(p.tomador), lineas, neto });
      return { items, avisos, sig, cierraPeriodo: true };
    }
    const porAsegurado = (a, per, origen, completoSiCorte = true) => {
      const total = primaVigAsegurado(p, a.planId); const vals = valoresCronograma(p, total); const vPer = vals[cron.indexOf(cron.find(c => c.inicio === per.inicio && c.fin === per.fin))] ?? 0;
      const pr = R.prorrata(vPer, per, a.fechaIngreso); const neto = pr.valor;
      return { origen, periodo: per, asegurado: a, destinatario: receptorAsegurado(a), lineas: [{ planId: a.planId, valorNeto: neto }], neto, prorrata: pr.completo ? null : pr };
    };
    const activoEn = (a, per) => a.fechaIngreso < per.fin && !(a.fechaRetiro && a.fechaRetiro <= per.inicio);
    const hechos = a => new Set(a.periodosFacturados || []);
    const conNov = modo === 'CON_NOVEDADES' || modo === 'SOLO_NOVEDADES', conPer = modo === 'CON_NOVEDADES' || modo === 'SIN_NOVEDADES';
    if (conPer) {
      if (!sig && modo === 'SIN_NOVEDADES') return { items, avisos, sig, cierraPeriodo: false };
      if (sig) for (const a of p.asegurados) { if (a.novedadPendiente || !activoEn(a, sig) || hechos(a).has(key(a, sig))) continue; items.push(porAsegurado(a, sig, 'PERIODICA')); }
    }
    if (conNov) {
      const limite = sig ? cron.indexOf(sig) : cron.length - 1;
      for (const a of p.asegurados.filter(x => x.novedadPendiente && (!novedadIds || novedadIds.includes(x.id)))) {
        for (const per of cron.filter((c, i) => i <= limite && c.fin > a.fechaIngreso)) {
          if (!activoEn(a, per) || hechos(a).has(key(a, per))) continue;
          items.push(porAsegurado(a, per, 'NOVEDAD'));
        }
      }
    }
    return { items, avisos, sig, cierraPeriodo: conPer && !!sig };
  }

  function prevalidar(p, plan) {
    const errores = [];
    for (const it of plan.items) {
      if (it.neto > 0 && it.asegurado) for (const m of R.camposDianFaltantes(it.asegurado)) errores.push({ asegurado: it.asegurado.numDoc, nombre: receptorAsegurado(it.asegurado).nombre, campo: m.campo, mensaje: `Falta ${m.nombre}.` });
      if (it.neto > 0 && !it.asegurado) for (const m of R.camposDianFaltantes({ tipoDoc: it.destinatario.tipoDoc, numDoc: it.destinatario.numDoc, primerNombre: it.destinatario.nombre, direccion: it.destinatario.direccion, ciudad: it.destinatario.ciudad, departamento: it.destinatario.departamento, correo: it.destinatario.correo, telefono: it.destinatario.telefono })) errores.push({ asegurado: 'tomador', campo: m.campo, mensaje: `Falta ${m.nombre} del tomador.` });
      if (it.asegurado && facs().all().some(f => f.polizaId === p.id && f.asegurado?.id === it.asegurado.id && f.periodo.inicio === it.periodo.inicio && f.periodo.fin === it.periodo.fin && f.tipo === 'FACTURA' && f.estado === 'EMITIDA'))
        errores.push({ asegurado: it.asegurado.numDoc, campo: 'duplicidad', mensaje: `Duplicidad: el asegurado ya tiene factura del período ${it.periodo.inicio} a ${it.periodo.fin}.` });
    }
    return errores;
  }

  const MODOS = ['SIN_NOVEDADES', 'CON_NOVEDADES', 'SOLO_NOVEDADES'];
  const api = {
    MODOS, estadoRecibo, vistaRecibo, planesCalc, primaVigPoliza, primaVigAsegurado, valoresCronograma, comisionDe, sucursalDe, receptorTomador, receptorAsegurado, mesesDe,
    estado(polizaId) {
      const p = acc.get(polizaId); if (!p) fail('Póliza inexistente.', { status: 404 });
      const total = primaVigPoliza(p); const vals = valoresCronograma(p, total);
      const pend = p.asegurados.filter(a => a.novedadPendiente).map(a => ({ id: a.id, numDoc: a.numDoc, nombre: receptorAsegurado(a).nombre, fechaIngreso: a.fechaIngreso, planId: a.planId }));
      return { periodicidad: p.facturacion.periodicidad, primaVigencia: total, cronograma: p.facturacion.cronograma.map((c, i) => ({ ...c, valorPoliza: vals[i], meses: mesesDe(c.inicio, c.fin) })), siguiente: siguientePeriodo(p), novedadesPendientes: pend, estructura: p.generales.estructura, modos: p.generales.estructura === 'Nominada' ? MODOS : ['SIN_NOVEDADES'], estado: p.estado };
    },
    validar(polizaId, { modo = 'SIN_NOVEDADES', novedadIds = null } = {}) {
      const p = acc.get(polizaId); if (!p) fail('Póliza inexistente.', { status: 404 });
      if (p.estado !== 'VIGENTE') return { ok: false, errores: [{ campo: 'estado', mensaje: `La póliza está ${p.estado}: no se factura.` }], items: [] };
      if (!MODOS.includes(modo)) return { ok: false, errores: [{ campo: 'modo', mensaje: 'Modalidad inválida.' }], items: [] };
      let plan; try { plan = construirItems(p, modo, { novedadIds }); } catch (e) { return { ok: false, errores: [{ campo: 'modo', mensaje: e.message }], items: [] }; }
      if (!plan.items.length) return { ok: false, errores: [{ campo: 'items', mensaje: plan.sig || modo !== 'SIN_NOVEDADES' ? 'No hay nada que facturar con la modalidad elegida (sin novedades pendientes o sin asegurados vigentes).' : 'La vigencia ya está facturada por completo.' }], items: [] };
      const errores = prevalidar(p, plan);
      return { ok: !errores.length, errores, periodo: plan.sig, items: plan.items.map(i => ({ asegurado: i.asegurado ? { id: i.asegurado.id, numDoc: i.asegurado.numDoc, nombre: i.destinatario.nombre } : { id: null, numDoc: i.destinatario.numDoc, nombre: i.destinatario.nombre }, origen: i.origen, periodo: i.periodo, neto: i.neto, prorrata: i.prorrata || null, generaFactura: i.neto > 0 })), total: money(plan.items.reduce((s, i) => s + i.neto, 0)) };
    },
    facturar(user, polizaId, { modo = 'SIN_NOVEDADES', novedadIds = null } = {}) {
      perm(user, 'facturar');
      return store.tx(() => {
        const p = acc.get(polizaId); if (!p) fail('Póliza inexistente.', { status: 404 });
        if (p.estado !== 'VIGENTE') fail(`La póliza está ${p.estado}: no se puede facturar.`, { code: 'ESTADO_INVALIDO' });
        if (user.rol === 'Intermediario' && !p.intermediarios.some(i => i.clave === user.claveIntermediario)) fail('El intermediario no tiene delegación sobre esta póliza (HU577).', { code: 'SIN_PERMISO', status: 403 });
        if (!MODOS.includes(modo)) fail('Modalidad de facturación inválida.');
        const plan = construirItems(p, modo, { novedadIds });
        if (!plan.items.length) fail(plan.sig || modo !== 'SIN_NOVEDADES' ? 'No hay nada que facturar con la modalidad elegida.' : 'La vigencia ya está facturada por completo.', { code: 'SIN_ITEMS' });
        const errs = prevalidar(p, plan);
        if (errs.length) fail(`No se puede facturar: ${errs.length} validación(es) previa(s) fallaron. No se generó ninguna factura.`, { code: 'VALIDACION_FACTURACION', detalle: errs });
        const creadas = [], sinFactura = [], ivaPct = Number(params().ivaPorProducto.valor) || 0;
        for (const it of plan.items) {
          if (it.neto <= 0) { sinFactura.push({ asegurado: it.destinatario.numDoc, periodo: it.periodo, motivo: 'Prima cero: se registra el proceso sin factura electrónica ni recibo (HU577).' }); }
          else {
            const comis = comisionDe(p, it.periodo.inicio).map(c => ({ clave: c.clave, pct: c.pct, valor: money(it.neto * c.pct / 100) }));
            const movNum = it.origen === 'NOVEDAD' ? it.asegurado?.movIngreso ?? null : (it.periodo.idx === 0 ? 1 : null);
            const { fac, rec } = emitir(user, p, { origen: it.origen, periodo: { idx: it.periodo.idx, inicio: it.periodo.inicio, fin: it.periodo.fin }, asegurado: it.asegurado ? { id: it.asegurado.id, numDoc: it.asegurado.numDoc, planId: it.asegurado.planId } : null,
              destinatario: it.destinatario, lineas: it.lineas, neto: it.neto, ivaPct, comisiones: comis, sucursal: sucursalDe(p, it.periodo.inicio), movimientoNumero: movNum, modo });
            creadas.push({ factura: fac.id, recibo: rec.id, total: fac.total, asegurado: it.destinatario.numDoc, periodo: fac.periodo });
          }
          if (it.asegurado) {
            const a = p.asegurados.find(x => x.id === it.asegurado.id); a.periodosFacturados = [...new Set([...(a.periodosFacturados || []), key(a, it.periodo)])];
            const tieneTodos = p.facturacion.cronograma.filter((c, i) => !plan.sig || i <= p.facturacion.cronograma.indexOf(plan.sig)).filter(c => c.fin > a.fechaIngreso && !(a.fechaRetiro && a.fechaRetiro <= c.inicio)).every(c => a.periodosFacturados.includes(`${c.inicio}|${c.fin}`));
            if (it.origen === 'NOVEDAD' && tieneTodos) a.novedadPendiente = false;
          }
        }
        if (plan.cierraPeriodo) plan.sig.estado = 'FACTURADO';
        p.facturacion.cronograma = p.facturacion.cronograma.map(c => c.idx === plan.sig?.idx && plan.cierraPeriodo ? { ...c, estado: 'FACTURADO' } : c);
        const run = { id: nextId('FR'), polizaId: p.id, modo, fecha: hoy(), usuario: user.nombre, periodo: plan.sig, facturas: creadas, sinFactura };
        runs().put(run); acc.put(p);
        audit(user, 'FACTURAR_POLIZA', 'poliza', p.id, `Facturación ${modo}: ${creadas.length} factura(s), ${sinFactura.length} sin factura`);
        return { run, facturas: creadas, sinFactura, poliza: acc.get(p.id) };
      });
    },
    /** Valor realmente facturado de una factura original: original + ajustes (+) + notas crédito (−) ya emitidos sobre ella. */
    _acumulado(f) { return money(f.valorNeto + facs().all().filter(x => x.facturaOrigenId === f.id).reduce((t, x) => t + x.valorNeto, 0)); },
    /** HU077: anulación con fecha anticipada → factura nota crédito con recibo de prima negativa por lo ya facturado a partir de la fecha. */
    notasPorAnulacion(user, p, fecha, mov) {
      const notas = [];
      for (const f of facs().all().filter(x => x.polizaId === p.id && x.tipo === 'FACTURA' && x.estado === 'EMITIDA' && x.periodo.fin > fecha)) {
        const frac = f.periodo.inicio >= fecha ? 1 : diffDays(fecha, f.periodo.fin) / diffDays(f.periodo.inicio, f.periodo.fin);
        const neto = money(api._acumulado(f) * frac); if (neto <= 0) continue;
        notas.push(api._notaCredito(user, p, f, neto, `Anulación de póliza desde ${fecha}`, mov));
      }
      return notas;
    },
    _notaCredito(user, p, f, neto, motivo, mov) {
      const orig = recs().get(f.reciboId); const pagado = money(orig.pagos.filter(x => x.tipo !== 'CRUCE').reduce((s, x) => s + x.valor, 0));
      const trat = pagado > 0 ? 'REEMBOLSO' : 'CRUCE'; const k = f.valorNeto ? neto / f.valorNeto : 1;
      const lineas = f.lineas.map(l => ({ planId: l.planId, valorNeto: -money(l.valorNeto * k) }));
      const { fac, rec } = emitir(user, p, { tipo: 'NOTA_CREDITO', origen: 'ANULACION_O_AJUSTE', periodo: f.periodo, asegurado: f.asegurado, destinatario: f.destinatario, lineas, neto: -neto, ivaPct: f.ivaPct, comisiones: f.comisiones.map(c => ({ ...c, valor: -money(c.valor * k) })), sucursal: f.sucursal, movimientoNumero: mov?.numero ?? null, facturaOrigenId: f.id, motivo, tratamiento: trat });
      if (trat === 'CRUCE') {
        const saldo = money(orig.total - money(orig.pagos.reduce((s, x) => s + x.valor, 0))); const cruza = Math.min(saldo, Math.abs(fac.total));
        orig.pagos.push({ tipo: 'CRUCE', valor: cruza, fecha: hoy(), medio: `Cruce con ${fac.id}`, ref: rec.id });
        if (cruza >= orig.total - 0.001) orig.estadoBase = 'ANULADO';
        recs().put(orig);
      }
      return { notaCredito: fac.id, recibo: rec.id, valor: fac.total, tratamiento: trat, facturaOrigen: f.id, periodo: f.periodo };
    },
    /** HU387: ajuste de prima por cambio de plan sobre períodos ya facturados desde la fecha del cambio (sobre el valor acumulado vigente). */
    ajustesPorCambioPrima(user, p, fecha, ratioPorPlan, mov) {
      const out = [];
      for (const f of facs().all().filter(x => x.polizaId === p.id && x.tipo === 'FACTURA' && x.estado === 'EMITIDA' && x.periodo.fin > fecha)) {
        const frac = f.periodo.inicio >= fecha ? 1 : diffDays(fecha, f.periodo.fin) / diffDays(f.periodo.inicio, f.periodo.fin);
        const acum = api._acumulado(f), tot = f.valorNeto || 1;
        const lineas = f.lineas.map(l => ({ planId: l.planId, valorNeto: money(acum * (l.valorNeto / tot) * frac * ((ratioPorPlan[l.planId] ?? 1) - 1)) }));
        const delta = money(lineas.reduce((s, l) => s + l.valorNeto, 0)); if (Math.abs(delta) < 0.01) continue;
        if (delta < 0) { out.push(api._notaCredito(user, p, f, -delta, 'Ajuste de plan: disminución de prima', mov)); continue; }
        const { fac, rec } = emitir(user, p, { tipo: 'AJUSTE', origen: 'AJUSTE_PLAN', periodo: f.periodo, asegurado: f.asegurado, destinatario: f.destinatario, lineas, neto: delta, ivaPct: f.ivaPct, comisiones: f.comisiones.map(c => ({ ...c, valor: money(c.valor * delta / tot) })), sucursal: f.sucursal, movimientoNumero: mov?.numero ?? null, facturaOrigenId: f.id, motivo: 'Ajuste de plan: aumento de prima' });
        out.push({ factura: fac.id, recibo: rec.id, valor: fac.total, tipo: 'AJUSTE', facturaOrigen: f.id, periodo: f.periodo });
      }
      return out;
    },
    // ── consultas
    listarFacturas({ polizaId, aseguradoId, tipo } = {}) {
      return facs().all().filter(f => (!polizaId || f.polizaId === polizaId) && (!aseguradoId || f.asegurado?.id === aseguradoId) && (!tipo || f.tipo === tipo)).sort((a, b) => b.id.localeCompare(a.id));
    },
    obtenerFactura(id) { const f = facs().get(id); if (!f) fail('Factura inexistente.', { status: 404 }); return { ...f, recibo: f.reciboId ? vistaRecibo(recs().get(f.reciboId)) : null }; },
    listarRecibos({ polizaId, estado } = {}) {
      return recs().all().map(vistaRecibo).filter(r => (!polizaId || r.polizaId === polizaId) && (!estado || r.estado === estado)).sort((a, b) => b.id.localeCompare(a.id));
    },
    obtenerRecibo(user, id) {
      perm(user, 'recibo'); const r = recs().get(id); if (!r) fail('Recibo inexistente.', { status: 404 });
      store.tx(() => audit(user, 'CONSULTAR_RECIBO', 'recibo', id, 'Recibo de pago generado/consultado (HU091: auditoría fecha, hora y usuario)'));
      return vistaRecibo(r);
    },
    reciboPendientePoliza(user, polizaId) {
      perm(user, 'recibo'); const pend = recs().all().map(vistaRecibo).filter(r => r.polizaId === polizaId && ['PENDIENTE', 'PARCIAL', 'EN_MORA'].includes(r.estado));
      if (!pend.length) fail('Esta póliza no tiene recibos de pago pendientes', { code: 'SIN_RECIBOS' });          // mensaje literal HU091
      return pend;
    },
    registrarPago(user, reciboId, { valor, medio = 'Corresponsal bancario', referencia = '' } = {}) {
      perm(user, 'pago');
      return store.tx(() => {
        const r = recs().get(reciboId); if (!r) fail('Recibo inexistente.', { status: 404 });
        if (r.esNegativo) fail('Los recibos negativos (notas crédito) no se pagan: se cruzan o se reembolsan.', { code: 'REGLA_NEGOCIO' });
        const st = vistaRecibo(r); if (st.estado === 'ANULADO') fail('El recibo está anulado.', { code: 'ESTADO_INVALIDO' });
        if (st.estado === 'LEGALIZADO') fail('El recibo ya está legalizado (pagado en su totalidad).', { code: 'ESTADO_INVALIDO' });
        const v = money(valor); if (!(v > 0)) fail('El valor del pago debe ser mayor que cero.'); if (v > st.saldo) fail(`El pago (${v}) supera el saldo pendiente (${st.saldo}).`, { code: 'VALIDACION' });
        if (/wompi/i.test(medio)) sim.wompi(r, user);
        r.pagos.push({ tipo: 'PAGO', valor: v, fecha: hoy(), medio, ref: referencia }); recs().put(r);
        audit(user, 'REGISTRAR_PAGO', 'recibo', r.id, `Pago ${v} por ${medio}`, { estado: st.estado }, { estado: estadoRecibo(r) });
        return vistaRecibo(recs().get(r.id));
      });
    },
    registrarReembolso(user, reciboId) {
      perm(user, 'pago');
      return store.tx(() => {
        const r = recs().get(reciboId); if (!r?.esNegativo || r.tratamiento !== 'REEMBOLSO') fail('El recibo no es un reembolso pendiente.', { code: 'REGLA_NEGOCIO' });
        r.estadoBase = 'REEMBOLSADO'; recs().put(r); audit(user, 'REGISTRAR_REEMBOLSO', 'recibo', r.id, `Reembolso de ${Math.abs(r.total)} al tomador`); return vistaRecibo(r);
      });
    },
    runs: polizaId => runs().all().filter(r => r.polizaId === polizaId).sort((a, b) => b.id.localeCompare(a.id)),
  };
  return api;
}
