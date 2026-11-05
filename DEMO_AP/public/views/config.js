import { h, GET, POST, PUT, card, form, run, table, btn, modal } from '../ui.js';

export async function render(el, _p, { rerender, refreshShell }) {
  const m = await GET('/meta'); const admin = m.usuario?.rol === 'Administrador';
  el.append(h('h1', null, 'Configuración y datos de prueba'), h('p', { class: 'sub' }, 'Parámetros, reloj de la demo y carga de datos. Cambiar parámetros requiere el usuario «Administrador demo».'));
  el.append(card('Datos de prueba', h('div', { class: 'rowact' },
    btn('Reiniciar y cargar datos de prueba', () => modal({ title: 'Reiniciar la demo', body: h('p', null, 'Se borrarán TODAS las solicitudes, pólizas, facturas, recibos y auditoría de la demo y se cargará un conjunto de ejemplo.'), actions: [{ label: 'Cancelar' }, { label: 'Reiniciar y cargar', cls: 'danger', onclick: () => run(async () => { await POST('/seed'); rerender(); }, 'Datos de prueba cargados') }] }), 'primary'),
    btn('Reiniciar vacía', () => modal({ title: 'Vaciar la demo', body: h('p', null, 'Se borrarán todos los datos.'), actions: [{ label: 'Cancelar' }, { label: 'Vaciar', cls: 'danger', onclick: () => run(async () => { await POST('/reset'); rerender(); }, 'Demo vaciada') }] })))));
  const clk = { fecha: m.relojSimulado ? m.reloj : '' }, fc = form(clk);
  el.append(card('Reloj de la demo', h('div', null, h('p', { class: 'muted' }, 'Permite avanzar el tiempo para mostrar recibos en mora, períodos siguientes, retroactividad, etc. Es una herramienta de demostración: no existe en el sistema real.'), h('div', { class: 'toolbar' }, fc.date('fecha', 'Fecha simulada', { disabled: !admin }),
    btn('Aplicar fecha', () => run(async () => { await POST('/clock', { fecha: clk.fecha || null }); await refreshShell(); rerender(); }, 'Reloj actualizado'), 'primary'), btn('Volver a la fecha real', () => run(async () => { await POST('/clock', { fecha: null }); rerender(); }, 'Fecha real restaurada')), h('span', { class: 'pill' }, `Hoy en la demo: ${m.reloj}`)))));
  const vals = Object.fromEntries(Object.entries(m.params).map(([k, v]) => [k, v.valor]));
  const rows = Object.entries(m.params).map(([k, v]) => ({ k, v, origen: v.origen }));
  const inputs = {};
  el.append(card('Parámetros de negocio', h('div', null, h('div', { class: 'note' }, 'Cada valor indica su procedencia: ', h('b', null, '[DOC]'), ' de las HU, ', h('b', null, '[COD]'), ' del código existente, ', h('b', null, '[TEST]'), ' dato de prueba sin respaldo documental.'),
    table([{ t: 'Parámetro', k: 'k' }, { t: 'Valor', f: r => { const i = h('input', { value: r.v.valor, disabled: !admin, style: { maxWidth: '150px' } }); inputs[r.k] = i; return i; } }, { t: 'Procedencia', f: r => h('span', { class: 'small' }, r.origen) }], rows),
    h('div', { class: 'toolbar', style: { marginTop: '10px' } }, h('div', { class: 'fld' }, h('span', { class: 'lbl' }, 'Cambio de comisión (HU296)'), h('select', { id: 'modo', disabled: !admin, value: m.comisionCambioModo }, h('option', { value: 'PERIODO' }, 'Inicio de un período de facturación (decisión D-04)'), h('option', { value: 'ESTRICTO' }, 'Solo inicio de vigencia/renovación (lectura estricta)'))),
      btn('Guardar parámetros', () => run(async () => { const body = {}; for (const [k, i] of Object.entries(inputs)) if (String(i.value) !== String(vals[k])) body[k] = i.value; body.comisionCambioModo = document.getElementById('modo').value; await PUT('/params', body); rerender(); }, 'Parámetros guardados'), 'primary')))));
}
