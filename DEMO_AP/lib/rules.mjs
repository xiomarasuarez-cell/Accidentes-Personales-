// Reglas de negocio puras (sin I/O). Cada regla cita la HU (o el código) de la que proviene.
import {
  PRODUCTOS, AMPAROS, TIPOS_AMPARO, TIPOS_VALOR_ASEGURADO, PERIODICIDADES, TIPOS_DOC, TIPOS_DOC_TOMADOR_NATURAL, PROVEEDORES_ASISTENCIA,
  TIPOS_SOLICITUD, ESTRUCTURAS, RAMAS_INSTITUCION, TIPOS_INSTITUCION, PARENTESCOS, TIPOS_BENEFICIARIO, POLITICAS, rankNivel, SUCURSALES,
} from './catalog.mjs';
import { has, isNum, num, money, isYmd, addMonths, addDays, diffDays, edadA, cmp } from './util.mjs';

// Límite técnico (no es regla de negocio): evita desbordes numéricos. Supuesto A-06.
export const LIMITE_TECNICO = 1e12;
export const producto = id => PRODUCTOS.find(p => p.id === id);
export const amparoCat = cod => AMPAROS.find(a => a.cod === String(cod));
const E = (campo, mensaje) => ({ campo, mensaje });
const P = (params, k) => params[k]?.valor ?? params[k];

/* ───────────────────────── Cálculo de valor asegurado y prima (HU647 / HU577) ───────────────────────── */
export function vigenciaDias(g) { return g?.vigenciaDesde && g?.vigenciaHasta ? diffDays(g.vigenciaDesde, g.vigenciaHasta) : 365; }

export function calcAmparo(a, params, g) {
  let va = 0;
  if (a.tipoValorAsegurado === 'SUMA_INFORMADA') va = num(a.valorAseguradoIndividual) || 0;
  else if (a.tipoValorAsegurado === 'N_SMMLV') va = (num(a.factorMultiplicador) || 0) * P(params, 'smmlv');
  else if (a.tipoValorAsegurado === 'MULTIPLO_SUELDO') va = (num(a.factorMultiplicador) || 0) * (num(a.salarioPromedio) || 0);
  let prima = null, origenPrima = null;
  if (has(a.primaComercial) && num(a.primaComercial) > 0) { prima = num(a.primaComercial); origenPrima = 'prima'; }
  else if (has(a.tasaComercial) && num(a.tasaComercial) > 0) {
    // [HU647] "Si se registra tasa, el sistema debe calcular la prima a partir de la tasa, el valor asegurado y la vigencia".
    // SUPUESTO S-01: la tasa se expresa por mil ("Milaje") → prima = VA × tasa / 1000 (HU577 escribe "VA × Tasa" sin escala).
    // SUPUESTO S-02: tasa anual; si la vigencia es menor de 365 días se proporciona por días/365.
    const dias = vigenciaDias(g);
    prima = money(va * num(a.tasaComercial) / 1000 * (dias < 365 ? dias / 365 : 1)); origenPrima = 'tasa';
  }
  return { valorAsegurado: money(va), prima: prima == null ? null : money(prima), origenPrima };
}

/** Prima efectiva por asegurado (vigencia completa) de un plan. [HU647] suma de amparos prevalece; [HU577] si no hay prima/tasa en amparos, la del plan. */
export function calcPlan(plan, params, g, producto_) {
  const amps = (plan.amparos || []).map(a => ({ ...a, _calc: calcAmparo(a, params, g) }));
  const conPrima = amps.filter(a => a._calc.prima != null);
  const sumaAmparos = money(conPrima.reduce((s, a) => s + a._calc.prima, 0));
  const primaPlan = num(plan.primaPorAsegurado) || 0;
  const usaAmparos = conPrima.length > 0;
  const primaPorAsegurado = usaAmparos ? sumaAmparos : money(primaPlan);
  const individual = (producto_ || {}).modelo === 'individual';
  const n = individual ? 1 : (num(plan.nAsegurados) || 0);
  const vaPorPersona = money(amps.filter(a => a.tipoAmparo !== 'Asistencia').reduce((s, a) => s + a._calc.valorAsegurado, 0));
  return {
    amparos: amps, primaPorAsegurado, primaTotalPlan: money(primaPorAsegurado * n), nAsegurados: n,
    usaAmparos, sumaAmparos, primaPlanRegistrada: money(primaPlan), diferencia: usaAmparos ? money(sumaAmparos - primaPlan) : 0,
    vaPorPersona,
  };
}

