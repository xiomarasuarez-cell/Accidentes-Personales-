import { h, GET, POST, card, table, chip, link, run, modal, form, btn } from '../ui.js';

export async function render(el, _p, { rerender }) {
  const m = await GET('/meta'); const lista = await GET('/autorizaciones');
  el.append(h('h1', null, 'Autorizaciones de novedades'), h('p', { class: 'sub' }, 'Novedades que exigen un nivel superior: modificación de gastos (HU300), comisión sobre el límite, inclusiones retroactivas de más de 30 días y ajustes de plan con siniestros en curso (HU387).'),
    h('div', { class: 'note' }, `Usted actúa como ${m.usuario.nombre} · nivel ${m.usuario.nivel}. Solo puede resolver las que alcanzan su nivel y que usted no solicitó.`));
  const resolver = (a, accion) => {
    const f = { observacion: '' }; const fm = form(f);
    modal({ title: `${accion === 'aprobar' ? 'Aprobar' : 'Rechazar'} autorización ${a.id}`, body: h('div', null, h('p', null, a.motivo), fm.area('observacion', 'Observación')), actions: [{ label: 'Cancelar' }, { label: accion === 'aprobar' ? 'Aprobar y aplicar' : 'Rechazar', cls: accion === 'aprobar' ? 'primary' : 'danger', onclick: () => run(async () => { await POST(`/autorizaciones/${a.id}/resolver`, { accion, observacion: f.observacion }); rerender(); }, accion === 'aprobar' ? 'Autorización aprobada y novedad aplicada' : 'Autorización rechazada') }] });
  };
  el.append(card('Solicitudes', table([{ t: 'Id', k: 'id' }, { t: 'Póliza', f: r => link(r.polizaNumero, `#/poliza/${r.polizaId}`) }, { t: 'Tipo', k: 'tipo' }, { t: 'Motivo', k: 'motivo' }, { t: 'Nivel requerido', k: 'nivelRequerido' }, { t: 'Solicitó', k: 'solicitadoPor' }, { t: 'Fecha', k: 'fecha' }, { t: 'Estado', f: r => chip(r.estado) },
    { t: '', f: r => r.estado === 'PENDIENTE' ? h('div', { class: 'rowact' }, btn('Aprobar', () => resolver(r, 'aprobar'), 'primary sm'), btn('Rechazar', () => resolver(r, 'rechazar'), 'sm')) : (r.resueltaPor ? `${r.resueltaPor}${r.observacion ? ' · ' + r.observacion : ''}` : '') }], lista, { empty: 'No hay autorizaciones' })));
}
