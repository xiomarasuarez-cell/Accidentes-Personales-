// Shell de la aplicación: navegación, selector de usuario, notificaciones y enrutador por hash.
import { h, $, clear, state, GET, POST, modal, showError, toast, chip } from './ui.js';

const NAV = [
  ['Operación', [['#/', 'Panel', 'dash'], ['#/solicitudes', 'Solicitudes de póliza', 'sol'], ['#/polizas', 'Pólizas', 'pol'], ['#/novedades', 'Histórico de novedades', 'nov'], ['#/facturacion', 'Facturación', 'fac'], ['#/recibos', 'Recibos y recaudo', 'rec'], ['#/autorizaciones', 'Autorizaciones', 'aut']]],
  ['Control y transparencia', [['#/escenarios', 'Escenarios ejecutables', 'esc'], ['#/trazabilidad', 'Trazabilidad y brechas', 'tra'], ['#/auditoria', 'Auditoría', 'aud'], ['#/integraciones', 'Integraciones (simuladas)', 'int'], ['#/config', 'Configuración', 'cfg']]],
];
const ROUTES = [
  [/^#\/?$/, 'dashboard'], [/^#\/solicitudes$/, 'solicitudes'], [/^#\/solicitud\/(.+)$/, 'solicitud'], [/^#\/polizas$/, 'polizas'], [/^#\/poliza\/([^/]+)(?:\/(\w+))?$/, 'poliza'], [/^#\/novedades$/, 'historico'],
  [/^#\/facturacion(?:\/(.+))?$/, 'facturacion'], [/^#\/recibos$/, 'recibos'], [/^#\/recibo\/(.+)$/, 'recibo'], [/^#\/autorizaciones$/, 'autorizaciones'], [/^#\/auditoria$/, 'auditoria'],
  [/^#\/integraciones$/, 'integraciones'], [/^#\/escenarios$/, 'escenarios'], [/^#\/trazabilidad$/, 'trazabilidad'], [/^#\/config$/, 'config'],
];
const TITULOS = { dashboard: 'Panel de operaciones', solicitudes: 'Solicitudes de póliza', solicitud: 'Solicitud de póliza', polizas: 'Pólizas', poliza: 'Póliza', historico: 'Histórico de novedades', facturacion: 'Facturación', recibos: 'Recibos y recaudo', recibo: 'Recibo de pago', autorizaciones: 'Autorizaciones', auditoria: 'Auditoría y trazabilidad', integraciones: 'Integraciones simuladas', escenarios: 'Escenarios ejecutables', trazabilidad: 'Trazabilidad, reglas y brechas', config: 'Configuración y datos de prueba' };

export async function refreshShell() {
  state.meta = await GET('/meta'); const dash = await GET('/dashboard'); state.dash = dash; const user = state.meta.usuarios.find(u => u.id === state.userId) || state.meta.usuarios[0]; state.userId = user.id; state.user = user;
  state.notifs = await GET('/notificaciones').catch(() => []);
  renderSide(); renderTop(); renderBanner();
}
function renderSide() {
  const side = clear($('#side')); const cur = location.hash || '#/';
  side.append(h('div', { class: 'logo' }, h('i', null, 'P'), h('div', null, h('b', null, 'Positiva Core'), h('small', null, 'Accidentes Personales'))));
  for (const [grupo, items] of NAV) {
    side.append(h('h4', null, grupo));
    for (const [href, txt, id] of items) {
      const on = href === '#/' ? /^#\/?$/.test(cur) : cur.startsWith(href) || (id === 'sol' && cur.startsWith('#/solicitud')) || (id === 'pol' && cur.startsWith('#/poliza')) || (id === 'rec' && cur.startsWith('#/recibo'));
      const n = id === 'aut' ? state.dash?.autorizacionesPendientes : id === 'sol' ? state.dash?.solicitudes.politicasPendientes : id === 'fac' ? state.dash?.porFacturar : 0;
      side.append(h('a', { href, class: on ? 'on' : '' }, h('span', null, txt), n ? h('span', { class: 'n', title: 'Pendientes' }, n) : null));
    }
  }
}
function renderTop() {
  const top = clear($('#top')); const u = state.user;
  const sel = h('select', { 'aria-label': 'Usuario de demostración', onchange: async e => { state.userId = e.target.value; localStorage.setItem('demoUser', state.userId); await refreshShell(); route(); toast(`Ahora actúa como ${state.user.nombre} (${state.user.rol}, nivel ${state.user.nivel}).`); } },
    state.meta.usuarios.map(x => h('option', { value: x.id, selected: x.id === u.id }, `${x.nombre} · ${x.rol}${x.nivel && x.nivel !== 'Consulta' ? ' · ' + x.nivel : ''}`)));
  top.append(h('div', { class: 'crumb', id: 'crumb' }, ''), 
    h('span', { class: 'pill', title: state.meta.relojSimulado ? 'Reloj simulado (Configuración)' : 'Fecha real del sistema' }, `${state.meta.relojSimulado ? '⏱ ' : '📅 '}${state.meta.reloj}`),
    h('button', { class: 'bell', 'aria-label': 'Notificaciones', onclick: verNotifs }, 'Notificaciones', state.notifs.filter(n => !n.leida).length ? h('b', null, state.notifs.filter(n => !n.leida).length) : null), sel);
}
function renderBanner() {
  const b = clear($('#banner')); const caidos = Object.entries(state.meta.sim.config).filter(([, m]) => m !== 'ok');
  if (caidos.length) b.append(`⚠ Servicios simulados con falla activa: ${caidos.map(([s, m]) => `${s} (${m})`).join(', ')}. Se restablecen en Integraciones.`);
}
function verNotifs() {
  const lista = state.notifs;
  modal({ title: 'Notificaciones', body: lista.length ? h('ul', { class: 'timeline' }, lista.slice(0, 40).map((n, i) => h('li', { class: i === 0 ? 'first' : '' }, h('div', { class: n.leida ? 'muted' : '' }, n.mensaje), h('small', { class: 'muted' }, n.fecha)))) : h('div', { class: 'empty' }, 'Sin notificaciones para este usuario.'),
    actions: [{ label: 'Marcar como leídas', onclick: async () => { for (const n of lista.filter(x => !x.leida)) await POST(`/notificaciones/${n.id}/leer`); await refreshShell(); } }, { label: 'Cerrar', cls: 'primary' }] });
}

let seq = 0;
async function route() {
  const my = ++seq; const hash = location.hash || '#/'; const view = $('#view'); let nombre = 'dashboard', params = [];
  for (const [re, n] of ROUTES) { const m = hash.match(re); if (m) { nombre = n; params = m.slice(1); break; } }
  try { await refreshShell(); } catch (e) { return showError(e, 'No se pudo conectar con el servidor de la demo'); }
  const crumb = $('#crumb'); if (crumb) crumb.textContent = TITULOS[nombre] || '';
  clear(view).append(h('p', { class: 'muted' }, 'Cargando…'));
  try {
    const mod = await import(`./views/${nombre}.js`); if (my !== seq) return;
    clear(view); await mod.render(view, params, { refreshShell, rerender: route });
  } catch (e) { console.error(e); clear(view).append(h('div', { class: 'note bad' }, `Error al mostrar la vista: ${e.message}`)); }
  view.focus({ preventScroll: true });
}
window.addEventListener('hashchange', route);
route();
