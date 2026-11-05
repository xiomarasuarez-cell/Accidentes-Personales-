// Datos de prueba para recorrer la demo: se crean con los SERVICIOS reales (misma ruta que usa la interfaz).
import { crearHarness } from './esc/harness.mjs';

export function sembrar(core) {
  core.store.reset();
  const H = crearHarness(core); const hoy = H.hoy();
  // A) AP Colectivo nominada: emitida, primer período facturado y un recibo pagado + un cambio de sucursal
  const A = H.emitirPoliza({ tomador: H.tomadorJuridico(), generales: { plazoPagoDias: 30 } });
  H.facturar(A.id); const rc = core.fact.listarRecibos({ polizaId: A.id })[0]; H.pagar(rc.id, rc.total);
  H.novedad(A.id, 'sucursal', { sucursal: 'Medellín' });
  // B) AP Individual emitida, sin facturar
  H.emitirPoliza({ producto: 'AP_INDIVIDUAL', n: 1, intermediada: false, tomador: H.tomadorNatural({ numDoc: '1020202020', primerNombre: 'Juan', primerApellido: 'Pérez', segundoNombre: 'Pablo', segundoApellido: 'Díaz' }) });
  // C) AP Generación Positiva innominada
  H.emitirPoliza({ producto: 'AP_GEN_POSITIVA', estructura: 'Innominada', n: 120, tomador: H.tomadorJuridico({ numDoc: '900777888', razonSocial: 'Colegio Santa Clara', nombreComercial: 'Santa Clara' }), periodicidad: 'Trimestral' });
  // D) Solicitud en estudio técnico con una política pendiente (comisión 30 %)
  const D = H.solicitud({ comision: 30, tomador: H.tomadorNatural({ numDoc: '1040404040', primerNombre: 'Carlos', primerApellido: 'Ramírez' }) }); H.radicar(D.id);
  // E) Solicitud radicada con SARLAFT incompleto (política del Oficial de Cumplimiento)
  const E = H.solicitud({ sarlaft: { completo: false }, tomador: H.tomadorNatural({ numDoc: '1050505050', primerNombre: 'Ana', primerApellido: 'Torres' }) }); H.radicar(E.id);
  // F) Borrador incompleto
  const u = H.U('u-suscriptor-avanz'); const F = core.sol.crear(u, { productoId: 'AP_COLECTIVO' }); core.sol.guardarSeccion(u, F.id, 'tomador', { tipoPersona: 'Natural', primerNombre: 'María', primerApellido: 'Borrador' });
  return { polizas: core.pol.listar().length, solicitudes: core.sol.listar().length, fecha: hoy };
}
