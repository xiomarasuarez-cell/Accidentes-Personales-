// Matriz de escenarios ejecutables: cada uno corre contra los servicios reales en una base temporal aislada.
import { h, GET, POST, card, table, chip, form, btn, modal, run, kv, toast, clear, state } from '../ui.js';

const resultados = state.cache.escenarios ||= {};
const ATRIB = [['descripcion', 'Descripción'], ['condiciones', 'Condiciones iniciales'], ['entrada', 'Datos de entrada'], ['esperado', 'Resultado esperado'], ['estadoFinal', 'Estado final'], ['impactoPoliza', 'Impacto sobre la póliza'], ['impactoFacturacion', 'Impacto sobre la facturación'], ['mensajes', 'Mensajes y validaciones que ve el usuario']];

export async function render(el) {
  const cat = await GET('/escenarios'); const f = { grupo: '', q: '' }; const fm = form(f); const cont = h('div'); const resumen = h('div');
  const pintarResumen = () => { const t = cat.length, ok = cat.filter(e => resultados[e.id]?.ok).length, ko = cat.filter(e => resultados[e.id] && !resultados[e.id].ok).length; clear(resumen); resumen.append(h('div', { class: 'grid g4' }, kpi('Escenarios', t), kpi('Ejecutados con éxito', ok, 'ok'), kpi('Con falla', ko, ko ? 'bad' : 'muted'), kpi('Sin ejecutar en esta sesión', t - ok - ko, 'muted'))); };
  const kpi = (l, v, cls) => h('div', { class: 'card kpi' }, h('div', { class: 'v' }, v), h('div', { class: 'l' }, l), cls ? h('div', { class: 's' }, chip(l.includes('éxito') ? 'Correcto' : l.includes('falla') ? 'Incorrecto' : 'Pendiente', cls)) : null);
  const ver = e => {
    const r = resultados[e.id];
    modal({ title: `${e.id} · ${e.nombre}`, wide: true, body: h('div', null, kv([['Grupo', e.grupo], ['Tipo', e.tipo], ['HU', e.hu.join(', ')], ['Reglas', (e.reglas || []).join(', ')]], 4), h('dl', { class: 'kv', style: { gridTemplateColumns: '1fr 1fr', marginTop: '10px' } }, ATRIB.map(([k, t]) => h('div', null, h('dt', null, t), h('dd', null, e[k] || '—')))),
      h('h4', null, 'Flujo de ejecución'), h('ol', null, (e.flujo || []).map(x => h('li', null, x))),
      r ? h('div', null, h('h4', null, `Resultado de la última ejecución · ${r.ok ? 'CORRECTO' : 'FALLÓ'} · ${r.ms} ms`), r.error ? h('div', { class: 'note bad' }, r.error) : null, h('ul', { class: 'stepres' }, r.pasos.map(p => h('li', null, h('span', { class: `m ${p.ok ? 'ok' : 'no'}` }, p.ok ? '✓' : '✗'), h('span', null, p.texto))))) : h('p', { class: 'muted' }, 'Aún no se ha ejecutado en esta sesión.')),
      actions: [{ label: 'Ejecutar de nuevo', cerrar: false, onclick: async (x, close) => { await ejecutar(e); close(); ver(e); } }, { label: 'Cerrar', cls: 'primary' }] });
  };
  const ejecutar = async e => { const r = await run(() => POST(`/escenarios/${e.id}/ejecutar`)); if (r) { resultados[e.id] = r; pintarResumen(); pintar(); toast(`${e.id}: ${r.ok ? 'correcto' : 'FALLÓ'}`, r.ok ? 'ok' : 'bad'); } };
  const pintar = () => {
    const rows = cat.filter(e => (!f.grupo || e.grupo === f.grupo) && (!f.q || `${e.id} ${e.nombre} ${e.hu.join(' ')}`.toLowerCase().includes(f.q.toLowerCase())));
    clear(cont); cont.append(table([{ t: 'ID', k: 'id' }, { t: 'Grupo', k: 'grupo' }, { t: 'Escenario', f: e => h('a', { href: '#', class: 'lnk', onclick: ev => { ev.preventDefault(); ver(e); } }, e.nombre) }, { t: 'Tipo', f: e => chip(e.tipo, 'muted') }, { t: 'HU', f: e => e.hu.join(', ') }, { t: 'Reglas', f: e => (e.reglas || []).length },
      { t: 'Última ejecución', f: e => resultados[e.id] ? chip(resultados[e.id].ok ? 'Correcto' : 'Incorrecto') : chip('Sin ejecutar', 'muted') }, { t: '', f: e => h('div', { class: 'rowact' }, btn('Ejecutar', () => ejecutar(e), 'sm primary'), btn('Ver', () => ver(e), 'sm')) }], rows));
  };
  el.append(h('h1', null, 'Escenarios ejecutables'), h('p', { class: 'sub' }, 'Matriz integral de escenarios: exitosos, alternos, validaciones, rechazos, errores de integración, anulaciones, novedades y facturación. Cada uno corre sobre los mismos servicios que usa la interfaz, en una base temporal aislada (no altera sus datos de demo).'),
    resumen, card('Escenarios', h('div', null, h('div', { class: 'toolbar' }, fm.select('grupo', 'Grupo', ['Emisión', 'Administración', 'Anulación', 'Facturación'], { vacio: 'Todos' }), fm.text('q', 'Buscar'), btn('Filtrar', pintar), btn('Ejecutar todos', async () => { const r = await run(() => POST('/escenarios/ejecutar-todos')); if (r) { for (const x of r.resultados) resultados[x.id] = x; pintarResumen(); pintar(); toast(`${r.exitosos} de ${r.total} escenarios correctos`, r.fallidos ? 'bad' : 'ok'); } }, 'primary')), cont)));
  pintarResumen(); pintar();
}
