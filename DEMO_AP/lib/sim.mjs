// INTEGRACIONES SIMULADAS. Ninguna llama a un tercero real. Cada adaptador reproduce el comportamiento esperado
// y deja una fila en la bitácora de integraciones con la misma forma que integraciones.log_integracion (LT-TI-INT-002).
import { createHash, randomUUID } from 'node:crypto';
import { BizError } from './util.mjs';

export const SERVICIOS = {
  REGISTRADURIA: { nombre: 'Registraduría (vía ESB Thanos)', bloqueante: false, real: 'ESB_REGISTRADURIA' },
  LISTAS_RESTRICTIVAS: { nombre: 'Listas restrictivas / SARLAFT (vía ESB)', bloqueante: true, real: 'ESB_LISTAS_RESTRICTIVAS' },
  SGDEA: { nombre: 'SGDEA (gestor documental)', bloqueante: false, real: 'SGDEA' },
  CRM: { nombre: 'CRM Ágora', bloqueante: false, real: 'CRM' },
  DIAN_OPEN: { nombre: 'Facturación electrónica (OPEN / DIAN)', bloqueante: true, real: 'FACTURACION_ELECTRONICA' },
  SAP: { nombre: 'SAP (contabilidad)', bloqueante: false, real: 'SAP (reintento por cron)' },
  WOMPI: { nombre: 'Wompi (pasarela de pagos)', bloqueante: false, real: 'WOMPI' },
};

// Personas de prueba para la Registraduría simulada
export const REGISTRADURIA_PRUEBA = {
  '1010101010': { primerNombre: 'María', segundoNombre: 'Camila', primerApellido: 'Gómez', segundoApellido: 'Ruiz', fechaNacimiento: '1990-05-12' },
  '1020202020': { primerNombre: 'Juan', segundoNombre: 'Pablo', primerApellido: 'Pérez', segundoApellido: 'Díaz', fechaNacimiento: '1985-11-03' },
  '1030303030': { primerNombre: 'Laura', primerApellido: 'Martínez', segundoApellido: 'Soto', fechaNacimiento: '2012-02-20' },
  '1040404040': { primerNombre: 'Carlos', primerApellido: 'Ramírez', fechaNacimiento: '1978-07-30' },
  '1050505050': { primerNombre: 'Ana', segundoNombre: 'Lucía', primerApellido: 'Torres', fechaNacimiento: '1969-01-15' },
};
const LISTAS_PRUEBA = new Set(['999999999', '800800800']);   // además de cualquier documento terminado en 666

export function createSim(store, hoy) {
  const log = store.col('integ_log');
  const cfg = () => store.kvGet('sim:config', {});
  const modo = s => cfg()[s] || 'ok';

  function llamar(servicio, operacion, request, usuario, fn) {
    const m = modo(servicio), t0 = Date.now();
    const id = 'IL-' + String(store.seqDirect('integ_log')).padStart(6, '0');
    const base = { id, correlationId: randomUUID(), integracion: SERVICIOS[servicio].real, servicio, operacion, usuario: usuario?.nombre || null, origen: 'demo-ap', destino: `simulado://${servicio.toLowerCase()}`, fecha: hoy(), ts: new Date().toISOString(), request, simulado: true };
    let res, ok = true, estadoHttp = 200, error = null;
    if (m === 'falla' || m === 'timeout') {
      ok = false; estadoHttp = m === 'timeout' ? null : 503;
      error = m === 'timeout' ? `Tiempo de espera agotado llamando a ${SERVICIOS[servicio].nombre} (simulado)` : `${SERVICIOS[servicio].nombre} no disponible (simulado)`;
    } else { res = fn(); if (res?.__http) { estadoHttp = res.__http; ok = estadoHttp < 400; delete res.__http; } }
    log.putDirect({ ...base, exitoso: ok, estadoHttp, duracionMs: Date.now() - t0 + 40, respuesta: res ?? null, error });
    if (!ok && SERVICIOS[servicio].bloqueante && estadoHttp !== 404) throw new BizError(error, { code: 'INTEGRACION_NO_DISPONIBLE', status: 502 });
    return { ok, res, error, estadoHttp };
  }

  return {
    modo, SERVICIOS,
    setModo(servicio, nuevo) {
      if (!SERVICIOS[servicio]) throw new BizError('Servicio simulado inexistente.');
      if (!['ok', 'falla', 'timeout'].includes(nuevo)) throw new BizError('Modo inválido (ok, falla, timeout).');
      store.kvSet('sim:config', { ...cfg(), [servicio]: nuevo });
    },
    config: () => Object.fromEntries(Object.keys(SERVICIOS).map(s => [s, modo(s)])),
    registraduria(tipoDoc, numDoc, usuario) {
      return llamar('REGISTRADURIA', 'consultarIdentidad', { tipoDoc, numDoc }, usuario, () => {
        const p = tipoDoc === 'CC' ? REGISTRADURIA_PRUEBA[String(numDoc)] : null;
        return p ? { encontrado: true, ...p } : { __http: 404, encontrado: false };
      });
    },
    listasRestrictivas(numDoc, nombre, usuario) {
      const r = llamar('LISTAS_RESTRICTIVAS', 'consultarListas', { numDoc, nombre }, usuario, () => {
        const hit = String(numDoc).endsWith('666') || LISTAS_PRUEBA.has(String(numDoc));
        return { coincidencias: hit ? [{ lista: 'ONU / OFAC (simulada)', prioridad: 1 }] : [] };
      });
      return { coincide: (r.res?.coincidencias || []).length > 0, detalle: r.res?.coincidencias || [] };
    },
    sgdea(documento, usuario) {
      const r = llamar('SGDEA', 'radicarDocumento', documento, usuario, () => ({ radicado: 'RAD-' + String(store.seq('radicado')).padStart(6, '0') }));
      return r.ok ? r.res.radicado : null;       // no bloqueante: sin radicado queda "pendiente de radicación" (SGDEA no tiene reintento)
    },
    crm(entidad, usuario) { return llamar('CRM', 'sincronizar', entidad, usuario, () => ({ sincronizado: true })).ok; },
    dian(factura, usuario) {
      const r = llamar('DIAN_OPEN', 'emitirFacturaElectronica', { numero: factura.id, total: factura.total, receptor: factura.destinatario?.numDoc }, usuario,
        () => ({ cufe: createHash('sha384').update(`${factura.id}|${factura.total}|${factura.destinatario?.numDoc}`).digest('hex'), resolucion: 'RES-DIAN-SIMULADA-2025' }));
      return r.res;
    },
    sap(asiento, usuario) {
      const r = llamar('SAP', 'registrarAsiento', asiento, usuario, () => ({ asiento: 'SAP-' + String(store.seq('sap')).padStart(6, '0') }));
      return r.ok ? { asiento: r.res.asiento, pendiente: false } : { asiento: null, pendiente: true };
    },
    wompi(recibo, usuario) {
      return llamar('WOMPI', 'crearLinkDePago', { recibo: recibo.id, total: recibo.total }, usuario, () => ({ url: `https://checkout.wompi.simulado/pay/${recibo.id}` })).res;
    },
    bitacora: () => log.all().sort((a, b) => b.id.localeCompare(a.id)),
  };
}
