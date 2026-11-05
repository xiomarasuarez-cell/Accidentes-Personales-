import { h, GET, card, table, chip, money, link, form, btn, state } from '../ui.js';

export async function render(el) {
  const f = { estado: '', q: '' }; const fm = form(f); const cont = h('div');
  const cargar = async () => {
    const q = new URLSearchParams(); if (f.estado) q.set('estado', f.estado); if (f.q) q.set('q', f.q); const rows = await GET('/polizas?' + q);
    cont.replaceChildren(table([{ t: 'Póliza', f: r => link(r.numero, `#/poliza/${r.id}`) }, { t: 'Estado', f: r => chip(r.estado) }, { t: 'Producto', k: 'producto' }, { t: 'Tomador', k: 'tomador' }, { t: 'Vigencia', f: r => `${r.vigenciaDesde} → ${r.vigenciaHasta}` }, { t: 'Sucursal', k: 'sucursal' }, { t: 'Estructura', k: 'estructura' }, { t: 'Periodicidad', k: 'periodicidad' },
      { t: 'Prima vigencia', cls: 'r', f: r => money(r.prima) }, { t: 'Mov.', cls: 'c', k: 'movimientos' }], rows, { onRow: r => (location.hash = `#/poliza/${r.id}`), empty: 'No hay pólizas. Emita una desde una solicitud o cargue los datos de prueba (Configuración).' }));
  };
  el.append(h('h1', null, 'Pólizas emitidas'), h('p', { class: 'sub' }, 'Consulta, estados, vigencias, documentos y acceso a las novedades y a la facturación.'), card('Consulta', h('div', null, h('div', { class: 'toolbar' }, fm.select('estado', 'Estado', ['VIGENTE', 'ANULADA'], { vacio: 'Todos' }), fm.text('q', 'Buscar por número o tomador'), btn('Buscar', cargar, 'primary')), cont)));
  await cargar();
}
