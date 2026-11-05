// Histórico de novedades (HU558): filtros, grilla de movimientos y acciones por movimiento.
import { h, GET, state, card, table, chip, link, form, btn, modal, run, kv, toast } from '../ui.js';
import { verDocumento } from './poliza.js';

export async function render(el) {
  const m = state.meta; const f = { numero: '', tomador: '', producto: '', sucursal: '', intermediario: '' }; const fm = form(f); const cont = h('div');
  const cargar = async () => {
    const q = new URLSearchParams(); for (const [k, v] of Object.entries(f)) if (v) q.set(k, v); const rows = await GET('/historico?' + q);
    cont.replaceChildren(table([{ t: 'Póliza', f: r => link(r.numeroPoliza, `#/poliza/${r.polizaId}`) }, { t: 'N.º mov.', k: 'numeroMovimiento', cls: 'c' }, { t: 'Tipo de movimiento', k: 'tipoMovimiento' }, { t: 'Fecha inicial', k: 'fechaInicial' }, { t: 'Fecha final', k: 'fechaFinal' }, { t: 'Fecha de emisión', k: 'fechaEmision' }, { t: 'Usuario', k: 'usuario' }, { t: 'Estado del recibo', f: r => chip(r.estadoRecibo) },
      { t: 'Tomador', k: 'tomador' }, { t: 'Producto', k: 'producto' }, { t: 'Sucursal', k: 'sucursal' }, { t: 'Detalle', f: r => btn('Ver', () => modal({ title: `Movimiento ${r.numeroMovimiento} · ${r.tipoMovimiento}`, wide: true, body: h('div', null, h('p', { class: 'muted' }, 'Detalle del cambio: situación anterior y acciones realizadas.'), h('pre', null, JSON.stringify(r.detalle, null, 2))), actions: [{ label: 'Cerrar', cls: 'primary' }] }), 'sm') },
      { t: 'Acciones', f: r => h('div', { class: 'rowact' }, btn('Carátula', () => run(async () => verDocumento(await GET(`/polizas/${r.polizaId}/documento/caratula?ref=${r.caratulaVersion}`))), 'sm'), btn('Factura/recibo', () => { location.hash = `#/poliza/${r.polizaId}/facturacion`; }, 'sm'), btn('Listado', () => run(async () => verDocumento(await GET(`/polizas/${r.polizaId}/documento/listado?ref=${r.numeroMovimiento}`))), 'sm'),
        btn('Anular movimiento', () => modal({ title: 'Anular movimiento', body: h('div', { class: 'note warn' }, 'La anulación de movimientos tiene su propia HU (HU561), que no estaba disponible: la acción no está implementada (brecha G-11).'), actions: [{ label: 'Entendido', cls: 'primary' }] }), 'sm')) }], rows,
      { empty: 'No hay movimientos con esos filtros.' })); };
  el.append(h('h1', null, 'Histórico de novedades'), h('p', { class: 'sub' }, 'Todos los movimientos de cada póliza, del último al primero (el 1 es la emisión), con el estado del recibo y las acciones por movimiento (HU558, HU446).'),
    card('Filtros', h('div', null, h('div', { class: 'toolbar' }, fm.text('numero', 'Número de póliza'), fm.text('tomador', 'Tomador'), fm.select('producto', 'Producto', m.productos.map(p => ({ v: p.id, t: p.nombre })), { vacio: 'Todos' }), fm.select('sucursal', 'Sucursal', m.sucursales, { vacio: 'Todas' }), fm.select('intermediario', 'Intermediario', m.intermediarios.map(i => ({ v: i.clave, t: `${i.clave} · ${i.nombre}` })), { vacio: 'Todos' }),
      btn('Limpiar', () => { for (const k of Object.keys(f)) f[k] = ''; location.reload(); }), btn('Buscar', cargar, 'primary')), cont)));
  await cargar();
}