export function calcSolicitud(sol, params) {
  const prod = producto(sol.producto?.productoId);
  const planes = (sol.planes || []).map(p => ({ id: p.id, nombre: p.nombre, ...calcPlan(p, params, sol.generales, prod) }));
  return {
    planes,
    primaTotal: money(planes.reduce((s, p) => s + p.primaTotalPlan, 0)),
    vaMaxPorPersona: planes.reduce((m, p) => Math.max(m, p.vaPorPersona), 0),
    nTotalAsegurados: planes.reduce((s, p) => s + p.nAsegurados, 0),
  };
}

/* ───────────────────────── Validaciones por sección ───────────────────────── */
export function validarGenerales(g = {}, prod) {
  const e = [];
  if (!TIPOS_SOLICITUD.includes(g.tipoSolicitud)) e.push(E('tipoSolicitud', 'El tipo de solicitud es obligatorio (Normal o Licitación).'));
  if (!ESTRUCTURAS.includes(g.estructura)) e.push(E('estructura', 'Indique si la póliza es Nominada o Innominada.'));
  if (!isYmd(g.vigenciaDesde)) e.push(E('vigenciaDesde', 'La vigencia desde es obligatoria (AAAA-MM-DD).'));
  if (!isYmd(g.vigenciaHasta)) e.push(E('vigenciaHasta', 'La vigencia hasta es obligatoria (AAAA-MM-DD).'));
  if (isYmd(g.vigenciaDesde) && isYmd(g.vigenciaHasta) && g.vigenciaHasta <= g.vigenciaDesde) e.push(E('vigenciaHasta', 'La vigencia hasta debe ser posterior a la vigencia desde.'));
  if (!PERIODICIDADES[g.periodicidad]) e.push(E('periodicidad', 'La periodicidad de facturación es obligatoria (Anual, Semestral, Trimestral o Mensual).'));
  if (!SUCURSALES.includes(g.sucursal)) e.push(E('sucursal', 'Seleccione la sucursal.'));
  if (typeof g.tieneCoaseguro !== 'boolean') e.push(E('tieneCoaseguro', '¿Tiene coaseguro? es obligatorio.'));
  if (typeof g.afiliadoARL !== 'boolean') e.push(E('afiliadoARL', '¿Cliente afiliado a ARL Positiva? es obligatorio.'));
  if (typeof g.intermediada !== 'boolean') e.push(E('intermediada', 'Indique si la póliza es intermediada o directa.'));
  if (g.plazoPagoDias != null && g.plazoPagoDias !== '' && !(Number(g.plazoPagoDias) > 0 && Number.isInteger(Number(g.plazoPagoDias)))) e.push(E('plazoPagoDias', 'Los días del acuerdo de pago deben ser un entero positivo.'));
  if (g.tipoSolicitud === 'Licitación' && prod && !prod.masivo) e.push(E('tipoSolicitud', 'La licitación aplica solo a productos masivos; se deshabilita para los individuales (HU251).'));
  if (prod && prod.modelo === 'individual' && g.estructura === 'Innominada') e.push(E('estructura', 'Los productos individuales son nominados: tienen un asegurado identificado (supuesto S-03).'));
  return e;
}

export function validarCoaseguro(c, g) {
  if (!g?.tieneCoaseguro) return [];
  const e = [];
  if (!c || !['CEDIDO', 'ACEPTADO'].includes(c.tipo)) return [E('tipo', 'El tipo de coaseguro es obligatorio (ACEPTADO / CEDIDO).')];
  const pl = num(c.participacionLocal);
  if (pl == null || !(pl > 0) || pl > 100) e.push(E('participacionLocal', 'El % de participación local es obligatorio y no puede superar 100 %.'));
  const ac = c.aceptantes || [];
  if (c.tipo === 'CEDIDO') {
    if (!ac.length) e.push(E('aceptantes', 'Debe registrar al menos una aseguradora aceptante.'));
    ac.forEach((a, i) => {
      if (!has(a.aseguradora)) e.push(E(`aceptantes.${i}.aseguradora`, 'La aseguradora aceptante es obligatoria.'));
      const p = num(a.participacion);
      if (p == null || !(p > 0) || p > 100) e.push(E(`aceptantes.${i}.participacion`, 'El % de participación de la aseguradora debe estar entre 0 y 100.'));
      if (!isNum(a.gastos)) e.push(E(`aceptantes.${i}.gastos`, `Defina el % de gastos de ${a.aseguradora || 'la aseguradora'} (puede ser 0 %).`)); // HU188 CC: obligatorio, 0 permitido
      else if (num(a.gastos) < 0 || num(a.gastos) > 100) e.push(E(`aceptantes.${i}.gastos`, 'El % de gastos debe estar entre 0 y 100.'));
    });
    const suma = money((pl || 0) + ac.reduce((s, a) => s + (num(a.participacion) || 0), 0));
    if (ac.length && suma !== 100) e.push(E('participacion', `La suma de participaciones (local + aceptantes) debe ser exactamente 100 %. Suma actual: ${suma} %.`));
  } else {
    if (!has(c.lider?.compania)) e.push(E('lider.compania', 'La compañía líder es obligatoria en coaseguro aceptado.'));
    if (!has(c.lider?.poliza)) e.push(E('lider.poliza', 'El número de póliza de la líder es obligatorio en coaseguro aceptado.'));
    const pLid = num(c.lider?.participacion);
    if (pLid == null || !(pLid > 0) || pLid > 100) e.push(E('lider.participacion', 'El % de participación de la compañía líder es obligatorio (0-100).'));
    if (!isNum(c.gastosAceptado)) e.push(E('gastosAceptado', 'El % de gastos del coaseguro aceptado es obligatorio (valor único para Positiva).'));
    if (pLid != null && pl != null && money(pl + pLid) !== 100 && !ac.length) e.push(E('participacion', `La participación local + líder debe sumar 100 %. Suma actual: ${money(pl + pLid)} %.`));
  }
  return e;
}

