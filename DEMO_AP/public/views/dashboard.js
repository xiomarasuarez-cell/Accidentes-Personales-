import { h, GET, POST, card, chip, money, table, link, btn, run } from '../ui.js';

export async function render(el, _p, { rerender }) {
  const d = await GET('/dashboard'); const sols = await GET('/solicitudes'); const pols = await GET('/polizas'); const aud = await GET('/auditoria?limit=8'); const auts = (await GET('/autorizaciones')).filter(a => a.estado === 'PENDIENTE');
  el.append(h('h1', null, 'Accidentes Personales · de la emisión a la facturación'), h('p', { class: 'sub' }, 'Recorra el proceso completo: solicitud → estudio técnico → emisión → administración de la póliza (novedades) → facturación → recibos.'));
  if (!d.solicitudes.total && !d.polizas.total) el.append(h('div', { class: 'note sim' }, h('b', null, 'La demo está vacía. '), 'Cargue datos de prueba para ver pólizas, solicitudes, facturas y recibos, o cree una solicitud desde cero. ', btn('Cargar datos de prueba', () => run(async () => { await POST('/seed'); rerender(); }, 'Datos de prueba cargados'), 'primary sm')));
  el.append(h('div', { class: 'flow' },
    h('div', { class: 'node' }, h('b', null, '1 · Solicitudes'), h('div', { class: 'n' }, d.solicitudes.total), h('small', { class: 'muted' }, `${d.solicitudes.borrador} borrador · ${d.solicitudes.enEstudio} en estudio · ${d.solicitudes.rechazadas} rechazadas`)),
    h('div', { class: 'node' }, h('b', null, '2 · Emisión'), h('div', { class: 'n' }, d.polizas.vigentes), h('small', { class: 'muted' }, `pólizas vigentes · prima ${money(d.polizas.primaVigente)}`)),
    h('div', { class: 'node' }, h('b', null, '3 · Administración'), h('div', { class: 'n' }, d.autorizacionesPendientes), h('small', { class: 'muted' }, `autorizaciones pendientes · ${d.polizas.anuladas} pólizas anuladas`)),
    h('div', { class: 'node' }, h('b', null, '4 · Facturación'), h('div', { class: 'n' }, d.facturacion.facturas), h('small', { class: 'muted' }, `facturas · ${d.facturacion.notasCredito} notas crédito · ${d.facturacion.ajustes} ajustes · ${d.porFacturar} pólizas por facturar`)),
    h('div', { class: 'node' }, h('b', null, '5 · Recaudo'), h('div', { class: 'n' }, d.recibos.pendiente + d.recibos.parcial + d.recibos.enMora), h('small', { class: 'muted' }, `por cobrar ${money(d.recibos.saldoPendiente)} · ${d.recibos.enMora} en mora`))));
  el.append(h('div', { class: 'grid g2', style: { marginTop: '16px' } },
    card('Solicitudes recientes', table([{ t: 'Solicitud', f: r => link(r.id, `#/solicitud/${r.id}`) }, { t: 'Estado', f: r => chip(r.estado) }, { t: 'Producto', k: 'producto' }, { t: 'Tomador', k: 'tomador' }, { t: 'Prima', cls: 'r', f: r => money(r.prima) }], sols.slice(0, 6), { empty: 'Aún no hay solicitudes' }), { actions: [link('Ver todas', '#/solicitudes')] }),
    card('Pólizas', table([{ t: 'Póliza', f: r => link(r.numero, `#/poliza/${r.id}`) }, { t: 'Estado', f: r => chip(r.estado) }, { t: 'Producto', k: 'producto' }, { t: 'Periodicidad', k: 'periodicidad' }, { t: 'Prima', cls: 'r', f: r => money(r.prima) }], pols.slice(0, 6), { empty: 'Aún no hay pólizas' }), { actions: [link('Ver todas', '#/polizas')] }),
    card('Pendientes de acción', h('div', null,
      d.solicitudes.politicasPendientes ? h('p', null, chip('Pendiente'), ` ${d.solicitudes.politicasPendientes} política(s) de suscripción esperan autorización → `, link('abrir solicitudes', '#/solicitudes')) : null,
      auts.length ? h('p', null, chip('Pendiente'), ` ${auts.length} autorización(es) de novedades → `, link('resolver', '#/autorizaciones')) : null,
      d.porFacturar ? h('p', null, chip('Pendiente'), ` ${d.porFacturar} póliza(s) con período por facturar → `, link('facturar', '#/facturacion')) : null,
      d.recibos.enMora ? h('p', null, chip('En mora'), ` ${d.recibos.enMora} recibo(s) en mora → `, link('ver recibos', '#/recibos')) : null,
      !d.solicitudes.politicasPendientes && !auts.length && !d.porFacturar && !d.recibos.enMora ? h('p', { class: 'muted' }, 'Nada pendiente.') : null)),
    card('Actividad reciente (auditoría)', aud.length ? h('ul', { class: 'timeline' }, aud.map((a, i) => h('li', { class: i === 0 ? 'first' : '' }, h('b', null, a.accion.replaceAll('_', ' ').toLowerCase()), ' · ', a.detalle, h('br'), h('small', { class: 'muted' }, `${a.usuario} · ${a.fecha}`)))) : h('div', { class: 'empty' }, 'Sin actividad'), { actions: [link('Auditoría completa', '#/auditoria')] })));
  el.append(card('¿Qué es real y qué es simulado?', h('div', { class: 'grid g2' },
    h('div', null, h('p', null, h('span', { class: 'tag real' }, 'REAL'), ' Reglas de negocio de las 15 HU de AP, cálculo de primas y valores asegurados, políticas de suscripción, estados, carátulas versionadas, novedades, facturación por asegurado con prorrata, recibos, notas crédito, auditoría y persistencia en SQLite.')),
    h('div', null, h('p', null, h('span', { class: 'tag sim' }, 'SIMULADO'), ' Registraduría, listas restrictivas/SARLAFT, SGDEA, CRM, facturación electrónica DIAN/OPEN, SAP y Wompi (con bitácora al estilo de integraciones-v2), autenticación (selector de rol) y matriz de permisos. Detalle en ', link('Integraciones', '#/integraciones'), ' y ', link('Trazabilidad', '#/trazabilidad'), '.')))));
}
