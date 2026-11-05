// Facturación: selección de póliza, período, modalidad, pre-validación DIAN, ejecución y consulta (HU577).
import { h, GET, POST, state, card, table, chip, money, link, form, btn, run, modal, toast, kv, clear } from '../ui.js';

export async function render(el, [polizaId], { rerender }) {
  el.append(h('h1', null, 'Facturación'), h('p', { class: 'sub' }, 'Factura electrónica y recibo individual por asegurado (pólizas nominadas) o a nivel póliza (innominadas). Elija la póliza y la modalidad; el sistema valida antes de facturar.'));
  const pols = (await GET('/polizas')).filter(p => p.estado === 'VIGENTE'); const f = { polizaId: polizaId || '' }; const fm = form(f);
  el.append(card('Póliza', h('div', { class: 'toolbar' }, fm.select('polizaId', 'Póliza vigente', pols.map(p => ({ v: p.id, t: `${p.numero} · ${p.producto} · ${p.tomador} (${p.estructura})` })), { vacio: '— Seleccione una póliza —' }), btn('Abrir', () => { if (f.polizaId) location.hash = `#/facturacion/${f.polizaId}`; }, 'primary'))));
  if (!polizaId) { el.append(card('Todas las facturas', await tablaFacturas(await GET('/facturas')))); return; }
  const est = await GET(`/polizas/${polizaId}/facturacion`); const p = await GET(`/polizas/${polizaId}`);
  if (p.estado !== 'VIGENTE') el.append(h('div', { class: 'note bad' }, `La póliza está ${p.estado}: no se factura.`));
  const sel = { modo: 'SIN_NOVEDADES', ids: new Set() }; const res = h('div');
  const cron = card(`Cronograma · póliza ${p.numero} (${est.periodicidad})`, h('div', null, kv([['Estructura', est.estructura], ['Prima de vigencia', money(est.primaVigencia)], ['Siguiente período', est.siguiente ? `${est.siguiente.inicio} → ${est.siguiente.fin}` : 'Vigencia facturada por completo'], ['Novedades pendientes de facturar', est.novedadesPendientes.length]], 4),
    table([{ t: '#', f: c => c.idx + 1 }, { t: 'Período', f: c => `${c.inicio} → ${c.fin}` }, { t: 'Meses', k: 'meses', cls: 'r' }, { t: 'Valor póliza', cls: 'r', f: c => money(c.valorPoliza) }, { t: 'Estado', f: c => chip(c.estado) }], est.cronograma)), { actions: [link('Ver póliza', `#/poliza/${p.id}`)] });
  const modos = { SIN_NOVEDADES: 'Sin novedades (período siguiente para los asegurados al día)', CON_NOVEDADES: 'Con novedades (período siguiente + novedades pendientes)', SOLO_NOVEDADES: 'Solo novedades (no cierra el período)' };
  const params = () => ({ modo: sel.modo, novedadIds: sel.modo === 'SIN_NOVEDADES' ? null : (sel.ids.size ? [...sel.ids] : null) });
  const mostrarPre = v => {
    clear(res); res.append(h('div', { class: `note ${v.ok ? 'ok' : 'bad'}` }, v.ok ? `Validación correcta: ${v.items.length} ítem(s) por ${money(v.total)}.` : 'La pre-validación encontró problemas: no se generará ninguna factura.'),
      v.errores?.length ? table([{ t: 'Asegurado', f: e => e.asegurado }, { t: 'Nombre', f: e => e.nombre || '—' }, { t: 'Campo', f: e => e.campo }, { t: 'Problema', k: 'mensaje' }], v.errores) : null,
      v.items?.length ? table([{ t: 'Asegurado / receptor', f: i => `${i.asegurado.numDoc} · ${i.asegurado.nombre}` }, { t: 'Origen', f: i => chip(i.origen === 'NOVEDAD' ? 'Novedad' : 'Periódica', i.origen === 'NOVEDAD' ? 'warn' : 'info') }, { t: 'Período', f: i => `${i.periodo.inicio} → ${i.periodo.fin}` }, { t: 'Prorrata', f: i => i.prorrata ? `${i.prorrata.dias}/${i.prorrata.total} días` : 'Completo' }, { t: 'Valor neto', cls: 'r', f: i => money(i.neto) }, { t: 'Genera factura', f: i => i.generaFactura ? 'Sí' : 'No (prima cero)' }], v.items) : null);
  };
  const panel = card('Facturar', h('div', null, h('div', { class: 'frm' }, h('div', { class: 'wide' }, ...est.modos.map(k => h('label', { class: 'chk', style: { margin: '4px 0' } }, h('input', { type: 'radio', name: 'modo', value: k, checked: k === sel.modo, onchange: () => { sel.modo = k; dibujarNov(); } }), ' ', modos[k])))),
    h('div', { id: 'nov' }), h('div', { class: 'rowact', style: { margin: '12px 0' } }, btn('Validar antes de facturar', () => run(async () => mostrarPre(await POST(`/polizas/${polizaId}/facturacion/validar`, params()))), ''), btn('Facturar', async () => {
      const r = await run(() => POST(`/polizas/${polizaId}/facturar`, params())); if (!r) return; toast(`${r.facturas.length} factura(s) generada(s)${r.sinFactura.length ? ` · ${r.sinFactura.length} sin factura (prima cero)` : ''}`);
      clear(res); res.append(h('div', { class: 'note ok' }, `Corrida ${r.run.id}: ${r.facturas.length} factura(s) con recibo.`), table([{ t: 'Factura', k: 'factura' }, { t: 'Recibo', f: x => link(x.recibo, `#/recibo/${x.recibo}`) }, { t: 'Receptor', k: 'asegurado' }, { t: 'Total', cls: 'r', f: x => money(x.total) }], r.facturas), r.sinFactura.length ? h('p', { class: 'muted' }, `Sin factura por prima cero: ${r.sinFactura.length}.`) : null, btn('Actualizar pantalla', rerender, 'primary'));
    }, 'primary')), res), { cls: '' });
  const dibujarNov = () => { const c = document.getElementById('nov'); if (!c) return; clear(c); if (sel.modo !== 'SIN_NOVEDADES') c.append(h('div', { class: 'note' }, est.novedadesPendientes.length ? 'Seleccione las novedades a facturar (si no marca ninguna se facturan todas).' : 'No hay novedades pendientes de facturar.'), est.novedadesPendientes.length ? table([{ t: '', f: n => h('input', { type: 'checkbox', style: { width: 'auto' }, onchange: e => (e.target.checked ? sel.ids.add(n.id) : sel.ids.delete(n.id)) }) }, { t: 'Asegurado', f: n => `${n.numDoc} · ${n.nombre}` }, { t: 'Fecha de ingreso', k: 'fechaIngreso' }], est.novedadesPendientes) : null); };
  el.append(cron, p.estado === 'VIGENTE' ? panel : null); dibujarNov();
  el.append(card('Facturas de la póliza', await tablaFacturas(await GET(`/facturas?polizaId=${polizaId}`))));
}
async function tablaFacturas(rows) {
  return table([{ t: 'Documento', k: 'id' }, { t: 'Póliza', f: r => link(r.polizaId, `#/poliza/${r.polizaId}`) }, { t: 'Tipo', f: r => chip(r.tipo) }, { t: 'Origen', k: 'origen' }, { t: 'Período', f: r => `${r.periodo.inicio} → ${r.periodo.fin}` }, { t: 'Receptor', f: r => r.destinatario.nombre }, { t: 'Neto', cls: 'r', f: r => money(r.valorNeto) }, { t: 'Total', cls: 'r', f: r => money(r.total) }, { t: 'Comisión', cls: 'r', f: r => money(r.comisiones.reduce((s, c) => s + c.valor, 0)) },
    { t: 'CUFE (sim.)', f: r => h('code', { class: 'small', title: r.cufe }, r.cufe.slice(0, 12) + '…') }, { t: 'SAP', f: r => r.sap?.pendiente ? chip('Pendiente', 'warn') : chip('OK', 'ok') }, { t: 'Recibo', f: r => link(r.reciboId, `#/recibo/${r.reciboId}`) }], rows.slice(0, 200), { empty: 'Aún no hay facturas' });
}