export function validarLicitacion(l, g) {
  if (g?.tipoSolicitud !== 'Licitación') return [];
  const e = [];
  if (!isNum(l?.presupuestoAdjudicado) || !(num(l.presupuestoAdjudicado) > 0)) e.push(E('presupuestoAdjudicado', 'El presupuesto adjudicado es obligatorio y debe ser mayor que 0.'));
  if (typeof l?.aplicaEstampillas !== 'boolean') e.push(E('aplicaEstampillas', '¿Aplica estampillas? es obligatorio.'));
  if (l?.aplicaEstampillas === true && (!isNum(l.porcentajeEstampillas) || !(num(l.porcentajeEstampillas) > 0) || num(l.porcentajeEstampillas) > 100)) e.push(E('porcentajeEstampillas', 'El % de estampillas es obligatorio cuando aplica estampillas (0-100).'));
  if (!has(l?.nitUnion) || !/^\d{6,12}(-?\d)?$/.test(String(l.nitUnion).trim())) e.push(E('nitUnion', 'El NIT de la Unión Temporal o Consorcio es obligatorio y debe ser numérico.'));
  if (!has(l?.razonSocial)) e.push(E('razonSocial', 'La razón social es obligatoria.'));
  return e;
}

export function validarTomador(t = {}) {
  const e = [];
  const emailOk = v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || ''));
  if (!['Natural', 'Jurídica'].includes(t.tipoPersona)) return [E('tipoPersona', 'El tipo de persona es obligatorio.')];
  const nat = t.tipoPersona === 'Natural';
  if (nat) {
    if (!TIPOS_DOC_TOMADOR_NATURAL.includes(t.tipoDoc)) e.push(E('tipoDoc', 'Tipo de documento inválido (Cédula de ciudadanía, extranjería o pasaporte).'));
    if (!has(t.numDoc) || String(t.numDoc).length > 10) e.push(E('numDoc', 'El número de documento es obligatorio (máx. 10).'));
    if (!has(t.primerNombre) || String(t.primerNombre).length > 15) e.push(E('primerNombre', 'El primer nombre es obligatorio (máx. 15).'));
    if (!has(t.primerApellido) || String(t.primerApellido).length > 12) e.push(E('primerApellido', 'El primer apellido es obligatorio (máx. 12).'));
    if (!isYmd(t.fechaNacimiento)) e.push(E('fechaNacimiento', 'La fecha de nacimiento es obligatoria.'));
    if (!has(t.telefonoFijo)) e.push(E('telefonoFijo', 'El teléfono fijo es obligatorio.'));
    if (!has(t.telefonoMovil)) e.push(E('telefonoMovil', 'El teléfono móvil es obligatorio.'));
    if (!has(t.cargoActual)) e.push(E('cargoActual', 'El cargo actual es obligatorio.'));
  } else {
    if (t.tipoDoc !== 'NIT') e.push(E('tipoDoc', 'Para persona jurídica el tipo de documento es NIT.'));
    if (!has(t.numDoc) || String(t.numDoc).length > 10) e.push(E('numDoc', 'El NIT es obligatorio (máx. 10).'));
    if (!has(t.razonSocial)) e.push(E('razonSocial', 'La razón social es obligatoria.'));
    if (!has(t.nombreComercial)) e.push(E('nombreComercial', 'El nombre comercial (o sede) es obligatorio.'));
    const r = t.representante || {};
    if (!TIPOS_DOC_TOMADOR_NATURAL.includes(r.tipoDoc)) e.push(E('representante.tipoDoc', 'Tipo de documento del representante legal inválido.'));
    if (!has(r.numDoc)) e.push(E('representante.numDoc', 'El número de documento del representante legal es obligatorio.'));
    if (!has(r.primerNombre)) e.push(E('representante.primerNombre', 'El primer nombre del representante legal es obligatorio.'));
    if (!has(r.primerApellido)) e.push(E('representante.primerApellido', 'El primer apellido del representante legal es obligatorio.'));
    if (!emailOk(t.correoFacturacion)) e.push(E('correoFacturacion', 'El correo para facturación electrónica es obligatorio y debe ser válido.'));
  }
  if (!emailOk(t.correo)) e.push(E('correo', 'El correo electrónico es obligatorio y debe ser válido.'));
  if (!has(t.direccion)) e.push(E('direccion', 'La dirección es obligatoria.'));
  if (!has(t.departamento)) e.push(E('departamento', 'El departamento es obligatorio.'));
  if (!has(t.ciudad)) e.push(E('ciudad', 'La ciudad es obligatoria.'));
  return e;
}

