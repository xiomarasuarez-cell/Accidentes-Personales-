import { h, GET, card, table, form, btn, modal } from '../ui.js';

export async function render(el) {
  const f = { entidad: '', id: '' }, fm = form(f); const cont = h('div');
  const cargar = async () => {
    const q = new URLSearchParams(); if (f.entidad) q.set('entidad', f.entidad); if (f.id) q.set('id', f.id); const rows = await GET('/auditoria?' + q);
    cont.replaceChildren(table([{ t: 'Id', k: 'id' }, { t: 'Fecha', k: 'fecha' }, { t: 'Usuario', f: r => `${r.usuario}${r.rol ? ' · ' + r.rol : ''}` }, { t: 'Acción', f: r => r.accion.replaceAll('_', ' ') }, { t: 'Entidad', f: r => `${r.entidad} ${r.entidadId}` }, { t: 'Detalle', k: 'detalle' },
      { t: 'Antes → después', f: r => (r.antes || r.despues) ? btn('Ver', () => modal({ title: `${r.id} · ${r.accion}`, wide: true, body: h('div', { class: 'grid g2' }, h('div', null, h('h4', null, 'Antes'), h('pre', null, JSON.stringify(r.antes, null, 2))), h('div', null, h('h4', null, 'Después'), h('pre', null, JSON.stringify(r.despues, null, 2)))), actions: [{ label: 'Cerrar', cls: 'primary' }] }), 'sm') : '—' }], rows, { empty: 'Sin registros' }));
  };
  el.append(h('h1', null, 'Auditoría y trazabilidad'), h('p', { class: 'sub' }, 'Cada operación registra usuario, fecha y, cuando aplica, los datos anterior y nuevo (HU294, 296, 300, 387, 404 y demás novedades).'),
    card('Filtros', h('div', { class: 'toolbar' }, fm.select('entidad', 'Entidad', ['solicitud', 'poliza', 'factura', 'recibo', 'autorizacion', 'config'], { vacio: 'Todas' }), fm.text('id', 'Id de la entidad (p. ej. 1000001)'), btn('Buscar', cargar, 'primary'))), card('Registros', cont));
  await cargar();
}
