import { h, GET, POST, DEL, state, card, table, chip, money, link, form, btn, run, modal, toast } from '../ui.js';

export async function render(el) {
  const m = state.meta; const filtro = { estado: '' }; const fm = form(filtro); const cont = h('div');
  const cargar = async () => {
    const rows = await GET('/solicitudes' + (filtro.estado ? `?estado=${filtro.estado}` : ''));
    cont.replaceChildren(table([{ t: 'Solicitud', f: r => link(r.id, `#/solicitud/${r.id}`) }, { t: 'Estado', f: r => chip(r.estado) }, { t: 'Radicado', k: 'codigoRadicacion' }, { t: 'Producto', k: 'producto' }, { t: 'Tomador', k: 'tomador' }, { t: 'Sucursal', k: 'sucursal' }, { t: 'Prima de vigencia', cls: 'r', f: r => money(r.prima) },
      { t: 'Políticas pend.', cls: 'c', f: r => r.politicasPendientes ? chip(r.politicasPendientes, 'warn') : '—' }, { t: 'Póliza', f: r => r.polizaId ? link(r.polizaId, `#/poliza/${r.polizaId}`) : '—' }, { t: 'Fecha', k: 'fecha' }], rows, { onRow: r => (location.hash = `#/solicitud/${r.id}`), empty: 'No hay solicitudes. Cree una con «Nueva solicitud» o cargue los datos de prueba en Configuración.' }));
  };
  const nueva = () => {
    const f = { productoId: '' }; const fo = form(f);
    modal({ title: 'Nueva solicitud de póliza', body: h('div', null, h('p', { class: 'muted' }, 'La solicitud se crea en estado Guardado/Borrador y se completa por secciones.'), fo.select('productoId', 'Producto', m.productos.map(p => ({ v: p.id, t: p.nombre })), { req: true })),
      actions: [{ label: 'Cancelar' }, { label: 'Crear solicitud', cls: 'primary', cerrar: false, onclick: async (e, close) => { if (!f.productoId) return toast('Seleccione un producto', 'warn'); const s = await run(() => POST('/solicitudes', { productoId: f.productoId })); if (s) { close(); location.hash = `#/solicitud/${s.id}`; } } }] });
  };
  el.append(h('h1', null, 'Solicitudes de póliza'), h('p', { class: 'sub' }, 'Registro de la solicitud, estudio técnico (suscripción), autorizaciones y emisión.'),
    card('Consulta', h('div', null, h('div', { class: 'toolbar' }, fm.select('estado', 'Estado', ['BORRADOR', 'RADICADA', 'EN_ESTUDIO', 'EMITIDA', 'RECHAZADA'], { vacio: 'Todos' }), btn('Filtrar', cargar), btn('Nueva solicitud', nueva, 'primary')), cont)));
  await cargar();
}