export function validarIntermediacion(im, g, intermediariosCat) {
  if (!g?.intermediada) return [];
  const e = [];
  const lista = im?.intermediarios || [];
  if (!lista.length) return [E('intermediarios', 'Una póliza intermediada requiere al menos un intermediario.')];
  lista.forEach((it, i) => {
    if (!intermediariosCat.find(x => x.clave === it.clave)) e.push(E(`intermediarios.${i}.clave`, 'Clave de intermediario inexistente.'));
    if (!isNum(it.comision) || num(it.comision) < 0 || num(it.comision) > 100) e.push(E(`intermediarios.${i}.comision`, 'El % de comisión debe estar entre 0 y 100.'));
  });
  return e;
}

export function validarAmparo(a, idx, prodId, plan) {
  const e = [], k = f => `amparos.${idx}.${f}`;
  const cat = amparoCat(a.cod);
  if (!cat) e.push(E(k('cod'), 'Amparo inexistente en el catálogo.'));
  else if (cat.inh) e.push(E(k('cod'), `El amparo «${cat.nombre}» está inhabilitado y no puede seleccionarse.`));
  if (!TIPOS_AMPARO.includes(a.tipoAmparo)) e.push(E(k('tipoAmparo'), 'El tipo de amparo es obligatorio (Básico, Adicional o Asistencia).'));
  if (cat?.asist && a.tipoAmparo && a.tipoAmparo !== 'Asistencia') e.push(E(k('tipoAmparo'), 'Los amparos de asistencia deben registrarse con tipo Asistencia.'));
  if (a.tipoAmparo === 'Asistencia' && !PROVEEDORES_ASISTENCIA.includes(a.proveedor)) e.push(E(k('proveedor'), 'Seleccione el proveedor de la asistencia.'));
  for (const f of ['edadMinIngreso', 'edadMaxIngreso', 'edadMaxPermanencia']) {
    if (!isNum(a[f]) || num(a[f]) < 0 || num(a[f]) > 120) e.push(E(k(f), `${{ edadMinIngreso: 'La edad mínima de ingreso', edadMaxIngreso: 'La edad máxima de ingreso', edadMaxPermanencia: 'La edad máxima de permanencia' }[f]} es obligatoria (0-120).`));
  }
  if (isNum(a.edadMinIngreso) && isNum(a.edadMaxIngreso) && num(a.edadMinIngreso) > num(a.edadMaxIngreso)) e.push(E(k('edadMinIngreso'), 'La edad mínima de ingreso no puede superar la máxima.'));
  if (!TIPOS_VALOR_ASEGURADO.includes(a.tipoValorAsegurado)) e.push(E(k('tipoValorAsegurado'), 'El tipo de valor asegurado es obligatorio.'));
  else if (a.tipoValorAsegurado === 'SUMA_INFORMADA') {
    const min = a.tipoAmparo === 'Asistencia' ? 0 : 0.01;     // [HU647] asistencia: se admite VA desde $0 internamente
    if (isNum(a.valorAseguradoIndividual) && num(a.valorAseguradoIndividual) > LIMITE_TECNICO) e.push(E(k('valorAseguradoIndividual'), `El valor asegurado excede el límite técnico de la demo (${LIMITE_TECNICO.toLocaleString('es-CO')}).`)); else if (!isNum(a.valorAseguradoIndividual) || num(a.valorAseguradoIndividual) < min) e.push(E(k('valorAseguradoIndividual'), 'El valor asegurado individual es obligatorio con tipo Suma Informada.'));
  } else {
    if (!isNum(a.factorMultiplicador) || !(num(a.factorMultiplicador) > 0)) e.push(E(k('factorMultiplicador'), 'El factor multiplicador es obligatorio para N° de SMMLV o Múltiplo de Sueldo.'));
    if (a.tipoValorAsegurado === 'MULTIPLO_SUELDO' && (!isNum(a.salarioPromedio) || !(num(a.salarioPromedio) > 0))) e.push(E(k('salarioPromedio'), 'El salario promedio es obligatorio con Múltiplo de Sueldo.'));
  }
  const tienePrima = has(a.primaComercial) && num(a.primaComercial) > 0, tieneTasa = has(a.tasaComercial) && num(a.tasaComercial) > 0;
  if (tienePrima && tieneTasa) e.push(E(k('primaComercial'), 'La prima comercial y la tasa comercial son excluyentes: registre solo una.'));
  if (a.limiteValorAsegurado === 'Restablecimiento' && !cat?.restablece) e.push(E(k('limiteValorAsegurado'), 'Solo los amparos de Gastos Médicos tienen restablecimiento.'));
  if (a.restablecimiento?.modo === 'N_EVENTOS' && !(Number.isInteger(num(a.restablecimiento.n)) && num(a.restablecimiento.n) > 0)) e.push(E(k('restablecimiento'), 'Indique el número de eventos del restablecimiento.'));
  if (a.carencia === 'Aplica' && !(Number.isInteger(num(a.diasCarencia)) && num(a.diasCarencia) > 0)) e.push(E(k('diasCarencia'), 'Con carencia «Aplica» los días de carencia son obligatorios.'));
  if (a.deducible === 'Aplica') {
    if (!['Días', 'Meses', 'Valor'].includes(a.unidadDeducible)) e.push(E(k('unidadDeducible'), 'Seleccione la unidad del deducible (Días, Meses o Valor).'));
    if (!isNum(a.valorDeducible) || !(num(a.valorDeducible) > 0)) e.push(E(k('valorDeducible'), 'Con deducible «Aplica» el valor del deducible es obligatorio.'));
  }
  if (isNum(a.periodicidadCobertura) && num(a.periodicidadCobertura) > 0 && !['Días', 'Meses'].includes(a.unidadPeriodicidad)) e.push(E(k('unidadPeriodicidad'), 'Seleccione la unidad de medida de la periodicidad de cobertura.'));
  return e;
}

