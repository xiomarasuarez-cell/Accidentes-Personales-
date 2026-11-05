// Editor de amparo reutilizable (ajuste de planes). Mismos campos y condicionales que HU647.
import { h, state, form, clear, modal } from '../ui.js';

const clon = o => JSON.parse(JSON.stringify(o ?? null));

export function amparoModal(original, { primero = false, radicada = true, onSave }) {
  const m = state.meta; const a = original ? clon(original) : { tipoAmparo: primero ? 'Básico' : 'Adicional', tipoValorAsegurado: 'SUMA_INFORMADA', edadMinIngreso: 18, edadMaxIngreso: 65, edadMaxPermanencia: 70 };
  const cuerpo = h('div'); let fm;
  const dib = () => {
    clear(cuerpo); const cat = m.amparos.find(x => x.cod === a.cod);
    cuerpo.append(h('div', { class: 'note' }, 'Edades por defecto de prueba (18 / 65 / 70): la tabla «Edades por amparo y producto» no estaba disponible (brecha G-02).'), h('div', { class: 'frm' },
      fm.select('cod', 'Amparo', m.amparos.filter(x => !x.inh || x.cod === a.cod).map(x => ({ v: x.cod, t: `${x.cod} · ${x.nombre}${x.inh ? ' (inhabilitado)' : ''}` })), { req: true, disabled: !!original }), fm.select('tipoAmparo', 'Tipo de amparo', m.tiposAmparo, { req: true }),
      a.tipoAmparo === 'Asistencia' ? fm.select('proveedor', 'Proveedor de la asistencia', m.proveedores, { req: true }) : null,
      fm.select('tipoValorAsegurado', 'Tipo de valor asegurado', [{ v: 'SUMA_INFORMADA', t: 'Suma informada' }, { v: 'N_SMMLV', t: 'N° de SMMLV' }, { v: 'MULTIPLO_SUELDO', t: 'Múltiplo de sueldo' }], { req: true }),
      a.tipoValorAsegurado === 'SUMA_INFORMADA' ? fm.num('valorAseguradoIndividual', 'Valor asegurado individual', { req: true }) : null,
      a.tipoValorAsegurado !== 'SUMA_INFORMADA' ? fm.num('factorMultiplicador', 'Factor multiplicador', { req: true }) : null, a.tipoValorAsegurado === 'MULTIPLO_SUELDO' ? fm.num('salarioPromedio', 'Salario promedio', { req: true }) : null,
      fm.num('edadMinIngreso', 'Edad mínima de ingreso', { req: true }), fm.num('edadMaxIngreso', 'Edad máxima de ingreso', { req: true }), fm.num('edadMaxPermanencia', 'Edad máxima de permanencia', { req: true }),
      fm.num('primaComercial', 'Prima comercial', { hint: 'Excluyente con la tasa' }), fm.num('tasaComercial', 'Tasa comercial (por mil)', { hint: 'Supuesto S-01' }),
      cat?.restablece ? fm.select('limiteValorAsegurado', 'Límite de valor asegurado', ['Valor asegurado', 'Restablecimiento']) : null,
      cat?.restablece && radicada ? fm.select('restablecimiento.modo', 'Restablecimiento', [{ v: 'SIN', t: 'Sin restablecimiento' }, { v: 'N_EVENTOS', t: 'Limitado a n eventos' }]) : null, a.restablecimiento?.modo === 'N_EVENTOS' ? fm.num('restablecimiento.n', 'Número de eventos') : null,
      fm.select('carencia', 'Carencia', ['No aplica', 'Aplica']), a.carencia === 'Aplica' ? fm.num('diasCarencia', 'Días de carencia', { req: true }) : null,
      fm.num('periodicidadCobertura', 'Periodicidad de cobertura'), fm.select('unidadPeriodicidad', 'Unidad de la periodicidad', ['Días', 'Meses', 'No aplica']),
      fm.select('deducible', 'Deducible', ['No aplica', 'Aplica']), a.deducible === 'Aplica' ? [fm.select('unidadDeducible', 'Unidad del deducible', ['Días', 'Meses', 'Valor'], { req: true }), fm.num('valorDeducible', 'Valor del deducible', { req: true })] : null));
  };
  fm = form(a, { onChange: p => { if (['tipoAmparo', 'tipoValorAsegurado', 'cod', 'carencia', 'deducible', 'restablecimiento.modo'].includes(p)) dib(); } }); dib();
  modal({ title: original ? 'Editar amparo' : 'Agregar amparo', body: cuerpo, wide: true, actions: [{ label: 'Cancelar' }, { label: 'Aceptar', cls: 'primary', onclick: () => onSave(a) }] });
}
