// Utilidades de interfaz: DOM, cliente API, formularios enlazados, modales, tablas y formatos. Sin dependencias.
export const state = { meta: null, userId: localStorage.getItem('demoUser') || 'u-suscriptor-avanz', cache: {} };

export function h(tag, props, ...kids) {
  const el = document.createElement(tag); const post = [];
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled' || k === 'readOnly') post.push([k, v]);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = k => { if (k == null || k === false) return; if (Array.isArray(k)) return k.forEach(add); el.append(k.nodeType ? k : document.createTextNode(String(k))); };
  kids.forEach(add); post.forEach(([k, v]) => { el[k] = v; });
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);
export const clear = el => { el.replaceChildren(); return el; };

/* ── API ── */
export async function api(method, path, body) {
  const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', 'X-Demo-User': state.userId || '' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error?.message || `Error ${r.status}`); e.code = j.error?.code; e.detalle = j.error?.detalle; e.status = r.status; throw e; }
  return j;
}
export const GET = p => api('GET', p), POST = (p, b = {}) => api('POST', p, b), PUT = (p, b = {}) => api('PUT', p, b), DEL = p => api('DELETE', p);

/* ── formatos ── */
export const money = v => (v == null || v === '' ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(v));
export const date = v => v || '—';
export const pct = v => (v == null ? '—' : `${v} %`);
const ESTADO_CLASE = { VIGENTE: 'ok', ANULADA: 'bad', EMITIDA: 'ok', RADICADA: 'info', EN_ESTUDIO: 'info', BORRADOR: 'muted', RECHAZADA: 'bad', PENDIENTE: 'warn', PARCIAL: 'info', LEGALIZADO: 'ok', EN_MORA: 'bad', ANULADO: 'bad', CRUZADO: 'muted', PENDIENTE_REEMBOLSO: 'warn', REEMBOLSADO: 'ok', EMITIDA_: 'ok',
  Pendiente: 'warn', Autorizada: 'ok', Rechazada: 'bad', APROBADA: 'ok', RECHAZADA_: 'bad', FACTURADO: 'ok', 'Sin recibo': 'muted', 'Pendiente de facturar': 'warn', Cobrado: 'ok', Parcial: 'info', 'En mora': 'bad', Correcto: 'ok', Incorrecto: 'bad', RETIRADO: 'muted', FACTURA: 'info', NOTA_CREDITO: 'warn', AJUSTE: 'info', ok: 'ok', falla: 'bad', timeout: 'bad', Implementada: 'ok', Parcial_: 'info', Pendiente_: 'bad' };
export const chip = (txt, cls) => h('span', { class: `chip ${cls || ESTADO_CLASE[txt] || 'muted'}` }, String(txt).replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase()));
export const badgeReal = (simulado, texto) => h('span', { class: `tag ${simulado ? 'sim' : 'real'}`, title: simulado ? 'Servicio simulado por la demo' : 'Funcionalidad real de la demo' }, texto || (simulado ? 'SIMULADO' : 'REAL'));

/* ── toast / modal ── */
export function toast(msg, tipo = 'ok') {
  let box = $('#toasts'); if (!box) { box = h('div', { id: 'toasts' }); document.body.append(box); }
  const t = h('div', { class: `toast ${tipo}` }, msg); box.append(t); setTimeout(() => t.classList.add('out'), 3800); setTimeout(() => t.remove(), 4300);
}
export function modal({ title, body, actions = [], wide = false, onClose }) {
  const back = h('div', { class: 'backdrop', onclick: e => { if (e.target === back) close(); } });
  const close = () => { back.remove(); onClose?.(); };
  const box = h('div', { class: `modal ${wide ? 'wide' : ''}`, role: 'dialog', 'aria-modal': 'true' },
    h('header', null, h('h3', null, title), h('button', { class: 'x', 'aria-label': 'Cerrar', onclick: close }, '×')), h('div', { class: 'mbody' }, body),
    actions.length ? h('footer', null, actions.map(a => h('button', { class: `btn ${a.cls || ''}`, onclick: async e => { if (a.cerrar === false) return a.onclick?.(e, close); await a.onclick?.(e, close); if (a.cerrar !== false) close(); } }, a.label))) : null);
  back.append(box); document.body.append(back); box.querySelector('input,select,textarea,button.btn')?.focus?.();
  return { close, box };
}
export function showError(e, titulo = 'No se pudo completar la acción') {
  const det = Array.isArray(e.detalle) ? e.detalle : [];
  modal({ title: titulo, body: h('div', { class: 'errbox' }, h('p', { class: 'errmsg' }, e.message), e.code ? h('p', { class: 'muted small' }, `Código: ${e.code}`) : null,
    det.length ? h('ul', null, det.map(d => h('li', null, d.seccion ? h('strong', null, `${d.seccion}: `) : null, d.campo && !d.seccion ? h('code', null, `${d.campo} · `) : null, d.mensaje || d.politica || JSON.stringify(d)))) : null), actions: [{ label: 'Entendido', cls: 'primary' }] });
}
export async function run(fn, okMsg) { try { const r = await fn(); if (okMsg) toast(okMsg); return r; } catch (e) { showError(e); return undefined; } }