export function validarProductos(sol) {
  const e = [], pr = sol.producto || {}, prod = producto(pr.productoId);
  if (!prod) return [E('productoId', 'Seleccione el producto.')];
  if (prod.modelo === 'institucion') {
    if (!RAMAS_INSTITUCION.includes(pr.ramaInstitucion)) e.push(E('ramaInstitucion', 'La rama de la institución educativa es obligatoria.'));
    if (!TIPOS_INSTITUCION.includes(pr.tipoInstitucion)) e.push(E('tipoInstitucion', 'El tipo de institución educativa es obligatorio.'));
  }
  if (prod.viajero) {
    if (!has(pr.origenViaje)) e.push(E('origenViaje', 'El origen del viaje es obligatorio (AP Viajero).'));
    if (!has(pr.destinoViaje)) e.push(E('destinoViaje', 'El destino del viaje es obligatorio (AP Viajero).'));
  }
  const planes = sol.planes || [];
  if (!planes.length) return [...e, E('planes', 'Debe registrar al menos un plan.')];
  if (prod.modelo === 'individual' && planes.length > 1) e.push(E('planes', 'Los productos individuales tienen un único plan (supuesto S-03).'));
  planes.forEach((pl, pi) => {
    const k = f => `planes.${pi}.${f}`;
    if (!has(pl.nombre)) e.push(E(k('nombre'), 'El nombre del plan es obligatorio.'));
    if (prod.modelo !== 'individual') {
      if (sol.generales?.estructura !== 'Nominada' && (!Number.isInteger(num(pl.nAsegurados)) || !(num(pl.nAsegurados) > 0))) e.push(E(k('nAsegurados'), 'El número de asegurados del plan es obligatorio.'));
    }
    if (isNum(pl.primaPorAsegurado) && num(pl.primaPorAsegurado) > LIMITE_TECNICO) e.push(E(k('primaPorAsegurado'), `La prima excede el límite técnico de la demo (${LIMITE_TECNICO.toLocaleString('es-CO')}).`)); else if (!isNum(pl.primaPorAsegurado) || !(num(pl.primaPorAsegurado) > 0)) e.push(E(k('primaPorAsegurado'), prod.modelo === 'individual' ? 'La prima del plan es obligatoria.' : 'La prima por asegurado es obligatoria.'));
    const amps = pl.amparos || [];
    if (!amps.length) e.push(E(k('amparos'), 'El plan requiere al menos un amparo.'));
    else if (!amps.some(a => a.tipoAmparo === 'Básico')) e.push(E(k('amparos'), 'El plan requiere al menos un amparo Básico: es obligatorio para emitir el plan (HU647).'));
    const vistos = new Set();
    amps.forEach((a, ai) => {
      validarAmparo(a, ai, prod.id, pl).forEach(x => e.push(E(`planes.${pi}.${x.campo}`, x.mensaje)));
      if (vistos.has(a.cod)) e.push(E(`planes.${pi}.amparos.${ai}.cod`, 'El amparo está repetido en el plan.')); vistos.add(a.cod);
    });
  });
  return e;
}

