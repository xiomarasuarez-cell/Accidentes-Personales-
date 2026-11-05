import { h, GET, card, table, chip, money, link, form, btn, state } from '../ui.js';

export async function render(el) {
  const f = { estado: '', polizaId: '' }; const fm = form(f); const cont = h('div');
  const cargar = async () => {
    const q = new URLSearchParams(); if (f.estado) q.set('estado', f.estado); if (f.polizaId) q.set('polizaId', f.polizaId); const rows = await GET('/recibos?' + q);
    cont.replaceChildren(table([{ t: 'Recibo', f: r => link(r.id, `#/recibo/${r.id}`) }, { t: 'Póliza', f: r => link(r.polizaNumero, `#/poliza/${r.polizaId}`) }, { t: 'Referencia', k: 'referencia' }, { t: 'Vigencia', f: r => `${r.vigenciaDesde} → ${r.vigenciaHasta}` }, { t: 'Pague antes de', k: 'fechaLimite' }, { t: 'Total', cls: 'r', f: r => money(r.total) }, { t: 'Pagado', cls: 'r', f: r => money(r.pagado) }, { t: 'Saldo', cls: 'r', f: r => money(r.saldo) }, { t: 'Estado', f: r => chip(r.estado) }], rows, { onRow: r => (location.hash = `#/recibo/${r.id}`), empty: 'No hay recibos con esos filtros' }));
  };
  const pols = await GET('/polizas');
  el.append(h('h1', null, 'Recibos y recaudo'), h('p', { class: 'sub' }, 'Estados del recibo: Pendiente, Parcial, Legalizado, En mora y Anulado. El pago registrado aquí es una simulación mínima de Recaudo y Cartera para demostrar los estados.'),
    card('Consulta', h('div', null, h('div', { class: 'toolbar' }, fm.select('estado', 'Estado', ['PENDIENTE', 'PARCIAL', 'LEGALIZADO', 'EN_MORA', 'ANULADO', 'CRUZADO', 'PENDIENTE_REEMBOLSO', 'REEMBOLSADO'], { vacio: 'Todos' }), fm.select('polizaId', 'Póliza', pols.map(p => ({ v: p.id, t: p.numero })), { vacio: 'Todas' }), btn('Buscar', cargar, 'primary')), cont)));
  await cargar();
}
