// Contexto compartido por los servicios: reloj de la demo, parámetros, auditoría, notificaciones, permisos y secuencias.
import { PARAMS_DEFECTO, PERMISOS, USUARIOS } from './catalog.mjs';
import { createSim } from './sim.mjs';
import { BizError, fmt } from './util.mjs';

export function createCtx(store) {
  const hoy = () => store.kvGet('clock') || fmt(new Date());
  const sim = createSim(store, hoy);
  const params = () => {
    const over = store.kvGet('params', {}); const out = {};
    for (const [k, v] of Object.entries(PARAMS_DEFECTO)) out[k] = { valor: over[k] ?? v.valor, origen: v.origen };
    return out;
  };
  const usuario = id => { const u = USUARIOS.find(x => x.id === id); if (!u) throw new BizError('Usuario de demo inexistente o no seleccionado.', { code: 'NO_AUTENTICADO', status: 401 }); return u; };
  const perm = (user, accion) => {
    if (!PERMISOS[accion]?.includes(user.rol)) throw new BizError(`El rol «${user.rol}» no tiene permiso para esta acción (${accion}). Cambie de usuario en la barra superior.`, { code: 'SIN_PERMISO', status: 403 });
  };
  const audit = (user, accion, entidad, entidadId, detalle, antes = null, despues = null) => {
    const id = 'AU-' + String(store.seq('audit')).padStart(6, '0');
    store.col('auditoria').put({ id, ts: new Date().toISOString(), fecha: hoy(), usuario: user?.nombre || 'sistema', rol: user?.rol || null, accion, entidad, entidadId, detalle, antes, despues });
  };
  const notify = (para, mensaje, ref = null) => {
    const id = 'NT-' + String(store.seq('notif')).padStart(6, '0');
    store.col('notificaciones').put({ id, para, mensaje, ref, fecha: hoy(), leida: false });
  };
  const id = (prefijo, n = 6) => `${prefijo}-${String(store.seq(prefijo)).padStart(n, '0')}`;
  return { store, hoy, sim, params, usuario, perm, audit, notify, id };
}