/** Rango de edad de ingreso exigido a un asegurado según los amparos básicos de su plan (HU647). */
export function rangoEdadPlan(plan) {
  const b = (plan?.amparos || []).filter(a => a.tipoAmparo === 'Básico');
  if (!b.length) return null;
  return { min: Math.max(...b.map(a => num(a.edadMinIngreso) ?? 0)), max: Math.min(...b.map(a => num(a.edadMaxIngreso) ?? 120)) };
}

export function validarAsegurado(a, i, { fechaRef, plan, soloMax = false, reqDian = false } = {}) {
  const e = [], k = f => `asegurados.${i}.${f}`;
  if (!TIPOS_DOC.includes(a.tipoDoc)) e.push(E(k('tipoDoc'), 'Tipo de documento del asegurado inválido.'));
  if (!has(a.numDoc)) e.push(E(k('numDoc'), 'El número de documento del asegurado es obligatorio.'));
  if (!has(a.primerNombre)) e.push(E(k('primerNombre'), 'El primer nombre del asegurado es obligatorio.'));
  if (!has(a.primerApellido)) e.push(E(k('primerApellido'), 'El primer apellido del asegurado es obligatorio.'));
  if (!isYmd(a.fechaNacimiento)) e.push(E(k('fechaNacimiento'), 'La fecha de nacimiento del asegurado es obligatoria.'));
  if (!has(a.planId)) e.push(E(k('planId'), 'Asigne el asegurado a un plan.'));
  if (isYmd(a.fechaNacimiento) && fechaRef && plan) {
    const r = rangoEdadPlan(plan), ed = edadA(a.fechaNacimiento, fechaRef);
    if (r && ed > r.max) e.push(E(k('fechaNacimiento'), `Edad de ${ed} años por encima de la edad máxima de ingreso (${r.max}) del amparo básico.`));
    if (r && !soloMax && ed < r.min) e.push({ ...E(k('fechaNacimiento'), `Edad de ${ed} años inferior a la edad mínima de ingreso (${r.min}).`), tipo: 'POLITICA_P03', edad: ed });
  }
  if (reqDian) for (const m of camposDianFaltantes(a)) e.push(E(k(m.campo), `Falta ${m.nombre} (obligatorio para la factura electrónica DIAN).`));
  return e;
}

/** [HU577] Campos exigidos por la DIAN para la factura individual por asegurado. */
export function camposDianFaltantes(a) {
  const req = [['tipoDoc', 'tipo de documento'], ['numDoc', 'número de documento'], ['primerNombre', 'nombre'], ['direccion', 'dirección fiscal de notificación'],
    ['ciudad', 'ciudad'], ['departamento', 'departamento'], ['correo', 'correo electrónico de contacto'], ['telefono', 'teléfono']];
  return req.filter(([c]) => !has(a[c])).map(([campo, nombre]) => ({ campo, nombre }));
}

export function validarSiniestralidad(s, g) {
  const e = [];
  if (!s || typeof s.tuvoReclamaciones !== 'boolean') return [E('tuvoReclamaciones', 'Responda si ha tenido reclamaciones de seguros en los últimos 5 años.')];
  const reg = (arr, sec) => arr.forEach((r, i) => {
    const k = f => `${sec}.${i}.${f}`;
    if (!isYmd(r.inicio)) e.push(E(k('inicio'), 'El inicio de vigencia del siniestro es obligatorio.'));
    if (!isYmd(r.fin)) e.push(E(k('fin'), 'El fin de vigencia del siniestro es obligatorio.'));
    if (isYmd(r.inicio) && isYmd(r.fin) && r.fin < r.inicio) e.push(E(k('fin'), 'El fin de vigencia no puede ser anterior al inicio.'));
    if (!isNum(r.cantidad) || !(num(r.cantidad) > 0)) e.push(E(k('cantidad'), 'La cantidad de siniestros es obligatoria.'));
    if (!has(r.amparo)) e.push(E(k('amparo'), 'El amparo afectado es obligatorio.'));
    if (!isNum(r.valor) || num(r.valor) < 0) e.push(E(k('valor'), 'El valor de la reclamación es obligatorio.'));
    if (has(r.adjunto) && !/\.(xlsx?|csv)$/i.test(r.adjunto)) e.push(E(k('adjunto'), 'El archivo adjunto debe ser tipo Excel (HU195).'));
  });
  if (s.tuvoReclamaciones) {
    if (!(s.vida || []).length) e.push(E('vida', 'Con reclamaciones en los últimos 5 años debe registrar al menos un siniestro de vida.'));
    reg(s.vida || [], 'vida');
  }
  if ((s.arl || []).length && !g?.afiliadoARL) e.push(E('arl', 'La siniestralidad de riesgos laborales solo aplica si el cliente está afiliado a ARL Positiva.'));
  else reg(s.arl || [], 'arl');
  return e;
}

