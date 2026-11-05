// Tabla de rutas de la API REST de la demo. Cada handler recibe { core, user, params, query, body }.
import * as C from './catalog.mjs';
import { fail } from './util.mjs';
import { SERVICIOS } from './sim.mjs';
import { REGISTRADURIA_PRUEBA } from './sim.mjs';
import { sembrar } from './seed.mjs';

export function buildRoutes(core, escenarios) {
  const { ctx, sol, pol, fact, store } = core;
  const R = [];
  const add = (method, path, handler) => R.push({ method, re: new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler });

  add('GET', '/api/meta', ({ user }) => ({
    productos: C.PRODUCTOS, amparos: C.AMPAROS, proveedores: C.PROVEEDORES_ASISTENCIA, tiposValorAsegurado: C.TIPOS_VALOR_ASEGURADO, tiposAmparo: C.TIPOS_AMPARO, periodicidades: Object.keys(C.PERIODICIDADES), tiposDoc: C.TIPOS_DOC,
    tiposDocTomadorNatural: C.TIPOS_DOC_TOMADOR_NATURAL, tiposBeneficiario: C.TIPOS_BENEFICIARIO, parentescos: C.PARENTESCOS, motivosAnulacion: C.MOTIVOS_ANULACION, tiposAnulacion: C.TIPOS_ANULACION, ramasInstitucion: C.RAMAS_INSTITUCION,
    tiposInstitucion: C.TIPOS_INSTITUCION, niveles: C.NIVELES, politicas: C.POLITICAS, sucursales: C.SUCURSALES, intermediarios: C.INTERMEDIARIOS, usuarios: C.USUARIOS, permisos: C.PERMISOS, tiposSolicitud: C.TIPOS_SOLICITUD, estructuras: C.ESTRUCTURAS,
    params: ctx.params(), reloj: ctx.hoy(), relojSimulado: !!store.kvGet('clock'), sim: { servicios: SERVICIOS, config: ctx.sim.config() }, usuario: user || null, registraduriaPrueba: Object.entries(REGISTRADURIA_PRUEBA).map(([doc, p]) => ({ doc, ...p })),
    modosFacturacion: fact.MODOS, comisionCambioModo: store.kvGet('params', {}).comisionCambioModo || 'PERIODO',
  }));
  add('GET', '/api/dashboard', () => core.dashboard());
  add('POST', '/api/seed', ({ user }) => { if (store.col('solicitudes').all().length || store.col('polizas').all().length) ctx.perm(user, 'configurar'); return sembrar(core); });
  add('POST', '/api/reset', ({ user }) => { ctx.perm(user, 'configurar'); store.reset(); return { reiniciado: true }; });
  add('POST', '/api/clock', ({ user, body }) => { ctx.perm(user, 'configurar'); if (body.fecha) { if (!/^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) fail('Fecha inválida.'); store.kvSet('clock', body.fecha); } else store.kvSet('clock', null); return { reloj: ctx.hoy() }; });
  add('PUT', '/api/params', ({ user, body }) => { ctx.perm(user, 'configurar'); const p = store.kvGet('params', {}); for (const [k, v] of Object.entries(body)) { if (k === 'comisionCambioModo') { if (!['PERIODO', 'ESTRICTO'].includes(v)) fail('Modo inválido.'); p[k] = v; } else if (k in C.PARAMS_DEFECTO) p[k] = typeof C.PARAMS_DEFECTO[k].valor === 'number' ? Number(v) : v; else fail(`Parámetro desconocido: ${k}.`); } store.kvSet('params', p); ctx.audit(user, 'PARAMETROS', 'config', 'params', JSON.stringify(body)); return ctx.params(); });
  add('POST', '/api/sim', ({ user, body }) => { ctx.perm(user, 'configurar'); ctx.sim.setModo(body.servicio, body.modo); return ctx.sim.config(); });
  add('GET', '/api/bitacora', () => ctx.sim.bitacora());
  add('GET', '/api/auditoria', ({ query }) => store.col('auditoria').all().filter(a => (!query.entidad || a.entidad === query.entidad) && (!query.id || a.entidadId === query.id)).sort((a, b) => b.id.localeCompare(a.id)).slice(0, Number(query.limit) || 300));
  add('GET', '/api/notificaciones', ({ user }) => core.notificaciones(user));
  add('POST', '/api/notificaciones/:id/leer', ({ params }) => { const n = store.col('notificaciones').get(params.id); if (n) { n.leida = true; store.col('notificaciones').put(n); } return n; });

  // Solicitudes
  add('GET', '/api/solicitudes', ({ query }) => sol.listar(query));
  add('POST', '/api/solicitudes', ({ user, body }) => sol.crear(user, body));
  add('GET', '/api/solicitudes/:id', ({ params }) => sol.obtener(params.id));
  add('DELETE', '/api/solicitudes/:id', ({ user, params }) => sol.eliminar(user, params.id));
  add('PUT', '/api/solicitudes/:id/seccion/:sec', ({ user, params, body }) => sol.guardarSeccion(user, params.id, params.sec, body.data, { continuar: !!body.continuar }));
  add('POST', '/api/solicitudes/:id/asegurados', ({ user, params, body }) => sol.agregarAsegurado(user, params.id, body));
  add('POST', '/api/solicitudes/:id/asegurados/cargue', ({ user, params, body }) => sol.cargarAsegurados(user, params.id, body.filas || []));
  add('DELETE', '/api/solicitudes/:id/asegurados/:aid', ({ user, params }) => sol.eliminarAsegurado(user, params.id, params.aid));
  add('POST', '/api/solicitudes/:id/radicar', ({ user, params }) => sol.radicar(user, params.id));
  add('POST', '/api/solicitudes/:id/politicas/:pid/:accion', ({ user, params, body }) => sol.resolverPolitica(user, params.id, params.pid, params.accion, body));
  add('POST', '/api/solicitudes/:id/emitir', ({ user, params }) => sol.emitir(user, params.id));
  add('GET', '/api/registraduria/:tipo/:num', ({ user, params }) => sol.consultarRegistraduria(user, params.tipo, params.num));
  add('GET', '/api/tomadores/:tipo/:num', ({ params }) => pol.buscarTomador(params.tipo, params.num));

  // Pólizas y novedades
  add('GET', '/api/polizas', ({ query }) => pol.listar(query));
  add('GET', '/api/polizas/:id', ({ params }) => pol.detalle(params.id));
  add('GET', '/api/polizas/:id/documento/:tipo', ({ user, params, query }) => pol.documento(user, params.id, params.tipo, query.ref));
  add('POST', '/api/polizas/:id/novedades/:tipo', ({ user, params, body }) => pol.ejecutar(user, params.id, params.tipo, body));
  add('GET', '/api/historico', ({ query }) => pol.historico(query));
  add('GET', '/api/autorizaciones', () => pol.listarAutorizaciones());
  add('POST', '/api/autorizaciones/:id/resolver', ({ user, params, body }) => pol.resolverAutorizacion(user, params.id, body));

  // Facturación y recibos
  add('GET', '/api/polizas/:id/facturacion', ({ params }) => ({ ...fact.estado(params.id), corridas: fact.runs(params.id) }));
  add('POST', '/api/polizas/:id/facturacion/validar', ({ params, body }) => fact.validar(params.id, body));
  add('POST', '/api/polizas/:id/facturar', ({ user, params, body }) => fact.facturar(user, params.id, body));
  add('GET', '/api/polizas/:id/recibos-pendientes', ({ user, params }) => fact.reciboPendientePoliza(user, params.id));
  add('GET', '/api/facturas', ({ query }) => fact.listarFacturas(query));
  add('GET', '/api/facturas/:id', ({ params }) => fact.obtenerFactura(params.id));
  add('GET', '/api/recibos', ({ query }) => fact.listarRecibos(query));
  add('GET', '/api/recibos/:id', ({ user, params }) => fact.obtenerRecibo(user, params.id));
  add('POST', '/api/recibos/:id/pago', ({ user, params, body }) => fact.registrarPago(user, params.id, body));
  add('POST', '/api/recibos/:id/reembolso', ({ user, params }) => fact.registrarReembolso(user, params.id));

  // Escenarios ejecutables
  add('GET', '/api/trazabilidad', () => escenarios.trazabilidad());
  add('GET', '/api/escenarios', () => escenarios.catalogo());
  add('POST', '/api/escenarios/:id/ejecutar', async ({ params }) => escenarios.ejecutar(params.id));
  add('POST', '/api/escenarios/ejecutar-todos', async () => escenarios.ejecutarTodos());
  return R;
}
