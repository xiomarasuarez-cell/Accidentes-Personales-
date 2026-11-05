// Arnés de escenarios: construye datos válidos mediante los SERVICIOS reales (no inserta datos directamente en la BD).
import { BizError } from '../util.mjs';

export class Falla extends Error {}

export function crearHarness(core) {
  const { sol, pol, fact, ctx, store } = core;
  const pasos = [];
  const U = id => ctx.usuario(id);

  const H = {
    core, pasos, U,
    paso(texto, cond, detalle) { pasos.push({ texto, ok: !!cond, detalle: detalle === undefined ? null : detalle }); if (!cond) throw new Falla(`${texto}${detalle !== undefined ? ' → ' + JSON.stringify(detalle).slice(0, 400) : ''}`); },
    igual(texto, real, esperado) { H.paso(`${texto} (esperado: ${JSON.stringify(esperado)})`, JSON.stringify(real) === JSON.stringify(esperado), { real, esperado }); },
    /** La operación DEBE fallar con un error de negocio; opcionalmente con un código o un fragmento de mensaje. */
    espera(texto, fn, { code, contiene } = {}) {
      let err = null; try { fn(); } catch (e) { err = e; }
      const ok = err instanceof BizError && (!code || err.code === code) && (!contiene || (err.message + JSON.stringify(err.detalle || '')).toLowerCase().includes(contiene.toLowerCase()));
      pasos.push({ texto: `${texto} → rechazada por el sistema`, ok, detalle: err ? { code: err.code, mensaje: err.message, detalle: err.detalle } : 'NO fue rechazada' });
      if (!ok) throw new Falla(`${texto}: se esperaba un rechazo${code ? ' ' + code : ''}${contiene ? ' con «' + contiene + '»' : ''} y ocurrió: ${err ? err.code + ' ' + err.message : 'ninguno'}`);
      return err;
    },
    clock(f) { store.kvSet('clock', f); },
    hoy: () => ctx.hoy(),
    params(p) { store.kvSet('params', { ...store.kvGet('params', {}), ...p }); },

    /* ── builders ── */
    amparo(cod, tipo, extra = {}) { return { cod, tipoAmparo: tipo, tipoValorAsegurado: 'SUMA_INFORMADA', valorAseguradoIndividual: tipo === 'Básico' ? 50000000 : 5000000, edadMinIngreso: 18, edadMaxIngreso: 65, edadMaxPermanencia: 70, primaComercial: tipo === 'Básico' ? 100000 : 20000, ...extra }; },
    plan(producto, { n = 5, prima = 120000, nombre = 'Plan Oro', amparos = null } = {}) {
      return { nombre, nAsegurados: n, primaPorAsegurado: prima, amparos: amparos || [H.amparo('402', 'Básico'), H.amparo('702', 'Adicional')] };
    },
    tomadorNatural: (o = {}) => ({ tipoPersona: 'Natural', tipoDoc: 'CC', numDoc: '1010101010', primerNombre: 'María', segundoNombre: 'Camila', primerApellido: 'Gómez', segundoApellido: 'Ruiz', sexo: 'Femenino', fechaNacimiento: '1990-05-12', correo: 'maria@example.com', telefonoFijo: '6011234567', telefonoMovil: '3001234567', direccion: 'Calle 1 # 2-3', departamento: 'Cundinamarca', ciudad: 'Bogotá', cargoActual: 'Gerente', ...o }),
    tomadorJuridico: (o = {}) => ({ tipoPersona: 'Jurídica', tipoDoc: 'NIT', numDoc: '900123456', razonSocial: 'Colegio Los Pinos S.A.S.', nombreComercial: 'Colegio Los Pinos', representante: { tipoDoc: 'CC', numDoc: '1020202020', primerNombre: 'Juan', primerApellido: 'Pérez', segundoApellido: 'Díaz', cargoActual: 'Rector', correo: 'rector@lospinos.com', telefonoFijo: '6017654321', telefonoMovil: '3109876543', direccion: 'Carrera 5 # 6-7', departamento: 'Cundinamarca', ciudad: 'Bogotá' }, correo: 'info@lospinos.com', correoFacturacion: 'facturacion@lospinos.com', direccion: 'Carrera 5 # 6-7', departamento: 'Cundinamarca', ciudad: 'Bogotá', ...o }),
    asegurado: (i, o = {}) => ({ tipoDoc: 'CC', numDoc: String(2000000000 + i), primerNombre: `Asegurado${i}`, primerApellido: 'Prueba', segundoApellido: 'Demo', fechaNacimiento: `19${80 + (i % 15)}-0${1 + (i % 9)}-1${i % 9}`, direccion: `Carrera 7 # 10-${i}`, ciudad: 'Bogotá', departamento: 'Cundinamarca', correo: `aseg${i}@example.com`, telefono: `30000000${i % 10}${i % 10}`, ...o }),

    /** Crea una solicitud completa y válida (sin radicar) usando las secciones del servicio. */
    solicitud({ producto = 'AP_COLECTIVO', estructura = 'Nominada', n = 5, periodicidad = 'Mensual', intermediada = true, comision = 10, sucursal = 'Bogotá', desde = null, hasta = null, tomador = null, usuario = 'u-suscriptor-avanz',
      generales = {}, coaseguro = null, licitacion = null, siniestralidad = null, sarlaft = { completo: true }, costos = null, planes = null, producto_extra = {}, asegurados = null, clave = 'INT-1001' } = {}) {
      const u = U(usuario), hoy = ctx.hoy(); desde = desde || hoy; hasta = hasta || addYear(desde);
      const s = sol.crear(u, { productoId: producto });
      const g = { tipoSolicitud: 'Normal', estructura, vigenciaDesde: desde, vigenciaHasta: hasta, periodicidad, sucursal, tieneCoaseguro: !!coaseguro, afiliadoARL: false, intermediada, requiereRetorno: false, ...generales };
      sol.guardarSeccion(u, s.id, 'generales', g);
      sol.guardarSeccion(u, s.id, 'tomador', tomador || H.tomadorNatural());
      sol.guardarSeccion(u, s.id, 'intermediacion', { intermediarios: intermediada ? [{ clave, comision }] : [] });
      if (coaseguro) sol.guardarSeccion(u, s.id, 'coaseguro', coaseguro);
      if (licitacion) sol.guardarSeccion(u, s.id, 'licitacion', licitacion);
      const modelo = producto === 'AP_INDIVIDUAL' || producto.startsWith('AP_INDIVIDUAL') ? 'individual' : 'grupo';
      sol.guardarSeccion(u, s.id, 'productos', { producto: { productoId: producto, ...(producto === 'AP_GEN_POSITIVA' ? { ramaInstitucion: 'Mixta', tipoInstitucion: 'Colegio' } : {}), ...(producto === 'AP_INDIVIDUAL_VIAJERO' ? { origenViaje: 'Bogotá', destinoViaje: 'Madrid' } : {}), ...producto_extra },
        planes: planes || [H.plan(producto, { n })] });
      sol.guardarSeccion(u, s.id, 'siniestralidad', siniestralidad || { tuvoReclamaciones: false, vida: [], arl: [] });
      sol.guardarSeccion(u, s.id, 'sarlaft', sarlaft);
      if (costos) sol.guardarSeccion(u, s.id, 'costos', costos);
      if (estructura === 'Nominada') {
        const cantidad = modelo === 'individual' ? 1 : n; const filas = asegurados || Array.from({ length: cantidad }, (_, i) => H.asegurado(i + 1));
        sol.cargarAsegurados(u, s.id, filas);
      }
      return sol.obtener(s.id);
    },
    radicar(id, usuario = 'u-suscriptor-avanz') { return sol.radicar(U(usuario), id); },
    /** Flujo completo: solicitud → radicar → (autorizar políticas con los usuarios indicados) → emitir. */
    emitirPoliza(opts = {}, { autoriza = [] } = {}) {
      const s = H.solicitud(opts); H.radicar(s.id, opts.usuario);
      for (const [pid, uid] of autoriza) sol.resolverPolitica(U(uid), s.id, pid, 'autorizar');
      const r = sol.emitir(U('u-emision'), s.id);
      if (r.rechazada) throw new Falla('La emisión fue rechazada: ' + r.motivo);
      return pol.detalle(r.poliza.id);
    },
    poliza: id => pol.detalle(id),
    facturar(polizaId, modo = 'SIN_NOVEDADES', usuario = 'u-emision', extra = {}) { return fact.facturar(U(usuario), polizaId, { modo, ...extra }); },
    novedad(polizaId, tipo, payload, usuario = 'u-novedades') { return pol.ejecutar(U(usuario), polizaId, tipo, payload); },
    pagar(reciboId, valor, usuario = 'u-novedades', medio = 'Corresponsal bancario') { return fact.registrarPago(U(usuario), reciboId, { valor, medio }); },
  };
  return H;
}

export function addYear(ymd) { const [y, m, d] = ymd.split('-').map(Number); return `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