export function validarCostos(c = {}, g, params) {
  const e = [];
  const pct = (campo, nombre, req) => {
    if (!isNum(c[campo])) { if (req) e.push(E(campo, `${nombre} es obligatorio.`)); return; }
    if (num(c[campo]) < 0 || num(c[campo]) > 100) e.push(E(campo, `${nombre} debe estar entre 0 y 100.`));
  };
  pct('gastosAdmin', 'Gastos de administración (nota técnica)', true);
  pct('gastosReaseguro', 'Gastos de reaseguro', false);
  pct('comision', 'Comisión', !!g?.intermediada);
  pct('gastosComerciales', 'Gastos comerciales', false);
  pct('utilidad', 'Utilidad', true);
  pct('otrosGastos', 'Otros gastos', false);
  if (g?.requiereRetorno) {
    if (!['Porcentaje sobre primas recaudadas', 'Valor unitario de retorno por asegurado'].includes(c.tipoRetorno)) e.push(E('tipoRetorno', 'Seleccione el tipo de retorno.'));
    if (!isNum(c.valorRetorno) || num(c.valorRetorno) < 0) e.push(E('valorRetorno', 'El valor del retorno es obligatorio.'));
    else if (c.tipoRetorno === 'Porcentaje sobre primas recaudadas' && num(c.valorRetorno) > 100) e.push(E('valorRetorno', 'El % de retorno debe estar entre 0 y 100.'));
  }
  return e;
}

/** % siniestralidad = Subtotal (HU207). SUPUESTO S-04: los IVA se aplican sobre comisión/retorno (no se suman como puntos porcentuales). */
export function subtotalCostos(c = {}, g, params) {
  const n = k => num(c[k]) || 0;
  const iva = P(params, 'ivaComision') / 100, ivaR = P(params, 'ivaRetorno') / 100;
  const retPct = g?.requiereRetorno && c.tipoRetorno === 'Porcentaje sobre primas recaudadas' ? n('valorRetorno') : 0;
  return money(n('gastosAdmin') + n('gastosReaseguro') + n('comision') * (1 + iva) + retPct * (1 + ivaR) + n('gastosComerciales') + n('utilidad') + n('otrosGastos'));
}

/* ───────────────────────── Políticas de suscripción (HU207 + código existente) ───────────────────────── */
export function evaluarPoliticas(sol, params, hoy) {
  const out = [], g = sol.generales || {}, c = sol.costos || {};
  const calc = calcSolicitud(sol, params);
  const add = (id, variable, valor, rango, nivel, extra = {}) => out.push({ id, nombre: POLITICAS.find(p => p.id === id).nombre, variable, valor, rango, nivelRequerido: nivel, ...extra });
  if (!sol.sarlaft?.completo) add('P01', 'Formulario SARLAFT', 'Incompleto', 'Completo', 'Oficial Cumplimiento');
  if (isYmd(g.vigenciaDesde)) {
    const retro = diffDays(g.vigenciaDesde, hoy);
    if (retro > P(params, 'retroMaxBasico')) add('P02', 'Días de retroactividad', retro, `0 a ${P(params, 'retroMaxBasico')} días (Básico); más exige ${P(params, 'nivelRetroSuperior')}`, P(params, 'nivelRetroSuperior'));
  }
  const edadesBajas = (sol.asegurados || []).map((a, i) => {
    const plan = (sol.planes || []).find(p => p.id === a.planId); const r = rangoEdadPlan(plan);
    if (!r || !isYmd(a.fechaNacimiento) || !isYmd(g.vigenciaDesde)) return null;
    const ed = edadA(a.fechaNacimiento, g.vigenciaDesde); return ed < r.min ? { a, ed, min: r.min } : null;
  }).filter(Boolean);
  if (edadesBajas.length) add('P03', 'Edad del asegurado', `${edadesBajas.length} asegurado(s): ${edadesBajas.map(x => `${x.a.numDoc} (${x.ed})`).join(', ')}`, `≥ edad mínima de ingreso del amparo básico`, P(params, 'nivelOtras'));
  if (calc.primaTotal > 0 && calc.primaTotal < P(params, 'primaMinima')) add('P04', 'Prima total de la póliza', calc.primaTotal, `≥ ${P(params, 'primaMinima')}`, P(params, 'nivelOtras'));
  const com = num(c.comision) || 0, ret = g.requiereRetorno && c.tipoRetorno === 'Porcentaje sobre primas recaudadas' ? (num(c.valorRetorno) || 0) : 0;
  if (com > P(params, 'comisionMax')) add('P05', '% de comisión', com, `≤ ${P(params, 'comisionMax')} %`, P(params, 'nivelComisionExcede'));
  if (ret > P(params, 'retornoMax')) add('P06', '% de retorno', ret, `≤ ${P(params, 'retornoMax')} %`, P(params, 'nivelOtras'));
  if (com + ret > P(params, 'comisionRetornoMax')) add('P07', '% comisión + % retorno', money(com + ret), `≤ ${P(params, 'comisionRetornoMax')} %`, P(params, 'nivelOtras'));
  if (calc.vaMaxPorPersona > P(params, 'vaMaxPorPersona')) add('P08', 'Valor asegurado por persona', calc.vaMaxPorPersona, `≤ ${P(params, 'vaMaxPorPersona')}`, P(params, 'nivelOtras'));
  return out;
}