/* ── formularios enlazados a un objeto ── */
export const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
export function setPath(o, p, v) { const ks = p.split('.'); let a = o; ks.slice(0, -1).forEach((k, i) => { if (a[k] == null) a[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[k]; }); a[ks.at(-1)] = v; }
export function form(obj, { onChange } = {}) {
  const wrap = (label, input, { hint, req, cls = '' } = {}) => h('label', { class: `fld ${cls}` }, h('span', { class: 'lbl' }, label, req ? h('b', { class: 'req', title: 'Obligatorio' }, ' *') : null), input, hint ? h('small', { class: 'hint' }, hint) : null);
  const upd = (p, v) => { setPath(obj, p, v); onChange?.(p, v); };
  return {
    obj,
    text: (p, label, o = {}) => wrap(label, h('input', { type: o.type || 'text', value: getPath(obj, p) ?? '', maxLength: o.max, placeholder: o.ph, disabled: o.disabled, 'data-path': p, oninput: e => upd(p, e.target.value) }), o),
    num: (p, label, o = {}) => wrap(label, h('input', { type: 'number', step: o.step || 'any', min: o.min, value: getPath(obj, p) ?? '', disabled: o.disabled, 'data-path': p, oninput: e => upd(p, e.target.value === '' ? null : Number(e.target.value)) }), o),
    date: (p, label, o = {}) => wrap(label, h('input', { type: 'date', value: getPath(obj, p) ?? '', disabled: o.disabled, 'data-path': p, oninput: e => upd(p, e.target.value || null) }), o),
    area: (p, label, o = {}) => wrap(label, h('textarea', { rows: o.rows || 3, value: getPath(obj, p) ?? '', disabled: o.disabled, 'data-path': p, oninput: e => upd(p, e.target.value) }), o),
    select: (p, label, opts, o = {}) => wrap(label, h('select', { 'data-path': p, disabled: o.disabled, onchange: e => upd(p, e.target.value === '' ? null : (o.number ? Number(e.target.value) : e.target.value)), value: getPath(obj, p) ?? '' },
      h('option', { value: '' }, o.vacio ?? '— Seleccione —'), opts.map(x => (typeof x === 'object' ? h('option', { value: x.v }, x.t) : h('option', { value: x }, x)))), o),
    bool: (p, label, o = {}) => wrap(label, h('select', { 'data-path': p, disabled: o.disabled, onchange: e => upd(p, e.target.value === '' ? null : e.target.value === 'true'), value: getPath(obj, p) == null ? '' : String(getPath(obj, p)) }, h('option', { value: '' }, '— Seleccione —'), h('option', { value: 'true' }, 'Sí'), h('option', { value: 'false' }, 'No')), o),
    check: (p, label, o = {}) => h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!getPath(obj, p), disabled: o.disabled, onchange: e => upd(p, e.target.checked) }), ' ', label),
  };
}
export function marcarErrores(root, detalle = []) {
  root.querySelectorAll('.fld.err').forEach(f => { f.classList.remove('err'); f.querySelector('.emsg')?.remove(); });
  for (const d of detalle) { const campo = (d.campo || '').replace(/^planes\.\d+\./, ''); const inp = root.querySelector(`[data-path="${d.campo}"]`) || root.querySelector(`[data-path="${campo}"]`); const f = inp?.closest('.fld'); if (f) { f.classList.add('err'); f.append(h('small', { class: 'emsg' }, d.mensaje)); } }
}

/* ── tabla ── */
export function table(cols, rows, { onRow, empty = 'Sin registros', cls = '' } = {}) {
  if (!rows?.length) return h('div', { class: 'empty' }, empty);
  return h('div', { class: 'tablewrap' }, h('table', { class: `tbl ${cls}` }, h('thead', null, h('tr', null, cols.map(c => h('th', { class: c.cls || '' }, c.t)))),
    h('tbody', null, rows.map(r => h('tr', { class: onRow ? 'click' : '', onclick: onRow ? () => onRow(r) : null }, cols.map(c => { const v = c.f ? c.f(r) : r[c.k]; return h('td', { class: c.cls || '' }, v == null || v === '' ? '—' : v); }))))));
}
export const kv = (pairs, cols = 2) => h('dl', { class: 'kv', style: { gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` } }, pairs.filter(Boolean).map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v == null || v === '' ? '—' : v))));
export const card = (title, body, { actions, cls = '' } = {}) => h('section', { class: `card ${cls}` }, title || actions ? h('header', null, h('h3', null, title || ''), actions ? h('div', { class: 'acts' }, actions) : null) : null, h('div', { class: 'cbody' }, body));
export const btn = (label, onclick, cls = '') => h('button', { class: `btn ${cls}`, onclick }, label);
export const link = (txt, hash) => h('a', { href: hash, class: 'lnk' }, txt);
export const tabs = (items, activo, onSel) => h('nav', { class: 'tabs', role: 'tablist' }, items.map(i => h('button', { class: `tab ${i.id === activo ? 'on' : ''}`, role: 'tab', onclick: () => onSel(i.id) }, i.t, i.badge != null ? h('span', { class: `bdg ${i.badgeCls || ''}` }, i.badge) : null)));
export const nombrePersona = t => (!t ? '' : t.tipoPersona === 'Natural' ? [t.primerNombre, t.primerApellido].filter(Boolean).join(' ') : t.razonSocial || '');
export function csvDownload(nombre, filas) {
  const esc = v => `"${String(v ?? '').replaceAll('"', '""')}"`; const txt = '﻿' + filas.map(f => f.map(esc).join(';')).join('\n');
  const a = h('a', { href: URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })), download: nombre }); document.body.append(a); a.click(); a.remove();
}
export function imprimir(titulo, nodo) {
  const w = window.open('', '_blank', 'width=900,height=1000'); if (!w) return toast('El navegador bloqueó la ventana de impresión.', 'bad');
  w.document.write(`<html><head><title>${titulo}</title><style>body{font:13px system-ui;margin:24px;color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 6px;text-align:left}h1,h2,h3{margin:.4em 0}.kv{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 16px}dt{font-size:11px;color:#555}dd{margin:0 0 6px}.cut{border-top:2px dashed #888;margin:18px 0;text-align:center;color:#888}</style></head><body>${nodo.innerHTML}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}
