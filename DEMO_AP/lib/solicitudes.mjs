// Emisión: solicitud de póliza (HU187-195, 207, 251, 255, 647), estudio técnico, políticas de suscripción y emisión.
import { BizError, fail, clone, has, num, money, isYmd, addDays } from './util.mjs';
import { PRODUCTOS, INTERMEDIARIOS, SUCURSALES, POLITICAS, PERIODICIDADES, NIVELES } from './catalog.mjs';
import * as R from './rules.mjs';

export function createSolicitudes(ctx, pol) {
  const { store, hoy, params, audit, notify, perm, sim, id: nextId } = ctx;
  const sols = () => store.col('solicitudes');

  const nuevaSolicitud = (user) => ({
    id: nextId('SOL'), estado: 'BORRADOR', creadaPor: user.nombre, creadaPorId: user.id, fechaCreacion: hoy(),
    generales: { tipoSolicitud: 'Normal', estructura: 'Nominada', vigenciaDesde: hoy(), vigenciaHasta: addDays(hoy(), 365), periodicidad: 'Mensual', sucursal: 'Bogotá', tieneCoaseguro: false, afiliadoARL: false, intermediada: false, requiereRetorno: false },
    coaseguro: null, licitacion: null, tomador: { tipoPersona: 'Natural' }, intermediacion: { intermediarios: [] },
    producto: {}, planes: [], asegurados: [], siniestralidad: { tuvoReclamaciones: false, vida: [], arl: [] }, sarlaft: { completo: false },
    costos: null, politicas: [], historial: [{ fecha: hoy(), usuario: user.nombre, evento: 'Solicitud creada en borrador' }],
  });

  function costosDefecto(s) {
    const p = params(); const com = (s.intermediacion?.intermediarios || []).reduce((t, i) => t + (num(i.comision) || 0), 0);
    return { gastosAdmin: p.gastosAdminDefecto.valor, gastosReaseguro: null, comision: s.generales.intermediada ? com : null, ivaComision: p.ivaComision.valor,
      tipoRetorno: null, valorRetorno: null, ivaRetorno: p.ivaRetorno.valor, gastosComerciales: 0, utilidad: p.utilidadDefecto.valor, otrosGastos: 0 };
  }

  function sincronizar(s) {
    // Nominada: el nº de asegurados de cada plan es el de asegurados asignados (supuesto S-05). Individual: 1.
    const prod = R.producto(s.producto?.productoId);
    for (const pl of s.planes) {
      if (prod?.modelo === 'individual') pl.nAsegurados = 1;
      else if (s.generales.estructura === 'Nominada') pl.nAsegurados = s.asegurados.filter(a => a.planId === pl.id).length;
    }
    if (!s.costos) s.costos = costosDefecto(s);
    return s;
  }

  const validaciones = (s) => {
    const prod = R.producto(s.producto?.productoId), p = params();
    const aseg = [];
    s.asegurados.forEach((a, i) => aseg.push(...R.validarAsegurado(a, i, { fechaRef: s.generales.vigenciaDesde, plan: s.planes.find(x => x.id === a.planId) }).filter(x => x.tipo !== 'POLITICA_P03')));
    const nums = s.asegurados.map(a => `${a.tipoDoc}-${a.numDoc}`); nums.forEach((n, i) => { if (nums.indexOf(n) !== i) aseg.push({ campo: `asegurados.${i}.numDoc`, mensaje: 'Asegurado duplicado en la solicitud.' }); });
    if (s.generales.estructura === 'Nominada' && !s.asegurados.length) aseg.push({ campo: 'asegurados', mensaje: 'Una póliza nominada requiere el listado de asegurados.' });
    if (prod?.modelo === 'individual' && s.asegurados.length !== 1) aseg.push({ campo: 'asegurados', mensaje: 'Un producto individual requiere exactamente un asegurado (supuesto S-03).' });
    const v = {
      generales: R.validarGenerales(s.generales, prod), coaseguro: R.validarCoaseguro(s.coaseguro, s.generales), licitacion: R.validarLicitacion(s.licitacion, s.generales),
      tomador: R.validarTomador(s.tomador), intermediacion: R.validarIntermediacion(s.intermediacion, s.generales, INTERMEDIARIOS),
      productos: R.validarProductos(s), asegurados: aseg, siniestralidad: R.validarSiniestralidad(s.siniestralidad, s.generales),
    };
    return v;
  };

  const SECCIONES = {
    generales: (s, d) => { s.generales = { ...s.generales, ...d }; if (!s.generales.tieneCoaseguro) s.coaseguro = null; if (s.generales.tipoSolicitud !== 'Licitación') s.licitacion = null; },
    coaseguro: (s, d) => { s.coaseguro = d; },
    licitacion: (s, d) => { s.licitacion = d; },
    tomador: (s, d) => { s.tomador = d; },
    intermediacion: (s, d) => {
      s.intermediacion = d;
      if (s.costos && s.generales.intermediada && !has(s.costos.comision)) s.costos.comision = (d.intermediarios || []).reduce((t, i) => t + (num(i.comision) || 0), 0);
    },
    productos: (s, d) => {
      s.producto = d.producto || s.producto; s.planes = d.planes || s.planes;
      s.planes.forEach((pl, i) => { pl.id = pl.id || `PL-${i + 1}-${Math.random().toString(36).slice(2, 6)}`; pl.amparos = (pl.amparos || []).map((a, j) => ({ ...a, id: a.id || `AM-${j + 1}-${Math.random().toString(36).slice(2, 6)}`, origenEmision: true })); });
      s.asegurados.forEach(a => { if (!s.planes.find(p => p.id === a.planId)) a.planId = s.planes[0]?.id || null; });
    },
    siniestralidad: (s, d) => { s.siniestralidad = d; },
    sarlaft: (s, d) => { s.sarlaft = { ...s.sarlaft, ...d }; },
    costos: (s, d) => { s.costos = { ...(s.costos || {}), ...d }; },
  };
  const SECCIONES_ESTUDIO = ['productos', 'costos', 'sarlaft'];     // editables tras radicar (estudio técnico)

  function asegurarEditable(s, user, seccion) {
    if (['EMITIDA', 'RECHAZADA'].includes(s.estado)) fail(`La solicitud está ${s.estado.toLowerCase()} y ya no puede editarse.`, { code: 'ESTADO_INVALIDO' });
    if (['RADICADA', 'EN_ESTUDIO'].includes(s.estado)) {
      perm(user, 'estudioTecnico');
      if (!SECCIONES_ESTUDIO.includes(seccion)) fail(`Tras radicar solo se editan las secciones del estudio técnico (${SECCIONES_ESTUDIO.join(', ')}). La sección «${seccion}» está bloqueada.`, { code: 'ESTADO_INVALIDO' });
    }
  }

  function reevaluar(s, user) {
    const previas = Object.fromEntries((s.politicas || []).map(p => [p.id, p]));
    const nuevas = R.evaluarPoliticas(s, params(), hoy()).map(n => {
      const ant = previas[n.id];
      if (ant && String(ant.valor) === String(n.valor) && ant.estado !== 'Pendiente') return { ...n, estado: ant.estado, observacion: ant.observacion, autorizadoPor: ant.autorizadoPor, fechaResolucion: ant.fechaResolucion };
      return { ...n, estado: 'Pendiente', observacion: ant?.observacion || '' };
    });
    for (const n of nuevas) {
      const ant = previas[n.id];
      if (n.estado === 'Pendiente' && (!ant || ant.estado !== 'Pendiente' || String(ant.valor) !== String(n.valor))) {
        notify({ nivelMin: n.nivelRequerido }, `Solicitud de Póliza No. ${s.id} requiere aprobación de Política(s) de Suscripción`, s.id);     // mensaje literal HU207
        notify({ nivelMin: n.nivelRequerido }, `Solicitud de Póliza No. ${s.id} pendiente de Autorización de Suscripción`, s.id);
      }
    }
    s.politicas = nuevas;
  }

  const api = {
    listar(filtros = {}) {
      return sols().all().filter(s => (!filtros.estado || s.estado === filtros.estado)).sort((a, b) => b.id.localeCompare(a.id)).map(s => resumen(s));
    },
    obtener(idSol) {
      const s = sols().get(idSol); if (!s) fail('Solicitud inexistente.', { status: 404, code: 'NO_ENCONTRADO' });
      return enriquecer(s);
    },
    crear(user, body = {}) {
      perm(user, 'crearSolicitud');
      return store.tx(() => {
        if (body.productoId && !PRODUCTOS.some(p => p.id === body.productoId)) fail(`Producto inexistente: ${body.productoId}.`, { status: 400, code: 'VALIDACION' });
        const s = nuevaSolicitud(user);
        if (body.productoId) { s.producto = { productoId: body.productoId }; }
        sincronizar(s); sols().put(s); audit(user, 'CREAR_SOLICITUD', 'solicitud', s.id, 'Solicitud de póliza creada en estado Guardado/Borrador');
        return enriquecer(s);
      });
    },
    guardarSeccion(user, idSol, seccion, data, { continuar = false } = {}) {
      perm(user, 'crearSolicitud');
      return store.tx(() => {
        const s = sols().get(idSol); if (!s) fail('Solicitud inexistente.', { status: 404 });
        if (!Object.hasOwn(SECCIONES, seccion)) fail(`Sección desconocida: ${seccion}.`, { status: 404, code: 'NO_ENCONTRADO' });
        if (data === null || typeof data !== 'object' || Array.isArray(data)) fail('Cuerpo inválido: se esperaba «data» con los campos de la sección.', { status: 400, code: 'VALIDACION' });
        asegurarEditable(s, user, seccion);
        const antes = clone(s[seccion] ?? s.producto ?? null);
        SECCIONES[seccion](s, clone(data)); sincronizar(s);
        const v = validaciones(s); const keyV = { productos: 'productos' }[seccion] || seccion; const errs = v[keyV] || [];
        if (continuar && errs.length) fail('Corrija los campos obligatorios o inválidos antes de continuar.', { code: 'VALIDACION', detalle: errs });
        if (['RADICADA', 'EN_ESTUDIO'].includes(s.estado)) { s.estado = 'EN_ESTUDIO'; reevaluar(s, user); }   // HU207: Guardar deja la solicitud "en estudio"
        s.historial.push({ fecha: hoy(), usuario: user.nombre, evento: `Sección «${seccion}» ${continuar ? 'validada y guardada' : 'guardada'}` });
        sols().put(s); audit(user, 'GUARDAR_SECCION', 'solicitud', s.id, `Sección ${seccion} guardada`, antes, clone(s[seccion] ?? s.producto ?? null));
        return { ...enriquecer(s), erroresSeccion: errs };
      });
    },
    eliminar(user, idSol) {
      perm(user, 'crearSolicitud');
      return store.tx(() => {
        const s = sols().get(idSol); if (!s) fail('Solicitud inexistente.', { status: 404 });
        if (s.estado !== 'BORRADOR') fail('Solo se pueden eliminar solicitudes en estado Guardado/Borrador (HU197).', { code: 'ESTADO_INVALIDO' });
        sols().del(idSol); audit(user, 'ELIMINAR_SOLICITUD', 'solicitud', idSol, 'Solicitud eliminada'); return { eliminada: idSol };
      });
    },
    // ── Asegurados (cargue / inclusión en la solicitud)
    agregarAsegurado(user, idSol, a) { return api.cargarAsegurados(user, idSol, [a], { individual: true }); },
    cargarAsegurados(user, idSol, filas, { individual = false } = {}) {
      perm(user, 'crearSolicitud');
      return store.tx(() => {
        const s = sols().get(idSol); if (!s) fail('Solicitud inexistente.', { status: 404 });
        asegurarEditable(s, user, SECCIONES_ESTUDIO.includes('productos') && ['RADICADA', 'EN_ESTUDIO'].includes(s.estado) ? 'productos' : 'asegurados');
        if (s.generales.estructura !== 'Nominada') fail('El cargue de asegurados aplica solo a pólizas nominadas.', { code: 'REGLA_NEGOCIO' });
        if (!s.planes.length) fail('Defina primero el producto y los planes: el asegurado se asigna a un plan.', { code: 'REGLA_NEGOCIO' });
        const resultado = [];
        filas.forEach((f0, i) => {
          const f = { ...f0 };
          if (!f.planId && s.planes.length === 1) f.planId = s.planes[0].id;
          if (!has(f.id)) f.id = `AS-${store.seq('aseg')}`;
          if (!has(f.primerNombre) && f.tipoDoc === 'CC' && has(f.numDoc)) {          // HU404/HU193: nombres desde Registraduría si faltan
            const r = sim.registraduria('CC', f.numDoc, user); if (r.res?.encontrado) Object.assign(f, { primerNombre: r.res.primerNombre, segundoNombre: r.res.segundoNombre, primerApellido: r.res.primerApellido, segundoApellido: r.res.segundoApellido, fechaNacimiento: f.fechaNacimiento || r.res.fechaNacimiento });
          }
          const plan = s.planes.find(p => p.id === f.planId);
          const errs = R.validarAsegurado(f, i, { fechaRef: s.generales.vigenciaDesde, plan });
          const bloqueantes = errs.filter(x => x.tipo !== 'POLITICA_P03');
          if (s.asegurados.some(x => x.tipoDoc === f.tipoDoc && x.numDoc === f.numDoc)) bloqueantes.push({ campo: 'numDoc', mensaje: 'Asegurado duplicado en la solicitud.' });
          if (bloqueantes.length) resultado.push({ fila: i + 1, registro: 'Incorrecto', observaciones: bloqueantes.map(x => x.mensaje), asegurado: f });
          else { s.asegurados.push(f); resultado.push({ fila: i + 1, registro: 'Correcto', observaciones: errs.filter(x => x.tipo === 'POLITICA_P03').map(x => x.mensaje + ' → requerirá autorización de política.'), asegurado: f }); }
        });
        sincronizar(s);
        if (['RADICADA', 'EN_ESTUDIO'].includes(s.estado)) { s.estado = 'EN_ESTUDIO'; reevaluar(s, user); }
        const ok = resultado.filter(r => r.registro === 'Correcto').length;
        if (individual && ok === 0) fail(resultado[0].observaciones.join(' '), { code: 'VALIDACION', detalle: resultado[0].observaciones.map(m => ({ campo: 'asegurado', mensaje: m })) });
        sols().put(s); audit(user, 'CARGUE_ASEGURADOS', 'solicitud', s.id, `${ok} de ${filas.length} asegurados cargados`);
        return { solicitud: enriquecer(s), resultado, exitosos: ok, fallidos: filas.length - ok };
      });
    },
    eliminarAsegurado(user, idSol, aid) {
      perm(user, 'crearSolicitud');
      return store.tx(() => {
        const s = sols().get(idSol); if (!s) fail('Solicitud inexistente.', { status: 404 });
        asegurarEditable(s, user, 'productos');
        s.asegurados = s.asegurados.filter(a => a.id !== aid); sincronizar(s);
        if (['RADICADA', 'EN_ESTUDIO'].includes(s.estado)) { s.estado = 'EN_ESTUDIO'; reevaluar(s, user); }
        sols().put(s); audit(user, 'ELIMINAR_ASEGURADO', 'solicitud', s.id, `Asegurado ${aid} retirado de la solicitud`); return enriquecer(s);
      });
    },
    // ── Consultas auxiliares
    consultarRegistraduria(user, tipoDoc, numDoc) { const r = sim.registraduria(tipoDoc, numDoc, user); return r.res || { encontrado: false }; },
    // ── Radicación
    radicar(user, idSol) {
      perm(user, 'crearSolicitud');
      return store.tx(() => {
        const s = sols().get(idSol); if (!s) fail('Solicitud inexistente.', { status: 404 });
        if (s.estado !== 'BORRADOR') fail(`La solicitud ya está ${s.estado}; solo se radican solicitudes en borrador.`, { code: 'ESTADO_INVALIDO' });
        sincronizar(s);
        const v = validaciones(s); const malas = Object.entries(v).filter(([, e]) => e.length);
        if (malas.length) fail('La solicitud tiene secciones incompletas o inválidas; no se puede radicar.', { code: 'VALIDACION', detalle: malas.flatMap(([sec, e]) => e.map(x => ({ seccion: sec, ...x }))) });
        s.estado = 'RADICADA'; s.codigoRadicacion = 'RAD-' + nextId('RAD', 5).split('-')[1]; s.fechaRadicacion = hoy();
        reevaluar(s, user);
        s.historial.push({ fecha: hoy(), usuario: user.nombre, evento: `Solicitud radicada con código ${s.codigoRadicacion}` });
        const radicadoSgdea = sim.sgdea({ tipo: 'SOLICITUD_POLIZA', solicitud: s.id }, user); s.radicadoSgdea = radicadoSgdea;
        sim.crm({ solicitud: s.id, estado: s.estado }, user);
        sols().put(s); audit(user, 'RADICAR_SOLICITUD', 'solicitud', s.id, `Radicada con código único ${s.codigoRadicacion}`);
        return enriquecer(s);
      });
    },
    // ── Estudio técnico: políticas
    resolverPolitica(user, idSol, politicaId, accion, { valorEsperado, observacion } = {}) {
      return store.tx(() => {
        const s = sols().get(idSol); if (!s) fail('Solicitud inexistente.', { status: 404 });
        if (!['RADICADA', 'EN_ESTUDIO'].includes(s.estado)) fail('Las políticas solo se gestionan durante el estudio técnico (solicitud radicada).', { code: 'ESTADO_INVALIDO' });
        if (['Usuario tercero', 'Intermediario'].includes(user.rol)) perm(user, 'estudioTecnico');
        const p = s.politicas.find(x => x.id === politicaId); if (!p) fail('La política no aplica a esta solicitud.', { status: 404 });
        if (!['autorizar', 'rechazar'].includes(accion)) fail('Acción inválida (autorizar o rechazar).');
        if (!R.puedeAutorizar(user.nivel, p.nivelRequerido)) fail(`Su nivel de autorización (${user.nivel}) no alcanza el nivel requerido (${p.nivelRequerido}) para esta política.`, { code: 'NIVEL_INSUFICIENTE', status: 403 });
        const antes = clone(p);
        if (accion === 'autorizar') {
          if (has(valorEsperado)) {                       // HU207: "Valor esperado… reemplazará el valor actual"
            if (p.id === 'P05') s.costos.comision = num(valorEsperado);
            if (p.id === 'P06') s.costos.valorRetorno = num(valorEsperado);
          }
          p.estado = 'Autorizada';
        } else p.estado = 'Rechazada';
        p.observacion = observacion || p.observacion; p.autorizadoPor = user.nombre; p.fechaResolucion = hoy();
        if (accion === 'rechazar') { s.estado = 'RECHAZADA'; s.motivoRechazo = `Política rechazada: ${p.nombre}`; s.historial.push({ fecha: hoy(), usuario: user.nombre, evento: s.motivoRechazo }); }
        else if (s.estado === 'RADICADA') s.estado = 'EN_ESTUDIO';
        sols().put(s); audit(user, accion === 'autorizar' ? 'AUTORIZAR_POLITICA' : 'RECHAZAR_POLITICA', 'solicitud', s.id, `${p.id} ${p.nombre}`, antes, clone(p));
        return enriquecer(s);
      });
    },
    // ── Emisión
    emitir(user, idSol) {
      perm(user, 'emitir');
      return store.tx(() => {
        const s = sols().get(idSol); if (!s) fail('Solicitud inexistente.', { status: 404 });
        if (!['RADICADA', 'EN_ESTUDIO'].includes(s.estado)) fail(s.estado === 'EMITIDA' ? 'La solicitud ya fue emitida.' : `La solicitud está ${s.estado}; solo se emiten solicitudes radicadas o en estudio.`, { code: 'ESTADO_INVALIDO' });
        sincronizar(s);
        const v = validaciones(s); const malas = Object.entries(v).filter(([, e]) => e.length);
        const costosErr = R.validarCostos(s.costos, s.generales, params()); if (costosErr.length) malas.push(['costos', costosErr]);
        if (malas.length) fail('La solicitud no cumple las validaciones obligatorias para emitir.', { code: 'VALIDACION', detalle: malas.flatMap(([sec, e]) => e.map(x => ({ seccion: sec, ...x }))) });
        reevaluar(s, user);
        const pend = s.politicas.filter(p => p.estado !== 'Autorizada');
        if (pend.length) fail(`No se puede emitir: ${pend.length} política(s) de suscripción sin autorizar (${pend.map(p => p.nombre).join('; ')}).`, { code: 'POLITICAS_PENDIENTES', detalle: pend.map(p => ({ politica: p.id, estado: p.estado, nivelRequerido: p.nivelRequerido })) });
        // SARLAFT: consulta de listas restrictivas del tomador (servicio bloqueante). Si coincide → se rechaza la solicitud (flujo "Rechazar solicitud por SARLAFT").
        const t = s.tomador; const nombre = t.tipoPersona === 'Natural' ? [t.primerNombre, t.primerApellido].filter(Boolean).join(' ') : t.razonSocial;
        const lr = sim.listasRestrictivas(t.numDoc, nombre, user);
        if (lr.coincide) {
          s.estado = 'RECHAZADA'; s.motivoRechazo = 'Rechazada por SARLAFT: el tomador coincide con listas restrictivas.';
          s.historial.push({ fecha: hoy(), usuario: user.nombre, evento: s.motivoRechazo }); sols().put(s);
          audit(user, 'RECHAZO_SARLAFT', 'solicitud', s.id, s.motivoRechazo, null, lr.detalle);
          return { rechazada: true, motivo: s.motivoRechazo, solicitud: enriquecer(s) };
        }
        const poliza = pol.crearDesdeSolicitud(user, s);
        s.estado = 'EMITIDA'; s.polizaId = poliza.id; s.historial.push({ fecha: hoy(), usuario: user.nombre, evento: `Póliza ${poliza.numero} emitida` });
        sols().put(s); audit(user, 'EMITIR_POLIZA', 'solicitud', s.id, `Póliza ${poliza.numero} emitida (movimiento 1)`);
        return { rechazada: false, poliza: pol.detalle(poliza.id), solicitud: enriquecer(s) };
      });
    },
  };

  function resumen(s) {
    const c = R.calcSolicitud(s, params()); const prod = R.producto(s.producto?.productoId);
    return { id: s.id, estado: s.estado, codigoRadicacion: s.codigoRadicacion || null, producto: prod?.nombre || '—', tomador: s.tomador?.tipoPersona === 'Natural' ? [s.tomador.primerNombre, s.tomador.primerApellido].filter(Boolean).join(' ') : (s.tomador?.razonSocial || ''),
      sucursal: s.generales.sucursal, prima: c.primaTotal, fecha: s.fechaCreacion, polizaId: s.polizaId || null, politicasPendientes: (s.politicas || []).filter(p => p.estado === 'Pendiente').length };
  }
  function enriquecer(s) {
    const calculo = R.calcSolicitud(s, params()); const validacion = validaciones(s);
    return { ...s, calculo, validacion, subtotalCostos: R.subtotalCostos(s.costos || {}, s.generales, params()), producto_: R.producto(s.producto?.productoId) || null,
      autorizacionPendiente: (s.politicas || []).some(p => p.estado === 'Pendiente'), puedeEmitir: ['RADICADA', 'EN_ESTUDIO'].includes(s.estado) && (s.politicas || []).every(p => p.estado === 'Autorizada') };
  }
  api._get = idSol => sols().get(idSol);
  return api;
}