/** El usuario autoriza si su nivel iguala o supera el requerido ([COD] "nivel más exigente… basta un usuario de ese nivel o superior"). */
export function puedeAutorizar(nivelUsuario, requerido) {
  if (requerido === 'Oficial Cumplimiento') return nivelUsuario === 'Oficial Cumplimiento';
  return rankNivel(nivelUsuario) >= rankNivel(requerido) && nivelUsuario !== 'Consulta';
}

/* ───────────────────────── Períodos y prorrata de facturación (HU577 / HU675) ───────────────────────── */
export function generarPeriodos(desde, hasta, periodicidad, desdeIdx = 0) {
  const step = PERIODICIDADES[periodicidad]; const out = []; let ini = desde, i = desdeIdx;
  while (ini < hasta) { const fin = addMonths(ini, step) < hasta ? addMonths(ini, step) : hasta; out.push({ idx: i++, inicio: ini, fin, estado: 'PENDIENTE' }); ini = fin; }
  return out;
}
/** Prima de cada período = prima de vigencia / n períodos (fracción de periodicidad; el último absorbe el redondeo). Decisión D-01 (conflicto ÷365 vs fracción). */
export function primasPorPeriodo(primaVigencia, periodos) {
  const n = periodos.length; const base = money(primaVigencia / n); const r = periodos.map(() => base);
  if (n) r[n - 1] = money(primaVigencia - base * (n - 1)); return r;
}
/** Prorrata dentro de un período: prima diaria del período × días. Días medidos [inicio, fin) (convención exclusiva). Decisión D-02. */
export function prorrata(primaPeriodo, periodo, desdeFecha, hastaFecha = null) {
  const ini = desdeFecha > periodo.inicio ? desdeFecha : periodo.inicio;
  const fin = hastaFecha && hastaFecha < periodo.fin ? hastaFecha : periodo.fin;
  const dias = Math.max(0, diffDays(ini, fin)); const total = diffDays(periodo.inicio, periodo.fin);
  if (dias >= total) return { valor: primaPeriodo, dias: total, total, completo: true };
  return { valor: money(primaPeriodo * dias / total), dias, total, completo: false };
}

/* ───────────────────────── Periodicidad (HU675) ───────────────────────── */
export function validarCambioPeriodicidad(poliza, nueva) {
  const actual = poliza.facturacion.periodicidad;
  if (!PERIODICIDADES[nueva]) return 'La periodicidad de facturación debe ser Anual, Semestral, Trimestral o Mensual.';
  if (nueva === actual) return 'La póliza ya tiene esa periodicidad de facturación.';
  const facturados = poliza.facturacion.cronograma.filter(p => p.estado === 'FACTURADO');
  if (!facturados.length) return null;                                    // sin facturar: cualquier cambio es válido
  if (actual === 'Anual') return 'La póliza ya fue facturada con periodicidad Anual: no se puede modificar en la vigencia en curso.';
  if (actual === 'Mensual') return nueva === 'Anual' ? null : 'Con facturación mensual ya iniciada solo se permite cambiar a periodicidad Anual (se facturará el saldo restante).';
  if (actual === 'Trimestral') return ['Semestral', 'Mensual'].includes(nueva) ? null : 'Con facturación trimestral ya iniciada solo se permite cambiar a Semestral o Mensual (HU675).';
  if (actual === 'Semestral') return null; // HU675 no define el caso → se permite y se registra como brecha G-12
  return null;
}
